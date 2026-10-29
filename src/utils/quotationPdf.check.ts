/**
 * Self-check for the quotation PDFs. From maxtron-frontend:
 *   npx tsx src/utils/quotationPdf.check.ts
 * Set OUT_DIR=<folder> to also write bags.pdf and trading.pdf to look at.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { buildQuotationPdf } from './quotationPdf';
import { itemDescription } from './quotationExcelGenerator';

const pub = path.join(__dirname, '..', '..', 'public', 'quotation');
const jpeg = (file: string) => {
    const b = fs.readFileSync(path.join(pub, file));
    // size from the JPEG header (SOF0/SOF2)
    let i = 2; let w = 0; let h = 0;
    while (i < b.length) { const m = b[i + 1]; const len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc2) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); break; } i += 2 + len; }
    return { dataUrl: `data:image/jpeg;base64,${b.toString('base64')}`, width: w, height: h };
};
const textOf = (pdf: string) => (pdf.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || []).map(t => t.replace(/\)\s*Tj$/, '').slice(1).replace(/\\([()\\])/g, '$1'));
const users = { name: 'SHIBIN', phone: '8136861444', designation: 'Business Development Executive' };
const assets = { logo: jpeg('logo.jpeg'), name: jpeg('name.jpeg') };

const bags = {
    quotation_type: 'BAGS', quotation_ref: 'MA/VKM(FO)-QUOTE-0131/2026-27', visit_date: '2026-09-08',
    customer_name: 'PK DAS HOSPITAL', location: 'Vaniyamkulam, Kerala', quotation_subject: 'Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS – Reg.', users,
    quotation_items: [
        { product_name: '30X50 GREEN', amount: 105, bags_per_kg: '45 TO 50', quantity: 25, gst_percent: 18 },
        { product_name: '30X50 BLACK', amount: 105, bags_per_kg: '45 TO 50', quantity: 25, gst_percent: 18 },
        { product_name: '16X16 BLACK', amount: 105, bags_per_kg: '90 TO 95', quantity: 25, gst_percent: 18 },
    ],
};
const trading = {
    quotation_type: 'TRADING', quotation_ref: 'MA/KLM(FO)-QUOTE-0280/2026-27', visit_date: '2026-10-14',
    customer_name: 'Sivagiri Sree Narayana Medical Mission Hospital', location: 'Kollam, Kerala', users,
    quotation_items: [
        { product_name: 'Rectangular 10 Pedal Bin', amount: 387, quantity: 1, unit: 'Pcs', gst_percent: 18 },
        { product_name: 'Rectangular Bin With Swing Lid', amount: 100, quantity: 10, unit: 'Pcs', gst_percent: 18 },
    ],
};

const b = buildQuotationPdf(bags, assets);
const bt = textOf(b.output());
for (const s of ['REF:  MA/VKM(FO)-QUOTE-0131/2026-27', 'Date: 08.09.2026', 'PK DAS HOSPITAL,', 'Kerala.', 'Sl. No', 'No. of Bags/KG', '30X50 GREEN', '45 TO 50', '2625', 'Sub Total', '7875', 'GST 18%', '1417.5', 'Grand Total', '9292.5', '4. Taxes: GST extra as applicable at the time of billing.', 'Sub: Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS - Reg.', 'Maxtron Associates, Kottamangalam, Erattakulam - Nallepilly Road,', 'Thanks & Best Regards,', 'For MAXTRON ASSOCIATES', 'SHIBIN', '8136861444', 'Manufacturing Unit:  ']) {
    assert.ok(bt.includes(s), `bags has "${s}"`);
}
assert.strictEqual(b.getNumberOfPages(), 1, 'bags fits one page');

// MA/ALP(FO)-QUOTE-0290: four items whose descriptions wrap to two lines, signed with name, role and phone.
const long = (size: string) => ({ product_name: `ALL COLOURS - WITHOUT PRINT ${size}`, amount: 110, bags_per_kg: 45, quantity: 1, gst_percent: 18 });
const alp = buildQuotationPdf({
    quotation_type: 'BAGS', quotation_ref: 'MA/ALP(FO)-QUOTE-0290/2026-27', visit_date: '2026-10-23',
    customer_name: 'TALUK HEAD QUATERS HOSPITAL', location: 'ALAPPUZHA',
    users: { name: 'SAFA SANAZ' }, job_role: 'office Assistant', contact_number: '8137961444',
    quotation_items: ['19X22', '24X30', '30X35', '30X50'].map(long),
}, assets);
assert.strictEqual(alp.getNumberOfPages(), 1, 'four two-line items fit one page');

const t = buildQuotationPdf(trading, { ...assets, itemImages: [jpeg('logo.jpeg'), undefined] });
const tt = textOf(t.output());
for (const s of ['TO,', 'PURCHASE DEPARTMENT,', 'QUOTATION REF: MA/KLM(FO)-QUOTE-0280/2026-27', 'DATE:14/10/26', 'PRODUCT IMAGE', 'RATE/pcs', 'GST(18%)', 'RECTANGULAR 10 PEDAL BIN', '387.00', '69.66', '457.00', '1180.00', 'GRAND TOTAL', '1637.00', '3. Quote Validity: 15 days.', 'Thanks & Best Regards,', 'SHIBIN']) {
    assert.ok(tt.join('').includes(s) || tt.join(' ').includes(s), `trading has "${s}"`); // text wraps inside cells
}
assert.ok(!tt.some(x => /Taxes: GST extra/.test(x)), 'trading carries three terms');
assert.strictEqual(t.getNumberOfPages(), 1, 'trading with two items fits one page');

// Client's own size, on the quotation only
assert.strictEqual(itemDescription({ product_name: 'BLUE 30 X 36' }), 'BLUE 30 X 36', 'standard size when none given');
assert.strictEqual(itemDescription({ product_name: 'BLUE 30 X 36', custom_size: '28 X 34' }), 'BLUE 28 X 34', 'client size replaces the standard one');
assert.strictEqual(itemDescription({ product_name: 'GARBAGE RED BAG', custom_size: '19*22' }), 'GARBAGE RED BAG 19*22', 'added when the name has no size');
assert.strictEqual(itemDescription({ product_name: 'BLUE 30 X 36', custom_size: '  ' }), 'BLUE 30 X 36', 'blank size ignored');
const custom = textOf(buildQuotationPdf({ ...bags, quotation_items: [{ ...bags.quotation_items[0], custom_size: '28 X 34' }] }, assets).output());
assert.ok(custom.includes('28 X 34 GREEN'), 'PDF prints the client size in place of 30X50');

if (process.env.OUT_DIR) {
    fs.writeFileSync(path.join(process.env.OUT_DIR, 'q-bags.pdf'), Buffer.from(b.output('arraybuffer')));
    fs.writeFileSync(path.join(process.env.OUT_DIR, 'q-trading.pdf'), Buffer.from(t.output('arraybuffer')));
    console.log('wrote q-bags.pdf and q-trading.pdf');
}
console.log('quotation-pdf: all checks passed');
