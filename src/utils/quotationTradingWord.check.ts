/**
 * Self-check for the trading quotation Word file. From maxtron-frontend:
 *   npx tsx src/utils/quotationTradingWord.check.ts
 * Set OUT_DIR=<folder> to also write trading.docx to look at.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fillTradingQuotation, imageSize } from './quotationTradingWord';

const pub = path.join(__dirname, '..', '..', 'public', 'quotation');
const photo = fs.readFileSync(path.join(pub, 'logo.jpeg'));

(async () => {
    const size = imageSize(new Uint8Array(photo));
    assert.ok(size && size.width > 0 && size.height > 0, 'reads a JPEG size');

    const record = {
        quotation_type: 'TRADING',
        quotation_ref: 'MA/KLM(FO)-QUOTE-0280/2026-27',
        visit_date: '2026-10-14',
        customer_name: 'Sivagiri Sree Narayana Medical Mission Hospital',
        location: 'Kollam, Kerala',
        users: { name: 'SHIBIN', phone: '8136861444', designation: 'Business Development Executive' },
        quotation_items: [
            { product_name: 'Rectangular 10 Pedal Bin', amount: 387, quantity: 1, unit: 'Pcs', gst_percent: 18, image: `data:image/jpeg;base64,${photo.toString('base64')}` },
            { product_name: 'Rectangular Bin With Swing Lid', amount: 100, quantity: 10, unit: 'Pcs', gst_percent: 18 },
        ],
    };
    const zip = await fillTradingQuotation(fs.readFileSync(path.join(pub, 'bags-template.docx')), record);
    const xml = await zip.file('word/document.xml')!.async('string');
    const texts = (xml.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join('|');

    for (const s of ['TO,', 'PURCHASE DEPARTMENT,', 'SIVAGIRI SREE NARAYANA MEDICAL MISSION HOSPITAL,', 'KOLLAM, KERALA',
        'QUOTATION REF:MA/KLM(FO)-QUOTE-0280/2026-27', 'DATE:14/10/26', 'PRODUCT IMAGE', 'RATE/pcs', 'GST(18%)', 'TOTAL AMT INCL. GST',
        'RECTANGULAR 10 PEDAL BIN', '387.00', '69.66', '457.00', '1180.00', 'Terms &amp; Conditions:']) {
        assert.ok(texts.includes(s), `has "${s}"`);
    }
    assert.ok(!/MAXTRON ENTERPRISE|98765|sales@maxtron/.test(texts), 'no invented company details');
    assert.ok(!/\{\{/.test(xml), 'no template placeholders left');
    assert.ok(!/Taxes: GST extra/.test(texts), 'trading carries three terms');
    assert.ok(/footerReference/.test(xml.slice(xml.lastIndexOf('<w:sectPr'))), 'Manufacturing Unit footer kept');
    for (const s of ['Thanks &amp; Best Regards,', 'For MAXTRON ASSOCIATES', 'SHIBIN', 'Business Development Executive', '8136861444']) {
        assert.ok(texts.includes(s), `sign-off has "${s}"`);
    }
    assert.ok(texts.replace(/\|/g, '').includes('13/95,13/96 PIRIVUSALA'), 'the client letterhead is kept');
    assert.strictEqual((xml.match(/r:embed="rIdTrade/g) || []).length, 1, 'one product photo placed');
    assert.ok(zip.file('word/media/trade1001.jpeg'), 'the photo is in the file');

    if (process.env.OUT_DIR) {
        fs.writeFileSync(path.join(process.env.OUT_DIR, 'trading.docx'), await zip.generateAsync({ type: 'nodebuffer' }));
        console.log('wrote trading.docx');
    }
    console.log('trading-quotation-word: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
