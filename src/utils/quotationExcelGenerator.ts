/**
 * Quotations in the client's own two formats, as real .xlsx files.
 *
 *   TRADING — letterhead, TO / REF / DATE block, and a table with a PRODUCT
 *             IMAGE column (reference: the "MA/TSR-…" trading sheet).
 *   BAGS    — letterhead, REF / Date, To, Sub:, a table with "No. of Bags/KG",
 *             Sub Total / GST / Grand Total, terms and sign-off (reference:
 *             "maxtron quot new 1.docx").
 *
 * Totals are written as live Excel formulas (with cached results), so the
 * downloaded sheet can still be edited by hand — which is why the client asked
 * for Excel in the first place.
 *
 * buildQuotationWorkbook() is pure (no DOM), so it can be run from Node to
 * check the layout; exportQuotationToExcel() is the browser wrapper.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export type QuotationType = 'TRADING' | 'BAGS';

export interface QuoteImage {
    dataUrl: string;
    width: number;
    height: number;
}

export interface QuotationAssets {
    logo?: QuoteImage;
    name?: QuoteImage;
    /** One entry per quotation item, same order; undefined where no image. */
    itemImages?: (QuoteImage | undefined)[];
}

const COMPANY = 'MAXTRON ASSOCIATES';
const EMAIL_LINE = 'Email: marketing.maxtronassociates@gmail.com, Web: maxtronassociates.com, GST:32AUYPV8850B1Z2';
// Each format carries the address line exactly as its reference prints it.
const ADDRESS_TRADING = '13/95&96,PIRIVUSALA,CHANDRANAGAR,PALAKKAD-678009, PH:87148 23444';
const ADDRESS_BAGS = '13/95,13/96 PIRIVUSALA, CHANDRANAGAR, PALAKKAD KERALA ,678007, PHONE:87148-23444';

const TERMS = [
    'Delivery: Within 4 days against order.',
    'Payment: 30 days from the date of supply by NEFT to our bank account.',
    'Quote Validity: 15 days.',
    'Taxes: GST extra as applicable at the time of billing.',
];

// The Word original's page footer (bags format only).
const FOOTER_LABEL = 'Manufacturing Unit:  ';
const FOOTER_LINES = ['Maxtron Associates, Kottamangalam, Erattakulam – Nallepilly Road,', 'Nallepilly, Palakkad, Kerala.'];

const FONT = 'Calibri';
const RULE_BLUE: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF4472C4' } };
const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
const MEDIUM: Partial<ExcelJS.Border> = { style: 'medium', color: { argb: 'FF000000' } };
const EMU_PER_PX = 9525;
// Excel's own conversions for the default font: column width in characters and
// row height in points, to pixels. Needed to centre a picture inside a cell.
const colPx = (chars: number) => Math.round(chars * 7 + 5);
const rowPx = (points: number) => Math.round((points * 96) / 72);

const num = (v: unknown) => Number(v) || 0;
const pad2 = (n: number) => String(n).padStart(2, '0');
const quoteDate = (record: any) => new Date(record.visit_date || Date.now());

const itemsOf = (record: any): any[] => (Array.isArray(record.quotation_items) ? record.quotation_items : []);
const customerName = (record: any) => String(record.customer_name || record.customers?.customer_name || '').trim();
/** "Vaniyamkulam, Kerala" -> ["Vaniyamkulam", "Kerala"] */
const locationParts = (record: any) =>
    String(record.location || '').split(',').map(s => s.trim()).filter(Boolean);

/** The one GST rate shared by every item, or null when rates differ. Reference sheets quote 18%. */
const uniformGst = (items: any[]): number | null => {
    const rates = [...new Set(items.map(i => num(i.gst_percent)))];
    if (rates.length === 0) return 18;
    return rates.length === 1 ? rates[0] : null;
};

/** Borders on every cell of a range — a merged cell only draws the sides its own cells carry. */
const box = (ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number, border: Partial<ExcelJS.Border> = THIN) => {
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            ws.getCell(r, c).border = { top: border, left: border, bottom: border, right: border };
        }
    }
};

/** Heavier frame around the whole document, keeping the inner grid lines. */
const frame = (ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number) => {
    for (let r = r1; r <= r2; r++) {
        for (let c = c1; c <= c2; c++) {
            const cell = ws.getCell(r, c);
            const b = { ...(cell.border || {}) };
            if (r === r1) b.top = MEDIUM;
            if (r === r2) b.bottom = MEDIUM;
            if (c === c1) b.left = MEDIUM;
            if (c === c2) b.right = MEDIUM;
            cell.border = b;
        }
    }
};

const put = (
    ws: ExcelJS.Worksheet, r: number, c: number, value: ExcelJS.CellValue,
    opts: { bold?: boolean; size?: number; h?: ExcelJS.Alignment['horizontal']; v?: ExcelJS.Alignment['vertical']; wrap?: boolean; fmt?: string; font?: string; shrink?: boolean } = {}
) => {
    const cell = ws.getCell(r, c);
    cell.value = value;
    cell.font = { name: opts.font || FONT, size: opts.size || 11, bold: !!opts.bold };
    cell.alignment = { horizontal: opts.h || 'left', vertical: opts.v || 'middle', wrapText: !!opts.wrap, shrinkToFit: !!opts.shrink };
    if (opts.fmt) cell.numFmt = opts.fmt;
    return cell;
};

/**
 * Place a picture scaled to fit, and centred in, the block of cells
 * [col1..col2] x [row1..row2] (1-based, inclusive). Offsets are given in EMU
 * directly: exceljs' fractional col/row anchors assume default cell sizes and
 * land in the wrong place on resized columns.
 */
const placeImage = (
    wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet, img: QuoteImage | undefined,
    col1: number, row1: number, col2: number, row2: number, padding = 6
) => {
    if (!img?.dataUrl || !img.width || !img.height) return;
    let boxW = 0;
    for (let c = col1; c <= col2; c++) boxW += colPx(ws.getColumn(c).width || 8.43);
    let boxH = 0;
    for (let r = row1; r <= row2; r++) boxH += rowPx(ws.getRow(r).height || 15);

    const scale = Math.min((boxW - padding * 2) / img.width, (boxH - padding * 2) / img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    // Walk the offset across cells so the anchor cell is the one the offset falls in.
    let offX = Math.round((boxW - w) / 2);
    let col = col1;
    while (col < col2 && offX >= colPx(ws.getColumn(col).width || 8.43)) { offX -= colPx(ws.getColumn(col).width || 8.43); col++; }
    let offY = Math.round((boxH - h) / 2);
    let row = row1;
    while (row < row2 && offY >= rowPx(ws.getRow(row).height || 15)) { offY -= rowPx(ws.getRow(row).height || 15); row++; }

    const extension = /^data:image\/png/i.test(img.dataUrl) ? 'png' : 'jpeg';
    const id = wb.addImage({ base64: img.dataUrl, extension });
    ws.addImage(id, {
        tl: { nativeCol: col - 1, nativeColOff: offX * EMU_PER_PX, nativeRow: row - 1, nativeRowOff: offY * EMU_PER_PX } as any,
        ext: { width: w, height: h },
        editAs: 'oneCell',
    });
};

const pageSetup = (ws: ExcelJS.Worksheet) => {
    // Load-bearing: with no <sheetView> in the file, Excel on a scaled display
    // reads every row at 96/DPI of its height (two-thirds at 150%), while
    // pictures and columns keep their size — so the letterhead and product
    // images spill over the text. Measured, not assumed; the check guards it.
    ws.views = [{ state: 'normal' }];
    ws.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
        margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    };
};

// ── TRADING ──────────────────────────────────────────────────────────────────
// Columns: A SL.NO | B PRODUCT DESCRIPTION | C PRODUCT IMAGE | D RATE | E GST | F QTY | G TOTAL AMT INCL. GST
const buildTrading = (wb: ExcelJS.Workbook, record: any, assets: QuotationAssets) => {
    const ws = wb.addWorksheet('Quotation');
    pageSetup(ws);
    // Not exactly 9: exceljs treats 9 as "default width" and leaves the column out of the file.
    [9.5, 34, 34, 12, 13, 9.5, 26].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const items = itemsOf(record);
    const gst = uniformGst(items);

    // Letterhead (rows 1-4): logo on the left, name banner, address, contact line.
    [36, 36, 18, 18].forEach((h, i) => { ws.getRow(i + 1).height = h; });
    placeImage(wb, ws, assets.logo, 1, 1, 2, 4, 4);
    if (assets.name) placeImage(wb, ws, assets.name, 3, 1, 7, 2, 4);
    else { ws.mergeCells(1, 3, 2, 7); put(ws, 1, 3, COMPANY, { bold: true, size: 26, h: 'center' }); }
    ws.mergeCells(3, 3, 3, 7);
    put(ws, 3, 3, ADDRESS_TRADING, { h: 'center', font: 'Cambria' });
    ws.mergeCells(4, 3, 4, 7);
    put(ws, 4, 3, EMAIL_LINE, { h: 'center', font: 'Cambria', shrink: true });

    // TO (left) / QUOTATION REF and DATE (right): rows 5-8.
    [20, 20, 20, 20].forEach((h, i) => { ws.getRow(i + 5).height = h; });
    const d = quoteDate(record);
    const toLines = ['TO,', 'PURCHASE DEPARTMENT,', `${customerName(record).toUpperCase()},`, locationParts(record).join(', ').toUpperCase()]
        .filter(l => l && l !== ',');
    ws.mergeCells(5, 1, 8, 3);
    put(ws, 5, 1, toLines.join('\n'), { bold: true, size: 12, v: 'top', wrap: true });
    ws.mergeCells(5, 4, 6, 7);
    put(ws, 5, 4, `QUOTATION REF:${record.quotation_ref || ''}`, { bold: true, size: 12, h: 'center' });
    ws.mergeCells(7, 4, 8, 7);
    put(ws, 7, 4, `DATE:${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`, { bold: true, size: 12, h: 'center' });
    box(ws, 5, 1, 8, 7);

    // Table header (row 9). The reference says RATE/kg; follow the items' unit when it isn't Kg.
    const units = [...new Set(items.map(i => String(i.unit || 'Kg').toLowerCase()))];
    const rateHead = units.length === 1 ? `RATE/${units[0]}` : 'RATE';
    const headers = ['SL.NO', 'PRODUCT DESCRIPTION', 'PRODUCT IMAGE', rateHead, gst === null ? 'GST' : `GST(${gst}%)`, 'QTY', 'TOTAL AMT INCL. GST'];
    ws.getRow(9).height = 20;
    headers.forEach((hd, i) => put(ws, 9, i + 1, hd, { bold: true, size: 12, h: 'center' }));
    box(ws, 9, 1, 9, 7);

    // Item rows — tall, to hold the picture. The reference sheet shows four slots.
    const first = 10;
    const slots = Math.max(items.length, 4);
    for (let i = 0; i < slots; i++) {
        const r = first + i;
        ws.getRow(r).height = 150;
        const it = items[i];
        if (it) {
            const rate = num(it.amount);
            const qty = num(it.quantity);
            const p = num(it.gst_percent);
            const gstPerUnit = (rate * p) / 100;
            put(ws, r, 1, i + 1, { h: 'center' });
            put(ws, r, 2, String(it.product_name || '').toUpperCase(), { bold: true, h: 'center', wrap: true });
            put(ws, r, 4, rate || null, { bold: true, h: 'center', fmt: '0.00' });
            put(ws, r, 5, { formula: `D${r}*${p}/100`, result: gstPerUnit }, { bold: true, h: 'center', fmt: '0.00' });
            put(ws, r, 6, qty || null, { bold: true, h: 'center' });
            put(ws, r, 7, { formula: `ROUND((D${r}+E${r})*F${r},0)`, result: Math.round((rate + gstPerUnit) * qty) }, { bold: true, h: 'center', fmt: '0.00' });
            placeImage(wb, ws, assets.itemImages?.[i], 3, r, 3, r);
        }
    }
    box(ws, first, 1, first + slots - 1, 7);

    // Terms & Conditions — the trading sheet carries the first three.
    let r = first + slots;
    ws.getRow(r).height = 15;
    r++;
    put(ws, r, 2, 'Terms & Conditions:', { bold: true });
    TERMS.slice(0, 3).forEach((t, i) => {
        ws.mergeCells(r + 1 + i, 2, r + 1 + i, 7);
        put(ws, r + 1 + i, 2, `${i + 1}. ${t}`);
    });
    const last = r + 3 + 2; // two spare lines under the terms, as on the reference
    frame(ws, 1, 1, last, 7);
    ws.pageSetup.printArea = `A1:G${last}`;
};

// ── BAGS ─────────────────────────────────────────────────────────────────────
// Columns: A Sl. No | B Description | C Rate/KG | D No. of Bags/KG | E Qty In KG | F Total
const buildBags = (wb: ExcelJS.Workbook, record: any, assets: QuotationAssets) => {
    const ws = wb.addWorksheet('Quotation');
    pageSetup(ws);
    [8, 28, 16, 22, 14, 12].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const items = itemsOf(record);
    const gst = uniformGst(items);

    // Letterhead (rows 1-4): logo down the left; name banner, address and
    // contact line beside it. No rule underneath, as on the reference.
    [30, 30, 16, 16].forEach((h, i) => { ws.getRow(i + 1).height = h; });
    placeImage(wb, ws, assets.logo, 1, 1, 2, 4, 2);
    if (assets.name) placeImage(wb, ws, assets.name, 3, 1, 6, 2, 4);
    else { ws.mergeCells(1, 3, 2, 6); put(ws, 1, 3, COMPANY, { bold: true, size: 24, h: 'center' }); }
    ws.mergeCells(3, 3, 3, 6);
    put(ws, 3, 3, ADDRESS_BAGS, { h: 'center', size: 8, shrink: true });
    ws.mergeCells(4, 3, 4, 6);
    put(ws, 4, 3, EMAIL_LINE.replace(/, /g, '  '), { h: 'center', size: 8, shrink: true });

    // REF (left) and Date (right).
    const d = quoteDate(record);
    ws.mergeCells(6, 1, 6, 4);
    put(ws, 6, 1, `REF: ${record.quotation_ref || ''}`, { bold: true, size: 12 });
    ws.mergeCells(6, 5, 6, 6);
    put(ws, 6, 5, `Date: ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`, { bold: true, size: 12, h: 'right' });

    // To block: one line per part, comma after each and a full stop on the last.
    let r = 8;
    const to = ['Purchase Department', customerName(record).toUpperCase(), ...locationParts(record)].filter(Boolean);
    put(ws, r++, 1, 'To');
    to.forEach((line, i) => {
        ws.mergeCells(r, 1, r, 6);
        put(ws, r++, 1, `${line}${i === to.length - 1 ? '.' : ','}`);
    });

    r++;
    ws.mergeCells(r, 1, r, 6);
    ws.getRow(r).height = 30;
    put(ws, r, 1, `Sub: ${record.quotation_subject || 'Quotation for the Supply of Poly Bags – Reg.'}`, { bold: true, wrap: true });
    r += 2;

    // Table.
    const head = r;
    ws.getRow(head).height = 30;
    ['Sl. No', 'Description', 'Rate/KG', 'No. of Bags/KG', 'Qty In KG', 'Total'].forEach((hd, i) =>
        put(ws, head, i + 1, hd, { bold: true, h: 'center', wrap: true }));

    const first = head + 1;
    items.forEach((it, i) => {
        const row = first + i;
        const rate = num(it.amount);
        const qty = num(it.quantity);
        ws.getRow(row).height = 20;
        put(ws, row, 1, i + 1, { h: 'center' });
        put(ws, row, 2, String(it.product_name || '').toUpperCase(), { h: 'center', wrap: true });
        put(ws, row, 3, rate || null, { h: 'center' });
        put(ws, row, 4, it.bags_per_kg ? String(it.bags_per_kg) : null, { h: 'center' });
        put(ws, row, 5, qty || null, { h: 'center' });
        put(ws, row, 6, { formula: `C${row}*E${row}`, result: rate * qty }, { h: 'right' });
    });
    const lastItem = first + Math.max(items.length, 1) - 1;
    box(ws, head, 1, lastItem + 1, 6); // the item grid, with one blank ruled row under it

    // Sub Total / GST / Grand Total: boxed on the right only — the label across
    // "No. of Bags/KG" + "Qty In KG", the amount under "Total".
    const subRow = lastItem + 2;
    const gstRow = subRow + 1;
    const grandRow = subRow + 2;
    const subTotal = items.reduce((s, it) => s + num(it.amount) * num(it.quantity), 0);
    const gstAmount = items.reduce((s, it) => s + (num(it.amount) * num(it.quantity) * num(it.gst_percent)) / 100, 0);
    const totalLine = (row: number, label: string, value: ExcelJS.CellValue) => {
        ws.mergeCells(row, 4, row, 5);
        put(ws, row, 4, label, { bold: true, h: 'center' });
        put(ws, row, 6, value, { bold: true, h: 'right' });
    };
    totalLine(subRow, 'Sub Total', { formula: `SUM(F${first}:F${lastItem})`, result: subTotal });
    // Mixed rates cannot be one formula; a single rate stays live.
    totalLine(gstRow, gst === null ? 'GST' : `GST ${gst}%`, gst === null ? gstAmount : { formula: `F${subRow}*${gst}/100`, result: gstAmount });
    totalLine(grandRow, 'Grand Total', { formula: `F${subRow}+F${gstRow}`, result: subTotal + gstAmount });
    box(ws, subRow, 4, grandRow, 6);

    // Terms, indented one column as on the reference.
    r = grandRow + 1;
    put(ws, r++, 2, 'Terms & Conditions:', { bold: true });
    TERMS.forEach((t, i) => {
        ws.mergeCells(r, 2, r, 6);
        put(ws, r++, 2, `${i + 1}. ${t}`);
    });

    // Sign-off: the executive who raised the quotation, with their phone.
    r++;
    put(ws, r++, 1, 'Thanks & Best Regards,');
    r++;
    put(ws, r++, 1, `For ${COMPANY}`);
    r++;
    const executive = record.users || {};
    [executive.name || record.employee_name, executive.phone].filter(Boolean)
        .forEach(line => { ws.mergeCells(r, 1, r, 3); put(ws, r++, 1, String(line)); });

    // Footer: blue rule, then the manufacturing unit address, centred.
    r += 2;
    ws.mergeCells(r, 1, r, 6);
    for (let c = 1; c <= 6; c++) ws.getCell(r, c).border = { top: RULE_BLUE };
    const foot = ws.getCell(r, 1);
    foot.value = { richText: [
        { font: { name: FONT, size: 9, bold: true }, text: FOOTER_LABEL },
        { font: { name: FONT, size: 9 }, text: FOOTER_LINES[0] },
    ] };
    foot.alignment = { horizontal: 'center', vertical: 'middle' };
    r++;
    ws.mergeCells(r, 1, r, 6);
    put(ws, r, 1, FOOTER_LINES[1], { size: 9, h: 'center' });
    ws.pageSetup.printArea = `A1:F${r}`;
};

/** A blank quotation line as the form holds it (numbers stay text until save). */
export const emptyQuotationItem = () => ({
    product_id: '', product_name: '', quantity: '', unit: 'Kg', amount: '', gst_percent: '0',
    bags_per_kg: '', // BAGS format: "No. of Bags/KG", free text such as "45 TO 50"
    image: '',       // TRADING format: product picture, a small JPEG data URL
});

export const quotationTypeOf = (record: any): QuotationType =>
    String(record?.quotation_type || '').toUpperCase() === 'TRADING' ? 'TRADING' : 'BAGS';

export function buildQuotationWorkbook(record: any, assets: QuotationAssets = {}): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    wb.creator = COMPANY;
    wb.created = new Date();
    if (quotationTypeOf(record) === 'TRADING') buildTrading(wb, record, assets);
    else buildBags(wb, record, assets);
    return wb;
}

export const quotationFileName = (record: any) => {
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    const ref = safe(String(record.quotation_ref || '')) || 'Quotation';
    const cust = safe(customerName(record)) || 'Customer';
    return `${ref}_${cust}.xlsx`;
};

// ── Browser side ─────────────────────────────────────────────────────────────

const measure = (dataUrl: string): Promise<QuoteImage | undefined> =>
    new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(undefined); // a broken picture must not stop the quotation
        img.src = dataUrl;
    });

const loadAsset = async (url: string): Promise<QuoteImage | undefined> => {
    try {
        const blob = await (await fetch(url)).blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        return await measure(dataUrl);
    } catch {
        return undefined; // letterhead falls back to text
    }
};

/**
 * Shrink a picked image before it is stored on the quotation line.
 * ponytail: pictures live as data URLs inside the visit's quotation_items JSON,
 * so every one is capped at 400px JPEG (~20-40 KB). Move them to file storage
 * if quotations ever carry enough pictures to slow the visit list down.
 */
export const resizeImageFile = (file: File, maxSide = 400): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.naturalWidth * scale);
                canvas.height = Math.round(img.naturalHeight * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas not available'));
                ctx.fillStyle = '#ffffff'; // JPEG has no transparency
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
    });

export async function exportQuotationToExcel(record: any) {
    const [logo, name, itemImages] = await Promise.all([
        loadAsset('/quotation/logo.jpeg'),
        loadAsset('/quotation/name.jpeg'),
        Promise.all(itemsOf(record).map(it => (it?.image ? measure(String(it.image)) : Promise.resolve(undefined)))),
    ]);
    const wb = buildQuotationWorkbook(record, { logo, name, itemImages });
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        quotationFileName(record)
    );
}
