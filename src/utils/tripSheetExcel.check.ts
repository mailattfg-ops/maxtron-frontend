/**
 * Self-check for the trip sheet export. From maxtron-frontend:
 *
 *   npx tsx src/utils/tripSheetExcel.check.ts
 *
 * Set OUT_DIR=<folder> to also write trip_sheet.xlsx to look at.
 */
import assert from 'assert';
import path from 'path';
import ExcelJS from 'exceljs';
import { buildTripSheetWorkbook, TripRow } from './tripSheetExcel';

const trip = (log_date: string, vehicle_no: string, vehicle_category: string, sheet: number, route: string, s: number, e: number | null, start: string, end: string | null, driver = 'JEEVANANTHAM'): TripRow =>
    ({ log_date, vehicle_no, vehicle_category, sheet_number: sheet, route, start_km: s, end_km: e, start_time: start, end_time: end, driver, supervisor: 'RENJITH K K' });

(async () => {
    const rows = [
        trip('2026-09-17', 'KL-09-AX-2744', 'LCV', 2, 'MPM-1', 354684, 354913, '07:52:00', '21:03:00'),
        trip('2026-09-16', 'KL-09-AX-2744', 'LCV', 1, 'MPM-1', 354490, 354684, '07:44:00', '21:58:00'),
        trip('2026-09-16', 'KL-70-H-4621', 'LCV', 2, 'LF ANGAMALY', 174035, 174122, '20:00:00', '23:27:00', 'VISHNU PC'),
        { ...trip('2026-09-21', 'KL-70-H-3795', 'Pickup', 6, 'IDUKKI', 167796, 168191, '07:25:00', '22:20:00', ''), spare_driver: 'RIYAS', running: true, fuel_qty: 30 },
        trip('2026-09-28', 'KL-09-AX-2744', 'LCV', 11, 'MPM-1', 356760, null, '07:42:00', null), // trip still open
        trip('2026-09-20', 'KL-07-X-1', 'HCV', 1, 'TSR', 1000, 1100, '06:00:00', '18:00:00'),
    ];
    const wb = buildTripSheetWorkbook(rows, { from: '2026-09-16', to: '2026-09-30' });

    assert.deepStrictEqual(wb.worksheets.map(w => w.name), ['LCV', 'PICK UP', 'HCV'], 'a sheet per vehicle type, in the client order');
    const lcv = wb.getWorksheet('LCV')!;
    assert.strictEqual(lcv.getCell('E5').value, '16.09.2026 TO 30.09.2026', 'period');
    assert.strictEqual(lcv.getCell('B6').value, 'LCV LIKE TATA 407 FOR 36 MONTHS');
    assert.strictEqual(lcv.getCell('H7').value, 'VEHICLE REG. NO.');
    // vehicle by vehicle, date order within each
    assert.deepStrictEqual([8, 9, 10, 11].map(r => [lcv.getCell(r, 8).value, (lcv.getCell(r, 2).value as Date).toISOString().slice(0, 10)]),
        [['KL-09-AX-2744', '2026-09-16'], ['KL-09-AX-2744', '2026-09-17'], ['KL-09-AX-2744', '2026-09-28'], ['KL-70-H-4621', '2026-09-16']]);
    assert.strictEqual((lcv.getCell('G8').value as any).formula, 'F8-E8');
    assert.strictEqual((lcv.getCell('G8').value as any).result, 194);
    assert.strictEqual(lcv.getCell('G10').value, null, 'an open trip has no total km');
    assert.ok(Math.abs((lcv.getCell('L8').value as number) - (7 * 60 + 44) / 1440) < 1e-9, 'start time is an Excel time');
    assert.strictEqual(lcv.getCell('L8').numFmt, 'hh:mm');
    assert.strictEqual(lcv.getCell('A12').value, 'TOTAL :');
    assert.deepStrictEqual(lcv.getCell('G12').value, { formula: 'SUM(G8:G11)', result: 194 + 229 + 87 });
    const pickup = wb.getWorksheet('PICK UP')!;
    assert.strictEqual(pickup.getCell('J8').value, null, 'no driver: driver name stays empty');
    assert.strictEqual(pickup.getCell('N8').value, 'RIYAS', 'the spare driver is in SPARE DRIVER');
    assert.strictEqual(pickup.getCell('Q8').value, 'YES');
    assert.strictEqual(pickup.getCell('R8').value, 30);
    assert.strictEqual((lcv.getCell('D10').border.bottom as any).style, 'thick', 'heavy line under the last trip of a vehicle');
    assert.strictEqual((lcv.getCell('D9').border.bottom as any).style, 'thin', 'thin lines inside a vehicle');
    assert.strictEqual(lcv.getCell('N7').value, 'SPARE DRIVER', 'the system columns follow the client columns');
    assert.strictEqual(lcv.getCell('W7').value, 'BILL AMT');

    if (process.env.OUT_DIR) {
        await wb.xlsx.writeFile(path.join(process.env.OUT_DIR, 'trip_sheet.xlsx'));
        console.log('wrote trip_sheet.xlsx');
    }
    void ExcelJS;
    console.log('trip-sheet-excel: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
