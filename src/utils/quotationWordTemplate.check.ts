/**
 * Self-check for the Word bags quotation, against the client's own reference
 * ("MA/VKM(FO)-QUOTE-0131/2026-27"). No browser, no server. From maxtron-frontend:
 *
 *   npx tsx src/utils/quotationWordTemplate.check.ts
 *
 * Set OUT_DIR=<folder> to also write bags.docx to open in Word.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fillBagsQuotation } from './quotationWordTemplate';

const template = fs.readFileSync(path.resolve(__dirname, '../../public/quotation/bags-template.docx'));

const reference = {
    quotation_type: 'BAGS',
    quotation_ref: 'MA/VKM(FO)-QUOTE-0131/2026-27',
    quotation_subject: 'Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS– Reg.',
    visit_date: '2026-09-08',
    customer_name: 'PK Das Hospital',
    location: 'Vaniyamkulam, Kerala',
    users: { name: 'Mr. Sivadas', phone: '81390-12444' },
    quotation_items: [
        { product_name: '30X50 Green', amount: 105, gst_percent: 18, quantity: 25, bags_per_kg: '45 TO 50' },
        { product_name: '30X50 Black', amount: 105, gst_percent: 18, quantity: 25, bags_per_kg: '45 TO 50' },
        { product_name: '16X16 Black', amount: 105, gst_percent: 18, quantity: 25, bags_per_kg: '90 TO 95' },
    ],
};

/** Visible text of the document body, one string per paragraph. */
const paragraphs = async (record: any) => {
    const xml = await (await fillBagsQuotation(template, record)).file('word/document.xml')!.async('string');
    return (xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [])
        .map(p => (p.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))
        .map(t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim())
        .filter(Boolean);
};

(async () => {
    let checks = 0;
    const has = (list: string[], text: string, msg: string) => { assert.ok(list.includes(text), `${msg} — "${text}" not found`); checks++; };
    const order = (list: string[], a: string, b: string, msg: string) => { assert.ok(list.indexOf(a) >= 0 && list.indexOf(a) < list.indexOf(b), msg); checks++; };

    const p = await paragraphs(reference);
    assert.ok(p.some(t => t.startsWith('REF: MA/VKM(FO)-QUOTE-0131/2026-27') && t.endsWith('Date: 08.09.2026')), 'REF and Date share the line'); checks++;
    order(p, 'Purchase Department,', 'PK DAS HOSPITAL,', 'customer follows Purchase Department');
    order(p, 'PK DAS HOSPITAL,', 'Vaniyamkulam,', 'then the place');
    has(p, 'Kerala.', 'last To line ends with a full stop');
    has(p, 'Sub: Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS– Reg.', 'subject');
    for (const cell of ['30X50 GREEN', '30X50 BLACK', '16X16 BLACK', '45 TO 50', '90 TO 95']) has(p, cell, 'item row');
    assert.strictEqual(p.filter(t => t === '2625').length, 3, 'three line totals'); checks++;
    for (const total of ['7875', 'GST 18%', '1417.5', '9292.5']) has(p, total, 'totals as on the reference');
    order(p, 'For MAXTRON ASSOCIATES', 'Mr. Sivadas', 'signed by the executive');
    order(p, 'Mr. Sivadas', '81390-12444', 'with their phone under the name');
    has(p, '4. Taxes: GST extra as applicable at the time of billing.', 'terms untouched');

    // Text that would break the XML if it went in raw.
    const odd = await paragraphs({ ...reference, customer_name: 'A & B <Traders>' });
    has(odd, 'A & B <TRADERS>,', 'ampersands and angle brackets are escaped');

    // Mixed GST rates must not claim a single percentage.
    const mixed = await paragraphs({ ...reference, quotation_items: [reference.quotation_items[0], { ...reference.quotation_items[1], gst_percent: 5 }] });
    has(mixed, 'GST', 'mixed rates: plain GST label');
    has(mixed, String(2625 * 0.18 + 2625 * 0.05), 'mixed rates: summed per line');

    // A bare record still produces a document, with nothing left in braces.
    const bare = await paragraphs({ quotation_items: [] });
    assert.ok(!bare.join(' ').includes('{{'), 'no placeholder survives'); checks++;
    has(bare, 'Purchase Department,', 'fixed text stays');

    if (process.env.OUT_DIR) {
        const out = path.join(process.env.OUT_DIR, 'bags.docx');
        fs.writeFileSync(out, await (await fillBagsQuotation(template, reference)).generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
        console.log('wrote', out);
    }
    console.log(`quotation-word: ${checks}/${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
