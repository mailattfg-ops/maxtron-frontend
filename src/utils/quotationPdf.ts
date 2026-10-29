/**
 * Quotations as PDF, laid out like the client's Word quotations, so they look
 * the same on a phone as on a computer (Excel did not: fonts and alignment
 * shifted from viewer to viewer).
 *
 *   letterhead (logo, name banner, address, e-mail line, rule)
 *   BAGS:    REF / Date, To block, Sub:, items, Sub Total / GST / Grand Total, four terms
 *   TRADING: TO block | QUOTATION REF / DATE box, items with product photos, three terms
 *   Thanks & Best Regards, / For MAXTRON ASSOCIATES / the executive
 *   page footer: Manufacturing Unit address
 *
 * Pure: buildQuotationPdf takes the pictures already loaded, so it runs in Node
 * for the self-check; exportQuotationToPdf loads them in the browser and saves.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    itemsOf, customerName, locationParts, uniformGst, quoteDate, num, pad2, quotationFileName,
    quotationTypeOf, loadAsset, measure, itemDescription, tradingLineTotal, tradingGrandTotal, type QuoteImage,
} from './quotationExcelGenerator';

const ADDRESS = '13/95,13/96 PIRIVUSALA, CHANDRANAGAR, PALAKKAD KERALA ,678007, PHONE:87148-23444';
const EMAIL = 'Email: marketing.maxtronassociates@gmail.com    Web: maxtronassociates.com   GST:32AUYPV8850B1Z2';
const TERMS = [
    'Delivery: Within 4 days against order.',
    'Payment: 30 days from the date of supply by NEFT to our bank account.',
    'Quote Validity: 15 days.',
    'Taxes: GST extra as applicable at the time of billing.',
];
const FOOTER = ['Maxtron Associates, Kottamangalam, Erattakulam - Nallepilly Road,', 'Nallepilly, Palakkad, Kerala.'];

const PAGE_W = 210;
const PAGE_H = 297;
const LEFT = 20;
const RIGHT = 196;
const FOOTER_Y = 278;
/** Content must end above this, or move to the next page. */
const BOTTOM = 266;

/** 2625 stays "2625", 1417.5 stays "1417.5", as the bags quotation prints them. */
const plain = (n: number) => String(Math.round(n * 100) / 100);
const money = (n: number) => n.toFixed(2);
/** The PDF's built-in fonts have no long dashes or curly quotes; print their plain forms. */
const pdfText = (s: string) => s.replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
const imageType = (dataUrl: string) => (/^data:image\/png/i.test(dataUrl) ? 'PNG' : 'JPEG');

export type QuotationPdfAssets = { logo?: QuoteImage; name?: QuoteImage; itemImages?: (QuoteImage | undefined)[] };

/** Picture fitted inside a box, centred. */
const fit = (doc: jsPDF, img: QuoteImage, x: number, y: number, w: number, h: number) => {
    const scale = Math.min(w / img.width, h / img.height);
    const iw = img.width * scale;
    const ih = img.height * scale;
    doc.addImage(img.dataUrl, imageType(img.dataUrl), x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
};

const letterhead = (doc: jsPDF, assets: QuotationPdfAssets) => {
    if (assets.logo) fit(doc, assets.logo, 10, 5, 40, 32);
    if (assets.name) fit(doc, assets.name, 64, 8, 128, 15);
    else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text('MAXTRON ASSOCIATES', 128, 20, { align: 'center' });
    }
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.text(ADDRESS, 128, 28.5, { align: 'center' });
    doc.text(EMAIL, 128, 34, { align: 'center' });
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, 39, 200, 39);
};

const footer = (doc: jsPDF) => {
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setDrawColor(68, 114, 196);
        doc.setLineWidth(0.3);
        doc.line(10, FOOTER_Y, 200, FOOTER_Y);
        doc.setTextColor(0);
        doc.setFontSize(9);
        const label = 'Manufacturing Unit:  ';
        doc.setFont('helvetica', 'bold');
        const lw = doc.getTextWidth(label);
        doc.setFont('helvetica', 'normal');
        const tw = doc.getTextWidth(FOOTER[0]);
        const x = (PAGE_W - lw - tw) / 2;
        doc.setFont('helvetica', 'bold');
        doc.text(label, x, FOOTER_Y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(FOOTER[0], x + lw, FOOTER_Y + 5);
        doc.text(FOOTER[1], PAGE_W / 2, FOOTER_Y + 9.5, { align: 'center' });
    }
};

/** Writes lines down the page from y, moving to a new page when needed. Returns the next y. */
const lines = (doc: jsPDF, texts: { text: string; bold?: boolean; size?: number; x?: number; gap?: number }[], y: number) => {
    for (const t of texts) {
        if (y > BOTTOM) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
        doc.setFontSize(t.size || 11);
        doc.text(pdfText(t.text), t.x ?? LEFT, y);
        y += t.gap ?? 6;
    }
    return y;
};

const signOff = (doc: jsPDF, record: any, y: number) => {
    const executive = record.users || {};
    const sign = [
        executive.name || record.employee_name,
        record.job_role || executive.job_role || executive.designation,
        record.contact_number || executive.phone || record.contact_phone,
    ].filter(Boolean).map(String);
    // Keep the sign-off together: a new page only when its last line would pass BOTTOM
    if (y + 6 + 10 + 10 + Math.max(sign.length - 1, 0) * 6 > BOTTOM) { doc.addPage(); y = 20; }
    return lines(doc, [
        { text: 'Thanks & Best Regards,', size: 12, gap: 10 },
        { text: 'For MAXTRON ASSOCIATES', size: 12, gap: 10 },
        ...sign.map(s => ({ text: s, size: 12, gap: 6 })),
    ], y + 6);
};

const tableStyles = {
    theme: 'grid' as const,
    styles: { font: 'helvetica', fontSize: 10.5, textColor: 0, lineColor: 0, lineWidth: 0.25, halign: 'center' as const, valign: 'middle' as const, cellPadding: 2 },
    headStyles: { fillColor: 255 as any, textColor: 0, fontStyle: 'bold' as const },
};

function bagsBody(doc: jsPDF, record: any) {
    const items = itemsOf(record);
    const valid = items.filter(Boolean);
    const gst = uniformGst(valid);
    const d = quoteDate(record);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`REF:  ${record.quotation_ref || ''}`, LEFT, 50);
    doc.text(`Date: ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`, RIGHT, 50, { align: 'right' });

    const to = [customerName(record).toUpperCase(), ...locationParts(record)].filter(Boolean);
    let y = lines(doc, [
        { text: 'To', gap: 5.5 },
        { text: 'Purchase Department,', gap: 5.5 },
        ...to.map((l, i) => ({ text: `${l}${i === to.length - 1 ? '.' : ','}`, gap: 5.5 })),
    ], 60);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    const subject = doc.splitTextToSize(pdfText(`Sub: ${record.quotation_subject || 'Quotation for the Supply of Poly Bags – Reg.'}`), RIGHT - LEFT);
    doc.text(subject, LEFT, y);
    y += subject.length * 5.5 + 4;

    const widths = [15, 46, 26, 37, 30, 22];
    const body: any[] = (items.length ? items : [null]).map((it: any, i: number) => it ? [
        i + 1,
        pdfText(itemDescription(it).toUpperCase()),
        num(it.amount) ? plain(num(it.amount)) : '',
        it.bags_per_kg || '',
        num(it.quantity) ? plain(num(it.quantity)) : '',
        { content: plain(num(it.amount) * num(it.quantity)), styles: { halign: 'right' } },
    ] : ['', '', '', '', '', '']);
    autoTable(doc, {
        ...tableStyles,
        startY: y,
        margin: { left: LEFT - 6, right: PAGE_W - (LEFT - 6) - widths.reduce((a, b) => a + b, 0) },
        head: [['Sl. No', 'Description', 'Rate/KG', 'No. of Bags/KG', 'Qty In KG', 'Total']],
        body,
        columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])),
    });
    y = (doc as any).lastAutoTable.finalY;

    // Sub Total / GST / Grand Total: under the last three columns, label across two
    const subTotal = valid.reduce((s, it) => s + num(it.amount) * num(it.quantity), 0);
    const gstAmount = valid.reduce((s, it) => s + (num(it.amount) * num(it.quantity) * num(it.gst_percent)) / 100, 0);
    const totalsX = LEFT - 6 + widths[0] + widths[1] + widths[2];
    autoTable(doc, {
        ...tableStyles,
        startY: y,
        margin: { left: totalsX, right: PAGE_W - totalsX - widths[3] - widths[4] - widths[5] },
        body: [
            ['Sub Total', plain(subTotal)],
            [gst === null ? 'GST' : `GST ${gst}%`, plain(gstAmount)],
            ['Grand Total', plain(subTotal + gstAmount)],
        ],
        styles: { ...tableStyles.styles, fontStyle: 'bold', cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: widths[3] + widths[4] }, 1: { cellWidth: widths[5], halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    return lines(doc, [
        { text: 'Terms & Conditions:', bold: true, x: LEFT + 10 },
        ...TERMS.map((t, i) => ({ text: `${i + 1}. ${t}`, x: LEFT + 10 })),
    ], y);
}

function tradingBody(doc: jsPDF, record: any, assets: QuotationPdfAssets) {
    const items = itemsOf(record);
    const gst = uniformGst(items.filter(Boolean));
    const units = [...new Set(items.filter(Boolean).map((i: any) => String(i.unit || 'Kg').toLowerCase()))];
    const d = quoteDate(record);

    const toLines = ['TO,', 'PURCHASE DEPARTMENT,', `${customerName(record).toUpperCase()},`, locationParts(record).join(', ').toUpperCase()]
        .filter(l => l && l !== ',');
    autoTable(doc, {
        ...tableStyles,
        startY: 48,
        margin: { left: LEFT, right: PAGE_W - RIGHT },
        body: [
            [{ content: toLines.join('\n'), rowSpan: 2, styles: { halign: 'left', valign: 'top' } }, `QUOTATION REF: ${record.quotation_ref || ''}`], // breaks after "REF:" when long
            [`DATE:${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`],
        ],
        styles: { ...tableStyles.styles, fontStyle: 'bold', fontSize: 11.5, minCellHeight: 12 },
        columnStyles: { 0: { cellWidth: 98 }, 1: { cellWidth: RIGHT - LEFT - 98 } },
    });
    const y = (doc as any).lastAutoTable.finalY + 6;

    const widths = [15, 40, 34, 22, 22, 15, 28];
    autoTable(doc, {
        ...tableStyles,
        startY: y,
        margin: { left: LEFT, right: PAGE_W - RIGHT },
        head: [['SL.NO', 'PRODUCT DESCRIPTION', 'PRODUCT IMAGE', units.length === 1 ? `RATE/${units[0]}` : 'RATE',
            gst === null ? 'GST' : `GST(${gst}%)`, 'QTY', 'TOTAL AMT INCL. GST']],
        body: (items.length ? items : [null]).map((it: any, i: number) => {
            if (!it) return ['', '', '', '', '', '', ''];
            const rate = num(it.amount);
            const qty = num(it.quantity);
            const perUnitGst = (rate * num(it.gst_percent)) / 100;
            return [String(i + 1), pdfText(itemDescription(it).toUpperCase()), '',
                rate ? money(rate) : '', rate ? money(perUnitGst) : '', qty ? String(qty) : '', money(tradingLineTotal(it))];
        }),
        foot: [[{ content: 'GRAND TOTAL', colSpan: 6, styles: { halign: 'right' } }, money(tradingGrandTotal(items))]],
        showFoot: 'lastPage',
        headStyles: { ...tableStyles.headStyles, fontSize: 9.5 },
        footStyles: { ...tableStyles.headStyles, fontSize: 11 },
        bodyStyles: { minCellHeight: 36, fontStyle: 'bold' },
        columnStyles: { ...Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])), 0: { cellWidth: widths[0], fontStyle: 'normal' } },
        didDrawCell: (data: any) => {
            if (data.section !== 'body' || data.column.index !== 2) return;
            const img = assets.itemImages?.[data.row.index];
            if (img) fit(doc, img, data.cell.x + 2, data.cell.y + 2, data.cell.width - 4, data.cell.height - 4);
        },
    });

    return lines(doc, [
        { text: 'Terms & Conditions:', bold: true },
        ...TERMS.slice(0, 3).map((t, i) => ({ text: `${i + 1}. ${t}` })),
    ], (doc as any).lastAutoTable.finalY + 8);
}

/** The quotation as a PDF document. */
export function buildQuotationPdf(record: any, assets: QuotationPdfAssets = {}): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    letterhead(doc, assets);
    const y = quotationTypeOf(record) === 'TRADING' ? tradingBody(doc, record, assets) : bagsBody(doc, record);
    signOff(doc, record, y);
    footer(doc);
    return doc;
}

export async function exportQuotationToPdf(record: any) {
    const [logo, name, itemImages] = await Promise.all([
        loadAsset('/quotation/logo.jpeg'),
        loadAsset('/quotation/name.jpeg'),
        Promise.all(itemsOf(record).map((it: any) => (it?.image ? measure(String(it.image)) : Promise.resolve(undefined)))),
    ]);
    buildQuotationPdf(record, { logo, name, itemImages }).save(quotationFileName(record, 'pdf'));
}
