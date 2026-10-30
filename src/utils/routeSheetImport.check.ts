/**
 * Self-check for reading a route sheet. From maxtron-frontend:
 *
 *   npx tsx src/utils/routeSheetImport.check.ts
 *
 * Builds a workbook laid out like the Ernakulam route sheet (a sheet per set
 * of days, routes side by side as SL NO | HCF NAME | AFF NO blocks under a
 * title), saves and reloads it as an upload would, and reads it back.
 */
import assert from 'assert';
import ExcelJS from 'exceljs';
import { readRouteSheet, matchRouteSheet, frequencyOf, codeKey } from './routeSheetImport';

(async () => {
    const wb = new ExcelJS.Workbook();
    const monThu = wb.addWorksheet('MON&THU');
    monThu.getCell('A1').value = 'EKM 1 MONDAY&THURSDAY';
    monThu.getCell('G1').value = 'EKM 2 MONDAY&THURSDAY';
    monThu.getRow(2).values = ['SL NO', 'HCF NAME ', 'AFF NO', null, null, null, 'SL NO', 'HCF NAME ', 'AFF NO'];
    monThu.getRow(3).values = [1, 'HEALTH CARE DIAGNOSTIC', 1428, null, null, null, 1, 'TOYO ENG', 2194];
    monThu.getRow(4).values = [2, 'DISTRICT HOSPITAL ALUVA', '00078', null, null, null, 2, 'NOT REGISTERED', 9999];
    monThu.getRow(5).values = [3, 'LISSI HOSPITAL', null, null, null, null, 3, 'TOYO ENG AGAIN', 2194];
    const sunday = wb.addWorksheet('SUNDAY');
    sunday.getCell('B1').value = 'EKM 1 SUNDAY ROUTE';
    sunday.getRow(2).values = ['SL NO', 'HCF NAME', 'AFF.NO'];
    sunday.getRow(3).values = [1, 'TALUK HOSPITAL PIRAVOM', 85];

    const uploaded = new ExcelJS.Workbook();
    await uploaded.xlsx.load(await wb.xlsx.writeBuffer() as any);
    const blocks = readRouteSheet(uploaded);

    assert.deepStrictEqual(blocks.map(b => [b.route, b.days.join('/')]),
        [['EKM 1', 'Monday/Thursday'], ['EKM 2', 'Monday/Thursday'], ['EKM 1', 'Sunday']], 'a list per route and set of days');
    assert.deepStrictEqual(blocks[0].rows.map(r => r.code), ['1428', '00078', ''], 'rows in the sheet order, blank code kept');
    assert.strictEqual(blocks[0].rows[2].name, 'LISSI HOSPITAL', 'a row with no AFF NO is still read');

    const ekm = 'branch-ekm';
    const routes = [
        { id: 'r1', route_name: 'EKM- 1', route_code: 'EKM', branch_id: ekm },
        { id: 'r2', route_name: 'EKM-2', route_code: 'EKM-2', branch_id: ekm },
    ];
    const hces = [
        { id: 'h1428', hce_code: '1428', branch_id: ekm },
        { id: 'h78', hce_code: '78', branch_id: ekm },
        { id: 'h2194', hce_code: '2194', branch_id: ekm },
        { id: 'h85', hce_code: '85', branch_id: ekm },
        { id: 'tvla9999', hce_code: '9999', branch_id: 'branch-tvla' },
    ];
    const plan = matchRouteSheet(blocks, routes, hces);
    assert.deepStrictEqual(plan.map(p => p.target?.id), ['r1', 'r2', 'r1'], '"EKM 1" is route "EKM- 1"');
    assert.deepStrictEqual(plan[0].items, [{ hce_id: 'h1428' }, { hce_id: 'h78' }], 'AFF NO 00078 is HCE code 78');
    assert.deepStrictEqual(plan[0].missing.map(r => r.name), ['LISSI HOSPITAL'], 'no AFF NO: cannot be registered, listed');
    assert.deepStrictEqual(plan[1].items, [
        { hce_id: 'h2194' },
        { hce_code: '9999', hce_name: 'NOT REGISTERED' },
        { hce_id: 'h2194' },
    ], 'sheet order kept; a facility listed twice stays twice; an unregistered one is registered in its place');
    assert.deepStrictEqual(plan[1].toRegister.map(r => r.code), ['9999'], 'another branch\'s HCE is not matched');

    assert.strictEqual(frequencyOf(['Monday', 'Thursday']), 'Alternate days');
    assert.strictEqual(frequencyOf(['Sunday']), 'Once a Week');
    assert.strictEqual(frequencyOf(['Monday', 'Wednesday', 'Friday']), 'Thrice a Week');
    assert.strictEqual(codeKey(78), '78');

    console.log('route-sheet-import: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
