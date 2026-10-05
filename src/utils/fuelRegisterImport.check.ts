/**
 * Self-check for reading the diesel register workbook. From maxtron-frontend:
 *
 *   npx tsx src/utils/fuelRegisterImport.check.ts
 *
 * Builds a workbook laid out like the client's (a sheet per month: title,
 * header, one filling per row, totals row), saves and reloads it as an upload
 * would, and reads it back.
 */
import assert from 'assert';
import ExcelJS from 'exceljs';
import { readFuelRegister } from './fuelRegisterImport';

const fleet = ['KL 70 J 0665', 'KL 09 AW 6791', 'KL 09 AX 2744'].map((registration_number, i) => ({ id: `veh-${i + 1}`, registration_number }));
const norm = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const matchVehicle = (raw: string) => fleet.find(v => norm(v.registration_number) === norm(raw)) || null;

const monthSheet = (wb: ExcelJS.Workbook, name: string, rows: any[][], totals?: any[]) => {
    const ws = wb.addWorksheet(name);
    ws.addRow(['Monthly Diesel Consumption Register – FY 2026–27']);
    ws.mergeCells('A1:F1');
    ws.addRow(['DATE', 'VEH NO', 'LTR', 'RATE', 'AMOUNT', 'PUMP']);
    rows.forEach(r => ws.addRow(r));
    if (totals) ws.addRow(totals);
};

(async () => {
    const wb = new ExcelJS.Workbook();
    // Dates as text, as the register shows them
    monthSheet(wb, 'APRIL 2026', [
        ['01-04-2026', 'KL 70 J 0665', 58.59, 94.51, 5537.34, 'CHITHRAPUZHA EKM'],
        ['01-04-2026', 'KL 09 AW 6791', 24.21, 95.71, 2317.86, 'PERINTHALMANNA'],
        ['02-04-2026', 'KL 09 AX 2744', 25.68, 95.74, 2458.6, 'PERINTHALMANNA'],
    ], ['', 'TOTAL', 108.48, '', 10313.8, '']);
    // Dates as real date cells, amount as a formula, totals row with sums only
    monthSheet(wb, 'MAY 2026', [
        [new Date(Date.UTC(2026, 4, 1)), 'KL 70 J 0665', 40, 95, { formula: 'C3*D3', result: 3800 }, 'PALAZHI'],
        [new Date(Date.UTC(2026, 4, 31)), 'KL09AX2744', 20, 95, 1900, 'PALAZHI'],
    ], [null, null, 60, null, 5700, null]);
    // One vehicle that is not in the fleet
    monthSheet(wb, 'JUNE 2026', [
        ['01-06-2026', 'KL 70 J 0665', 30, 96, 2880, 'PALAZHI'],
        ['02-06-2026', 'KL 99 ZZ 0001', 10, 96, 960, 'PALAZHI'],
    ]);
    monthSheet(wb, 'JULY 2026', []);                         // a month not filled in yet
    wb.addWorksheet('NOTES').addRow(['Prepared by accounts']); // not a register sheet

    const uploaded = new ExcelJS.Workbook();
    await uploaded.xlsx.load(await wb.xlsx.writeBuffer() as any);

    const { rows, sheetsRead } = readFuelRegister(uploaded, matchVehicle);

    assert.strictEqual(sheetsRead, 4, 'the four month sheets are read, the notes sheet is passed over');
    const bySheet = (name: string) => rows.filter(r => r.sheetName === name);
    assert.strictEqual(bySheet('APRIL 2026').length, 3, 'April: 3 fillings, totals row left out');
    assert.strictEqual(bySheet('MAY 2026').length, 2, 'May is read too, totals row left out');
    assert.strictEqual(bySheet('JUNE 2026').length, 2, 'June is read too');
    assert.strictEqual(bySheet('JULY 2026').length, 0, 'an empty month adds nothing');
    assert.strictEqual(rows.length, 7);

    assert.deepStrictEqual(rows.map(r => r.formattedDate),
        ['2026-04-01', '2026-04-01', '2026-04-02', '2026-05-01', '2026-05-31', '2026-06-01', '2026-06-02'],
        'dates read the same whether typed as text or as dates');

    const may1 = bySheet('MAY 2026')[0];
    assert.strictEqual(may1.amount, 3800, 'a formula amount is read as its value');
    assert.strictEqual(bySheet('MAY 2026')[1].vehicleId, 'veh-3', 'vehicle matched without spaces');

    const valid = rows.filter(r => r.isValid);
    assert.strictEqual(valid.length, 6);
    const bad = rows.find(r => !r.isValid);
    assert.ok(bad && bad.sheetName === 'JUNE 2026' && /not found in registered fleet/.test(bad.errors.join()), 'the unknown vehicle is flagged, with its sheet');
    assert.strictEqual(Number(valid.reduce((s, r) => s + r.liters, 0).toFixed(2)), 198.48);

    // A file that is not a register at all
    const other = new ExcelJS.Workbook();
    other.addWorksheet('Sheet1').addRow(['Name', 'Phone']);
    assert.strictEqual(readFuelRegister(other, matchVehicle).sheetsRead, 0);

    console.log('fuel-register-import: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
