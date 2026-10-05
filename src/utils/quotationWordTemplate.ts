/**
 * Bags quotation as a Word file.
 *
 * This does not redraw the client's quotation — it IS their quotation:
 * public/quotation/bags-template.docx is the .docx they sent, with the
 * variable text swapped for {{PLACEHOLDERS}}. Filling it changes text only,
 * so the letterhead, fonts, spacing, table borders and page footer come out
 * exactly as they made them.
 *
 * (Word has no live formulas here; the totals are computed at export time.
 * The Excel export keeps them live.)
 */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    itemsOf, customerName, locationParts, uniformGst, quoteDate, num, pad2, quotationFileName,
} from './quotationExcelGenerator';

const DOCUMENT = 'word/document.xml';

const esc = (s: unknown) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 2625 stays "2625", 1417.5 stays "1417.5" — as the reference prints them. */
const amount = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Replace the <tag> element that holds `marker` with one copy per entry of
 * `fills`, each copy passed through its fill function. No entries removes
 * the element. These elements (table rows, body paragraphs) are not nested
 * in the template, so the nearest opening and closing tags are the right ones.
 */
const repeat = (xml: string, tag: string, marker: string, fills: ((block: string) => string)[]) => {
    const at = xml.indexOf(marker);
    if (at < 0) throw new Error(`Quotation template has no ${marker}`);
    const start = Math.max(xml.lastIndexOf(`<${tag} `, at), xml.lastIndexOf(`<${tag}>`, at));
    const end = xml.indexOf(`</${tag}>`, at) + `</${tag}>`.length;
    const block = xml.slice(start, end);
    return xml.slice(0, start) + fills.map(fill => fill(block)).join('') + xml.slice(end);
};

const set = (values: Record<string, unknown>) => (block: string) =>
    Object.entries(values).reduce((s, [key, value]) => s.split(`{{${key}}}`).join(esc(value)), block);

/** The template with this quotation's data in it. Pure: no DOM, runs in Node. */
export async function fillBagsQuotation(template: ArrayBuffer | Uint8Array, record: any): Promise<JSZip> {
    const zip = await JSZip.loadAsync(template);
    const part = zip.file(DOCUMENT);
    if (!part) throw new Error('Quotation template is not a Word document');
    let xml = await part.async('string');

    const items = itemsOf(record);
    const gst = uniformGst(items);
    const subTotal = items.reduce((s, it) => s + num(it.amount) * num(it.quantity), 0);
    const gstAmount = items.reduce((s, it) => s + (num(it.amount) * num(it.quantity) * num(it.gst_percent)) / 100, 0);

    // Item rows; a quotation with no items keeps one empty row so the table stands.
    const rows = items.length ? items : [null];
    xml = repeat(xml, 'w:tr', '{{SL}}', rows.map((it, i) => set(it ? {
        SL: i + 1,
        DESC: String(it.product_name || '').toUpperCase(),
        RATE: num(it.amount) ? amount(num(it.amount)) : '',
        BAGS: it.bags_per_kg || '',
        QTY: num(it.quantity) ? amount(num(it.quantity)) : '',
        TOTAL: amount(num(it.amount) * num(it.quantity)),
    } : { SL: '', DESC: '', RATE: '', BAGS: '', QTY: '', TOTAL: '' })));

    // "Purchase Department," is fixed in the template; then one line per part,
    // a comma after each and a full stop on the last.
    const to = [customerName(record).toUpperCase(), ...locationParts(record)].filter(Boolean);
    xml = repeat(xml, 'w:p', '{{TO_LINE}}', to.map((line, i) => set({ TO_LINE: `${line}${i === to.length - 1 ? '.' : ','}` })));

    // Sign-off: the executive who raised the quotation, with their phone.
    const executive = record.users || {};
    const sign = [executive.name || record.employee_name, executive.phone].filter(Boolean);
    xml = repeat(xml, 'w:p', '{{SIGN_LINE}}', sign.map(line => set({ SIGN_LINE: line })));

    const d = quoteDate(record);
    xml = set({
        REF: record.quotation_ref || '',
        DATE: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`,
        SUBJECT: record.quotation_subject || 'Quotation for the Supply of Poly Bags – Reg.',
        SUB_TOTAL: amount(subTotal),
        GST_LABEL: gst === null ? 'GST' : `GST ${gst}%`,
        GST_AMOUNT: amount(gstAmount),
        GRAND_TOTAL: amount(subTotal + gstAmount),
    })(xml);

    // A placeholder left behind means the template and this code have drifted
    // apart; a quotation must never reach a customer with {{BRACES}} in it.
    const left = xml.match(/\{\{[A-Z_]+\}\}/);
    if (left) throw new Error(`Quotation template placeholder ${left[0]} was not filled`);

    zip.file(DOCUMENT, xml);
    return zip;
}

export async function exportBagsQuotationToWord(record: any) {
    const res = await fetch('/quotation/bags-template.docx');
    if (!res.ok) throw new Error('Quotation template could not be loaded');
    const zip = await fillBagsQuotation(await res.arrayBuffer(), record);
    const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, quotationFileName(record, 'docx'));
}
