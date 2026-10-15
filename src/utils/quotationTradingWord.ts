/**
 * Trading quotation as a Word file, in the client's trading layout (the same
 * one as the trading Excel): their letterhead, then
 *
 *   TO, / PURCHASE DEPARTMENT, / CUSTOMER, / PLACE  |  QUOTATION REF:… / DATE:dd/mm/yy
 *   SL.NO | PRODUCT DESCRIPTION | PRODUCT IMAGE | RATE/kg | GST(18%) | QTY | TOTAL AMT INCL. GST
 *   Terms & Conditions (the three trading terms)
 *   Thanks & Best Regards, / For MAXTRON ASSOCIATES / the executive
 *   (page footer: Manufacturing Unit address)
 *
 * Built on the client's own Word file (public/quotation/bags-template.docx) so
 * the letterhead, its rule and the fonts are theirs; only the body below the
 * letterhead is the trading layout. It replaces a generic template that printed
 * an invented company name, address, phone and e-mail.
 */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { itemsOf, customerName, locationParts, uniformGst, quoteDate, num, pad2, quotationFileName, itemDescription } from './quotationExcelGenerator';

const DOCUMENT = 'word/document.xml';
const RELS = 'word/_rels/document.xml.rels';
const TYPES = '[Content_Types].xml';

const TERMS = [
    'Delivery: Within 4 days against order.',
    'Payment: 30 days from the date of supply by NEFT to our bank account.',
    'Quote Validity: 15 days.',
];

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n: number) => n.toFixed(2);

// ── WordprocessingML pieces ──────────────────────────────────────────────────
const run = (text: string, o: { bold?: boolean; size?: number } = {}) =>
    `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${o.bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${(o.size || 11) * 2}"/><w:szCs w:val="${(o.size || 11) * 2}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (inner: string, o: { align?: 'left' | 'center' | 'right'; after?: number } = {}) =>
    `<w:p><w:pPr><w:spacing w:before="0" w:after="${o.after ?? 0}" w:line="276" w:lineRule="auto"/>${o.align && o.align !== 'left' ? `<w:jc w:val="${o.align}"/>` : ''}</w:pPr>${inner}</w:p>`;
const text = (t: string, o: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'right'; after?: number } = {}) => para(run(t, o), o);
const BORDERS = '<w:tcBorders><w:top w:val="single" w:sz="4" w:color="000000"/><w:left w:val="single" w:sz="4" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:color="000000"/><w:right w:val="single" w:sz="4" w:color="000000"/></w:tcBorders>';
const cell = (width: number, content: string, o: { vMerge?: 'restart' | 'continue'; vAlign?: 'top' | 'center' } = {}) =>
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${o.vMerge ? `<w:vMerge${o.vMerge === 'restart' ? ' w:val="restart"' : ''}/>` : ''}${BORDERS}<w:vAlign w:val="${o.vAlign || 'center'}"/></w:tcPr>${content || para('')}</w:tc>`;
const table = (widths: number[], rows: string[]) =>
    `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a, b) => a + b, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${rows.join('')}</w:tbl>`;
const row = (cells: string[], height?: number) =>
    `<w:tr><w:trPr><w:cantSplit/>${height ? `<w:trHeight w:val="${height}"/>` : ''}</w:trPr>${cells.join('')}</w:tr>`;

/** Width and height of a JPEG or PNG, read from its bytes (no DOM needed). */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) { // PNG: IHDR
        const v = new DataView(bytes.buffer, bytes.byteOffset);
        return { width: v.getUint32(16), height: v.getUint32(20) };
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8) { // JPEG: first SOF marker
        let i = 2;
        while (i + 9 < bytes.length) {
            if (bytes[i] !== 0xff) { i++; continue; }
            const marker = bytes[i + 1];
            const len = (bytes[i + 2] << 8) | bytes[i + 3];
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
                return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
            }
            i += 2 + len;
        }
    }
    return null;
}

const EMU_PER_INCH = 914400;
/** An inline picture, at most `box` inches on its longer side. */
const picture = (relId: string, id: number, size: { width: number; height: number }, box = 1.35) => {
    const scale = Math.min(box / (size.width / 96), box / (size.height / 96), 1e9);
    const cx = Math.round((size.width / 96) * scale * EMU_PER_INCH);
    const cy = Math.round((size.height / 96) * scale * EMU_PER_INCH);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Product ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="Product ${id}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
};

const base64Bytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

/** The client's Word file with this trading quotation in it. Pure: no DOM, runs in Node. */
export async function fillTradingQuotation(template: ArrayBuffer | Uint8Array, record: any): Promise<JSZip> {
    const zip = await JSZip.loadAsync(template);
    let xml = await zip.file(DOCUMENT)!.async('string');
    let rels = await zip.file(RELS)!.async('string');
    let types = await zip.file(TYPES)!.async('string');

    // Letterhead: everything above the "REF:" line. That line also carries the
    // rule under the letterhead; keep the rule, drop its text.
    const bodyStart = xml.indexOf('<w:body>') + '<w:body>'.length;
    const refAt = xml.indexOf('{{REF}}');
    if (refAt < 0) throw new Error('Quotation template has no {{REF}} line');
    const refStart = Math.max(xml.lastIndexOf('<w:p ', refAt), xml.lastIndexOf('<w:p>', refAt));
    const refEnd = xml.indexOf('</w:p>', refAt) + '</w:p>'.length;
    const letterhead = xml.slice(bodyStart, refStart);
    const rule = xml.slice(refStart, refEnd).replace(/<w:r\b(?:(?!<\/w:r>)[\s\S])*?<w:t\b[\s\S]*?<\/w:r>/g, '');
    const sectStart = xml.lastIndexOf('<w:sectPr');
    // Page settings with the Manufacturing Unit footer, as on the bags quotation
    const sectPr = xml.slice(sectStart, xml.indexOf('</w:body>'));

    // Sign-off, from the client's document: "Thanks & Best Regards," down to
    // the signer's lines. One line each for the executive's name, role and phone.
    const thanksAt = xml.indexOf('Thanks');
    const signStart = xml.lastIndexOf('</w:p>', xml.lastIndexOf('</w:p>', thanksAt)) + '</w:p>'.length;
    let signOff = xml.slice(signStart, sectStart);
    const executive = record.users || {};
    const signLines = [
        executive.name || record.employee_name,
        record.job_role || executive.job_role || executive.designation,
        record.contact_number || executive.phone || record.contact_phone,
    ].filter(Boolean).map(String);
    const lineAt = signOff.indexOf('{{SIGN_LINE}}');
    const lineStart = Math.max(signOff.lastIndexOf('<w:p ', lineAt), signOff.lastIndexOf('<w:p>', lineAt));
    const lineEnd = signOff.indexOf('</w:p>', lineAt) + '</w:p>'.length;
    const lineBlock = signOff.slice(lineStart, lineEnd);
    signOff = signOff.slice(0, lineStart) + signLines.map(l => lineBlock.split('{{SIGN_LINE}}').join(esc(l))).join('') + signOff.slice(lineEnd);

    const items = itemsOf(record);
    const gst = uniformGst(items.filter(Boolean));
    const units = [...new Set(items.filter(Boolean).map((i: any) => String(i.unit || 'Kg').toLowerCase()))];
    const d = quoteDate(record);

    // TO block and REF / DATE, boxed
    const toLines = ['TO,', 'PURCHASE DEPARTMENT,', `${customerName(record).toUpperCase()},`, locationParts(record).join(', ').toUpperCase()]
        .filter(l => l && l !== ',');
    const head = table([5600, 4400], [
        row([
            cell(5600, toLines.map(l => text(l, { bold: true, size: 12 })).join(''), { vMerge: 'restart', vAlign: 'top' }),
            cell(4400, text(`QUOTATION REF:${record.quotation_ref || ''}`, { bold: true, size: 12, align: 'center' })),
        ], 600),
        row([
            cell(5600, '', { vMerge: 'continue' }),
            cell(4400, text(`DATE:${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`, { bold: true, size: 12, align: 'center' })),
        ], 600),
    ]);

    // Items, with each product's picture
    const widths = [850, 2450, 2100, 1100, 1100, 900, 1500];
    const headings = ['SL.NO', 'PRODUCT DESCRIPTION', 'PRODUCT IMAGE', units.length === 1 ? `RATE/${units[0]}` : 'RATE',
        gst === null ? 'GST' : `GST(${gst}%)`, 'QTY', 'TOTAL AMT INCL. GST'];
    let relNo = 1000;
    let types_ok = types;
    const itemRows = (items.length ? items : [null]).map((it: any, i: number) => {
        if (!it) return row(widths.map(w => cell(w, '')), 1900);
        const rate = num(it.amount);
        const qty = num(it.quantity);
        const perUnitGst = (rate * num(it.gst_percent)) / 100;
        let pic = '';
        const m = String(it.image || '').match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);
        if (m) {
            const ext = m[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
            const bytes = base64Bytes(m[2]);
            const size = imageSize(bytes);
            if (size) {
                const relId = `rIdTrade${++relNo}`;
                zip.file(`word/media/trade${relNo}.${ext}`, bytes);
                rels = rels.replace('</Relationships>', `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/trade${relNo}.${ext}"/></Relationships>`);
                if (!new RegExp(`Extension="${ext}"`, 'i').test(types_ok)) {
                    types_ok = types_ok.replace('<Types ', '<Types ').replace(/(<Types[^>]*>)/, `$1<Default Extension="${ext}" ContentType="image/${ext}"/>`);
                }
                pic = para(picture(relId, relNo, size), { align: 'center' });
            }
        }
        return row([
            cell(widths[0], text(String(i + 1), { align: 'center' })),
            cell(widths[1], text(itemDescription(it).toUpperCase(), { bold: true, align: 'center' })),
            cell(widths[2], pic),
            cell(widths[3], text(rate ? money(rate) : '', { bold: true, align: 'center' })),
            cell(widths[4], text(rate ? money(perUnitGst) : '', { bold: true, align: 'center' })),
            cell(widths[5], text(qty ? String(qty) : '', { bold: true, align: 'center' })),
            cell(widths[6], text(money(Math.round((rate + perUnitGst) * qty)), { bold: true, align: 'center' })),
        ], 1900);
    });
    types = types_ok;
    const itemsTable = table(widths, [row(headings.map((h, i) => cell(widths[i], text(h, { bold: true, align: 'center' }))), 500), ...itemRows]);

    const terms = [
        text('', {}),
        text('Terms & Conditions:', { bold: true }),
        ...TERMS.map((t, i) => text(`${i + 1}. ${t}`)),
    ].join('');

    xml = xml.slice(0, bodyStart) + letterhead + rule + head + text('') + itemsTable + terms + text('') + signOff + sectPr + xml.slice(xml.indexOf('</w:body>'));
    zip.file(DOCUMENT, xml);
    zip.file(RELS, rels);
    zip.file(TYPES, types);
    return zip;
}

export async function exportTradingQuotationToWord(record: any) {
    const res = await fetch('/quotation/bags-template.docx');
    if (!res.ok) throw new Error('Quotation template could not be loaded');
    const zip = await fillTradingQuotation(await res.arrayBuffer(), record);
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, quotationFileName(record, 'docx'));
}
