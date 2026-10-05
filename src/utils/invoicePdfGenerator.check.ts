/**
 * Self-check for the tax invoice page as the on-screen preview uses it.
 * No browser, no server. From maxtron-frontend:
 *
 *   npx tsx src/utils/invoicePdfGenerator.check.ts
 *
 * Set OUT_DIR=<folder> to also write draft.pdf and registered.pdf to look at.
 *
 * The preview IS this page, so the two things that must hold are: a draft
 * never shows an IRN, Ack number, QR code or e-Way Bill number that the portal
 * did not issue; and the figures are the ones the saved invoice will print.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { buildSingleTaxInvoice } from './invoicePdfGenerator';

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

/** Text drawn on the page: jsPDF writes it uncompressed as "(text) Tj". */
const textOf = (pdf: string) => (pdf.match(/\((?:\\.|[^\\)])*\)\s*Tj/g) || [])
    .map(t => t.replace(/\)\s*Tj$/, '').slice(1).replace(/\\([()\\])/g, '$1'));
const imagesIn = (pdf: string) => (pdf.match(/\/Subtype\s*\/Image/g) || []).length;

(async () => {
    let checks = 0;
    const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++; };

    const draftDoc = await buildSingleTaxInvoice({ ...invoice, is_preview: true }, 'MAXTRON', DRAFT_LABEL);
    const draftPdf = draftDoc.output();
    const draft = textOf(draftPdf);

    ok(draft.includes('Tax Invoice'), 'it is the tax invoice page');
    ok(draft.includes(DRAFT_LABEL), 'labelled as a draft where the copy type goes');
    ok(draft.includes('Pending - not generated'), 'IRN shown as pending');
    ok(!draft.some(t => /adc49db2|Ack No|Ack Date/.test(t)), 'no invented IRN or Ack details');
    ok(!draft.includes('e-Invoice'), 'no e-Invoice tag before registration');
    ok(!draft.includes('592050677018'), 'no sample e-Way Bill number');
    ok(imagesIn(draftPdf) === 0, 'no QR code on a draft');

    // The figures a saved invoice prints: 10 x 10 = 100 taxable, 9% + 9% = 18, total 118.
    ok(draft.includes('100.00'), 'taxable value 100.00');
    ok(draft.filter(t => t === '9.00').length >= 2, 'CGST and SGST 9.00 each');
    ok(draft.includes('18.00'), 'total tax 18.00');
    ok(draft.includes('118.00'), 'invoice total 118.00');
    ok(!draft.includes('21.24'), 'tax is not charged on a tax-inclusive amount');

    // Once registered, the same page carries what the portal issued.
    const regDoc = await buildSingleTaxInvoice(
        { ...invoice, is_preview: true, einvoice_irn: IRN, einvoice_ack_no: '105330196958644', einvoice_ack_date: '2026-10-05', ewb_no: '481000123456' },
        'MAXTRON', '(ORIGINAL FOR RECIPIENT)'
    );
    const regPdf = regDoc.output();
    const reg = textOf(regPdf);
    ok(reg.join('').includes(IRN.slice(0, 40)), 'the real IRN is printed');
    ok(reg.includes('Ack No. : 105330196958644'), 'with its Ack number');
    ok(reg.includes('e-Invoice') && imagesIn(regPdf) >= 1, 'and the e-Invoice tag with its QR code');
    ok(reg.includes('481000123456'), 'and the real e-Way Bill number');
    ok(!reg.includes('Pending - not generated'), 'nothing marked pending');

    // Same page either way: a draft is the registered layout minus the top strip.
    const body = (t: string[]) => t.filter(x => !/IRN|Ack|e-Invoice|Pending|DRAFT|ORIGINAL|N\/A|481000123456/.test(x) && !IRN.includes(x.replace(/-$/, '')));
    assert.deepStrictEqual(body(draft), body(reg), 'draft and registered invoice share every other line'); checks++;

    if (process.env.OUT_DIR) {
        fs.writeFileSync(path.join(process.env.OUT_DIR, 'draft.pdf'), Buffer.from(draftDoc.output('arraybuffer')));
        fs.writeFileSync(path.join(process.env.OUT_DIR, 'registered.pdf'), Buffer.from(regDoc.output('arraybuffer')));
        console.log('wrote draft.pdf and registered.pdf to', process.env.OUT_DIR);
    }
    console.log(`invoice-pdf: ${checks}/${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
