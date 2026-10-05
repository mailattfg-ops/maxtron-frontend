/**
 * Self-check for the quotation Excel layouts, against the client's two
 * reference quotations (trading "MA/TSR-01420/26-27", bags
 * "MA/VKM(FO)-QUOTE-0131/2026-27"). No browser, no server. From maxtron-frontend:
 *
 *   npx tsx src/utils/quotationExcelGenerator.check.ts
 *
 * Set OUT_DIR=<folder> to also write trading.xlsx and bags.xlsx to look at;
 * PRODUCT_IMAGE=<jpeg> puts that picture on the first trading line.
 *
 * If a number here stops matching, the sheet no longer agrees with what the
 * client's own quotation says.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { buildQuotationWorkbook, quotationFileName, QuoteImage } from './quotationExcelGenerator';

const jpegSize = (buf: Buffer) => {
    let i = 2;
    while (i < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isFrame) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        i += 2 + buf.readUInt16BE(i + 2);
    }
    throw new Error('not a JPEG');
};

const loadJpeg = (file: string): QuoteImage | undefined => {
    if (!file || !fs.existsSync(file)) return undefined;
    const buf = fs.readFileSync(file);
    return { dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`, ...jpegSize(buf) };
};

const pub = path.resolve(__dirname, '../../public/quotation');
const logo = loadJpeg(path.join(pub, 'logo.jpeg'));
const name = loadJpeg(path.join(pub, 'name.jpeg'));
const productImage = loadJpeg(process.env.PRODUCT_IMAGE || '');

const trading = {
    quotation_type: 'TRADING',
    quotation_ref: 'MA/TSR-01420/26-27',
    visit_date: '2026-09-22',
    customer_name: 'Vaidyaratnam',
    location: 'Thrissur, Kerala',
    quotation_items: [
        { product_name: 'Rectangular 15ltr Swach Pedal Bin', amount: 542, gst_percent: 18, quantity: 30, unit: 'Kg' },
        { product_name: 'Storage Bucket with Lid 160ltr', amount: '', gst_percent: 18, quantity: 5, unit: 'Kg' },
    ],
};

const bags = {
    quotation_type: 'BAGS',
    quotation_ref: 'MA/VKM(FO)-QUOTE-0131/2026-27',
    quotation_subject: 'Quotation for the Supply of Semi Virgin Poly Bags 51 MICRONS– Reg.',
    visit_date: '2026-09-08',
    customer_name: 'PK Das Hospital',
    location: 'Vaniyamkulam, Kerala',
    users: { name: 'Mr. Sivadas', phone: '81390-12444' },
    quotation_items: [
        { product_name: '30X50 Green', amount: 105, gst_percent: 18, quantity: 25, unit: 'Kg', bags_per_kg: '45 TO 50' },
        { product_name: '30X50 Black', amount: 105, gst_percent: 18, quantity: 25, unit: 'Kg', bags_per_kg: '45 TO 50' },
        { product_name: '16X16 Black', amount: 105, gst_percent: 18, quantity: 25, unit: 'Kg', bags_per_kg: '90 TO 95' },
    ],
};

// cell.value drops a cached result of 0, so read formula cells through exceljs' own getters.
const result = (cell: any) => (cell.formula ? cell.result : cell.value);
const formula = (cell: any) => cell.formula;
const findRow = (ws: any, col: number, text: string) => {
    // .text, not .value: the footer is rich text.
    for (let r = 1; r <= ws.rowCount; r++) if (ws.getCell(r, col).text === text) return r;
    throw new Error(`"${text}" not found in column ${col}`);
};

(async () => {
    let checks = 0;
    const ok = (cond: unknown, msg: string) => { assert.ok(cond, msg); checks++; };
    const eq = (a: unknown, b: unknown, msg: string) => { assert.strictEqual(a, b, msg); checks++; };

    // ── Trading: the reference line is 542.00 / 97.56 / 30 / 19187.00 ──
    const t = buildQuotationWorkbook(trading, { logo, name, itemImages: [productImage] }).getWorksheet('Quotation')!;
    eq(t.getCell('D5').value, 'QUOTATION REF:MA/TSR-01420/26-27', 'ref block');
    eq(t.getCell('D7').value, 'DATE:22/09/26', 'date as dd/mm/yy');
    eq(t.getCell('A5').value, 'TO,\nPURCHASE DEPARTMENT,\nVAIDYARATNAM,\nTHRISSUR, KERALA', 'TO block');
    eq(t.getCell('E9').value, 'GST(18%)', 'GST header carries the rate');
    eq(t.getCell('C9').value, 'PRODUCT IMAGE', 'image column');
    eq(result(t.getCell('E10')), 97.56, 'GST per unit');
    eq(result(t.getCell('G10')), 19187, 'total incl. GST, rounded to the rupee');
    eq(formula(t.getCell('G10')), 'ROUND((D10+E10)*F10,0)', 'total stays a live formula');
    eq(result(t.getCell('E11')), 0, 'a line with no rate shows 0 GST, as on the reference');
    eq(result(t.getCell('G11')), 0, 'and 0 total');
    eq(t.getCell('A13').value, null, 'spare slots stay empty');
    eq(t.getCell(findRow(t, 2, 'Terms & Conditions:') + 3, 2).value, '3. Quote Validity: 15 days.', 'three terms');
    eq(t.getImages().length, (logo ? 1 : 0) + (name ? 1 : 0) + (productImage ? 1 : 0), 'letterhead + product pictures');
    // Without a sheet view Excel shrinks rows on scaled displays and pictures overflow them.
    ok(t.views.length > 0, 'trading sheet declares a view');
    ok(t.getColumn(1).isCustomWidth && t.getColumn(6).isCustomWidth, 'narrow columns are written, not left at the default');

    // ── Bags: the reference totals are 7875 / 1417.5 / 9292.5 ──
    const b = buildQuotationWorkbook(bags, { logo, name }).getWorksheet('Quotation')!;
    ok(b.views.length > 0, 'bags sheet declares a view');
    eq(b.getCell('A6').value, 'REF: MA/VKM(FO)-QUOTE-0131/2026-27', 'ref');
    eq(b.getCell('E6').value, 'Date: 08.09.2026', 'date as dd.mm.yyyy');
    eq(b.getCell('A9').value, 'Purchase Department,', 'To line 1');
    eq(b.getCell('A10').value, 'PK DAS HOSPITAL,', 'To line 2');
    eq(b.getCell('A12').value, 'Kerala.', 'last To line ends with a full stop');
    const head = findRow(b, 1, 'Sl. No');
    eq(b.getCell(head, 4).value, 'No. of Bags/KG', 'bags-per-kg column');
    eq(b.getCell(head + 1, 4).value, '45 TO 50', 'bags per kg is text');
    eq(result(b.getCell(head + 1, 6)), 2625, 'line total');
    // Totals are stacked on the right: label across D:E, amount in F.
    const sub = findRow(b, 4, 'Sub Total');
    eq(result(b.getCell(sub, 6)), 7875, 'sub total');
    eq(b.getCell(sub + 1, 4).value, 'GST 18%', 'GST sits between Sub Total and Grand Total');
    eq(result(b.getCell(sub + 1, 6)), 1417.5, 'GST amount');
    eq(b.getCell(sub + 2, 4).value, 'Grand Total', 'grand total label');
    eq(result(b.getCell(sub + 2, 6)), 9292.5, 'grand total');
    eq(formula(b.getCell(sub + 2, 6)), `F${sub}+F${sub + 1}`, 'grand total stays a live formula');
    ok(b.getCell(sub, 4).isMerged && !b.getCell(sub, 3).border?.left, 'totals are boxed on the right only');
    eq(b.getCell(findRow(b, 2, 'Terms & Conditions:') + 4, 2).value, '4. Taxes: GST extra as applicable at the time of billing.', 'four terms, indented');
    const signed = findRow(b, 1, 'Mr. Sivadas');
    ok(signed > findRow(b, 1, 'For MAXTRON ASSOCIATES'), 'signed by the executive');
    eq(b.getCell(signed + 1, 1).value, '81390-12444', 'with their phone');
    const foot = findRow(b, 1, 'Manufacturing Unit:  Maxtron Associates, Kottamangalam, Erattakulam – Nallepilly Road,');
    eq(b.getCell(foot + 1, 1).value, 'Nallepilly, Palakkad, Kerala.', 'manufacturing unit footer');
    assert.throws(() => findRow(t, 1, b.getCell(foot, 1).text), 'the trading sheet has no such footer'); checks++;

    // Mixed GST rates cannot be one formula, and must not pretend to be one rate.
    const mixed = buildQuotationWorkbook({ ...bags, quotation_items: [bags.quotation_items[0], { ...bags.quotation_items[1], gst_percent: 5 }] }).getWorksheet('Quotation')!;
    const mSub = findRow(mixed, 4, 'Sub Total');
    eq(mixed.getCell(mSub + 1, 4).value, 'GST', 'mixed rates: no percentage in the label');
    eq(result(mixed.getCell(mSub + 1, 6)), 2625 * 0.18 + 2625 * 0.05, 'mixed rates: summed per line');

    // An old quotation saved before the format existed still exports (as BAGS).
    ok(buildQuotationWorkbook({ quotation_items: [] }).getWorksheet('Quotation'), 'legacy record builds');
    eq(quotationFileName(trading), 'MA_TSR-01420_26-27_Vaidyaratnam.xlsx', 'file name');

    if (process.env.OUT_DIR) {
        await buildQuotationWorkbook(trading, { logo, name, itemImages: [productImage] }).xlsx.writeFile(path.join(process.env.OUT_DIR, 'trading.xlsx'));
        await buildQuotationWorkbook(bags, { logo, name }).xlsx.writeFile(path.join(process.env.OUT_DIR, 'bags.xlsx'));
        console.log('wrote trading.xlsx and bags.xlsx to', process.env.OUT_DIR);
    }
    console.log(`quotation-excel: ${checks}/${checks} checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
