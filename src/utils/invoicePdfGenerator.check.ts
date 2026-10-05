/**
 * Self-check for the invoice PDF. No browser, no server. From maxtron-frontend:
 *
 *   npx tsx src/utils/invoicePdfGenerator.check.ts
 *
 * Set OUT_DIR=<folder> to also write the sample PDFs to look at.
 *
 * The rule under test: the page prints what is on the invoice record and
 * nothing else. No IRN, Ack number, QR code or e-Way Bill number the portal did
 * not issue; no sample customer, address, item or vehicle; and GST at the rate
 * that was typed, 0% included, never an assumed 18%.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { buildSingleTaxInvoice, lineGstPercent } from './invoicePdfGenerator';

// A line as a saved invoice holds it: amount = qty x rate, the taxable value.
const invoice = {
    invoice_number: 'MP004',
    invoice_date: '2026-10-05',
    invoice_type: 'B2B',
    customers: { customer_name: 'Test Customer', gst_no: '32ABCDE1234F1Z5', addresses: [{ street: '12 bB', city: 'Kochi', state: 'Kerala', zip_code: '685592' }] },
    vehicle_no: 'KL10A2033',
    items: [{ finished_products: { product_name: 'VIOLET GARBAGE BAG', hsn_code: '39232100' }, quantity: 10, rate: 10, gst_percent: 18, amount: 100 }],
    total_amount: 100, tax_amount: 18, discount_amount: 0, roundoff_amount: 0, net_amount: 118,
};
const IRN = '4b89f0291e8432a10b9876543210feab9876543210feab9876543210feab9876';
const DRAFT_LABEL = '(DRAFT PREVIEW - NOT AN OFFICIAL E-INVOICE)';

// Values the page used to fall back to. None may ever print unless on the record.
const SAMPLES = /Nirmala|32AAATC2452B1ZT|Basin Road|adc49db2|592050677018|KL09AV7027|132 KM|392011|Industrial|Credit \/ 30|Standard Delivery|Direct Road/i;

/** Text drawn on the page: jsPDF writes it uncompressed as "(text) Tj". */
const textOf = (pdf: string) => (pdf.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || [])
    .map(t => t.replace(/\)\s*Tj$/, '').slice(1).replace(/\\([()\\])/g, '$1'));
const imagesIn = (pdf: string) => (pdf.match(/\/Subtype\s*\/Image/g) || []).length;

(async () => {
    let checks = 0;
    const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++; };
    const written: Record<string, any> = {};
    const page = async (name: string, inv: any, label = '(ORIGINAL FOR RECIPIENT)') => {
        const doc = await buildSingleTaxInvoice(inv, 'MAXTRON', label);
        written[name] = doc;
        const pdf = doc.output();
        return { pdf, text: textOf(pdf) };
    };

    // --- A registered buyer, not yet sent to the portal -----------------------
    const { pdf: draftPdf, text: draft } = await page('draft', { ...invoice, is_preview: true }, DRAFT_LABEL);

    ok(draft.includes('Tax Invoice'), 'it is the tax invoice page');
    ok(draft.includes(DRAFT_LABEL), 'labelled as a draft where the copy type goes');
    ok(draft.includes('Pending - not generated'), 'IRN shown as pending');
    ok(!draft.some(t => /Ack No|Ack Date/.test(t)), 'no Ack details before registration');
    ok(!draft.includes('e-Invoice'), 'no e-Invoice tag before registration');
    ok(imagesIn(draftPdf) === 0, 'no QR code on a draft');
    ok(!draft.some(t => SAMPLES.test(t)), 'no sample values on a draft');

    // The figures a saved invoice prints: 10 x 10 = 100 taxable, 9% + 9% = 18, total 118.
    ok(draft.includes('100.00'), 'taxable value 100.00');
    ok(draft.filter(t => t === '9.00').length >= 2, 'CGST and SGST 9.00 each');
    ok(draft.includes('18.00'), 'total tax 18.00');
    ok(draft.includes('118.00'), 'invoice total 118.00');
    ok(!draft.includes('21.24'), 'tax is not charged on a tax-inclusive amount');

    // --- Once registered, the same page carries what the portal issued --------
    const { pdf: regPdf, text: reg } = await page('registered',
        { ...invoice, einvoice_irn: IRN, einvoice_ack_no: '105330196958644', einvoice_ack_date: '2026-10-05', ewb_no: '481000123456' });
    ok(reg.join('').includes(IRN.slice(0, 40)), 'the real IRN is printed');
    ok(reg.includes('Ack No. : 105330196958644'), 'with its Ack number');
    ok(reg.includes('e-Invoice') && imagesIn(regPdf) >= 1, 'and the e-Invoice tag with its QR code');
    ok(reg.includes('481000123456'), 'and the real e-Way Bill number');
    ok(!reg.includes('Pending - not generated'), 'nothing marked pending');

    // Same page either way: a draft is the registered layout minus the top strip.
    const body = (t: string[]) => t.filter(x => !/IRN|Ack|e-Invoice|Pending|DRAFT|ORIGINAL|N\/A|481000123456/.test(x) && !IRN.includes(x.replace(/-$/, '')));
    assert.deepStrictEqual(body(draft), body(reg), 'draft and registered invoice share every other line'); checks++;

    // --- GST as typed ----------------------------------------------------------
    // 0% is a rate. It used to print as 18%.
    const { text: zero } = await page('zero-gst', {
        ...invoice, items: [{ ...invoice.items[0], gst_percent: 0 }], tax_amount: 0, net_amount: 100,
    });
    ok(zero.includes('100.00'), '0%: taxable and total are both 100.00');
    ok(!zero.includes('18.00') && !zero.includes('118.00') && !zero.includes('9.00'), '0%: no 18% tax appears anywhere');

    // 5% on one line, 12% on another, each at its own rate.
    const { text: mixed } = await page('mixed-gst', {
        ...invoice,
        items: [
            { finished_products: { product_name: 'BAG A', hsn_code: '39232100' }, quantity: 10, rate: 100, gst_percent: 5, amount: 1000 },
            { finished_products: { product_name: 'BAG B', hsn_code: '39232100' }, quantity: 10, rate: 100, gst_percent: 12, amount: 1000 },
        ],
        total_amount: 2000, tax_amount: 170, net_amount: 2170,
    });
    ok(mixed.filter(t => t === '25.00').length >= 2, '5% line: CGST and SGST 25.00 each');
    ok(mixed.filter(t => t === '60.00').length >= 2, '12% line: CGST and SGST 60.00 each');
    ok(mixed.includes('170.00') && mixed.includes('2,170.00'), 'tax 170.00, total 2,170.00');

    // A line saved before rates were stored takes its invoice's own rate.
    const oldLine = { ...invoice.items[0], gst_percent: undefined };
    ok(lineGstPercent(oldLine, invoice) === 18, 'old line on an 18% invoice: 18%');
    ok(lineGstPercent(oldLine, { ...invoice, tax_amount: 5 }) === 5, 'old line on a 5% invoice: 5%');
    ok(lineGstPercent(oldLine, { ...invoice, tax_amount: 0 }) === 0, 'old line on an invoice with no tax: 0%, not 18%');
    ok(lineGstPercent({ gst_percent: 0 }, invoice) === 0, 'a typed 0% stays 0%');
    ok(lineGstPercent({ gst_percent: '12' }, { total_amount: 0 }) === 12, 'a typed rate is used as typed');

    // Tax total typed over the line rates (rate left at 18%, tax typed as 0):
    // the typed total is what was charged, so the page follows it and adds up.
    const typedOver = { ...invoice, tax_amount: 0, net_amount: 100 };
    ok(lineGstPercent(typedOver.items[0], typedOver) === 0, 'typed tax total wins over a contradicting line rate');
    const { text: over } = await page('tax-typed-over', typedOver);
    ok(!over.includes('18.00') && !over.includes('118.00'), 'and no tax is printed that was not charged');

    // --- An unregistered buyer --------------------------------------------------
    const { pdf: b2cPdf, text: b2c } = await page('unregistered', {
        ...invoice, invoice_type: 'B2C', customers: { customer_name: 'Walk-in Buyer', addresses: [] },
    });
    ok(b2c.some(t => t.includes('Unregistered')), 'GSTIN shown as Unregistered');
    ok(!b2c.some(t => /IRN|Ack|Pending/.test(t)) && !b2c.includes('e-Invoice'), 'no e-Invoice strip where it does not apply');
    ok(imagesIn(b2cPdf) === 0, 'and no QR code');
    ok(!b2c.some(t => SAMPLES.test(t)), 'and no sample customer, address or numbers');
    ok(b2c.filter(t => /State Name/.test(t)).length === 1, 'no state printed for a buyer with none on record (only the seller has one)');

    // A registered buyer with no state in the address: the GSTIN says which state.
    const { text: tn } = await page('gstin-state', {
        ...invoice, customers: { customer_name: 'Chennai Traders', gst_no: '33ABCDE1234F1Z5', addresses: [{ street: '4 Mount Road', city: 'Chennai', zip_code: '600002' }] },
    });
    ok(tn.includes('State Name : Tamil Nadu, Code : 33'), 'state taken from the GSTIN');
    ok(tn.some(t => t.includes('IGST 18%')) && !tn.some(t => /CGST 9%/.test(t)), 'and charged IGST, as it is registered');

    // --- Nothing on record: nothing invented -------------------------------------
    const { text: bare } = await page('bare', { invoice_number: 'MP005', invoice_date: '2026-10-05', customers: null, items: [] });
    ok(!bare.some(t => SAMPLES.test(t)), 'an empty invoice prints no sample data');

    // --- Discount and round-off are shown, so the total adds up -------------------
    const { text: disc } = await page('discount', { ...invoice, discount_amount: 8, net_amount: 110 });
    ok(disc.some(t => t.includes('Discount')) && disc.includes('(-)8.00') && disc.includes('110.00'), 'discount line explains the total');
    const { text: rounded } = await page('round-off', {
        ...invoice, items: [{ ...invoice.items[0], rate: 10.03 }], total_amount: 100.3, tax_amount: 18.05, net_amount: 118,
    });
    ok(rounded.some(t => t.includes('Round Off')), 'round-off line explains the total');

    if (process.env.OUT_DIR) {
        for (const [name, doc] of Object.entries(written)) {
            fs.writeFileSync(path.join(process.env.OUT_DIR, `${name}.pdf`), Buffer.from(doc.output('arraybuffer')));
        }
        console.log('wrote', Object.keys(written).join(', '), 'to', process.env.OUT_DIR);
    }
    console.log(`invoice-pdf: ${checks}/${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
