/**
 * Self-check for the KEIL salary front sheet. From maxtron-frontend:
 *   npx tsx src/utils/payrollSheet.check.ts
 * Set SALARY_FILE=<xlsx> (and EMPLOYEES=<json>) to also read a real sheet;
 * set OUT_DIR=<folder> to write the exported sample.
 */
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { writeSalaryFrontSheet, readSalaryFrontSheet, matchEmployee } from './payrollSheet';

const employees = [
    { id: 'e1', name: 'JEEVANANTHAM' }, { id: 'e2', name: 'AKHIL M' }, { id: 'e3', name: 'JISHNU' },
    { id: 'e4', name: 'BIJU K' }, { id: 'e5', name: 'BIJU TEST' }, { id: 'e6', name: 'AJITH P' },
];
const defaults = { month: 10, year: 2026, companyId: 'keil' };

(async () => {
    // Names
    assert.strictEqual(matchEmployee('JISHNU', employees)?.id, 'e3', 'same name');
    assert.strictEqual(matchEmployee('JEEVA', employees)?.id, 'e1', 'start of the name');
    assert.strictEqual(matchEmployee('akhil', employees)?.id, 'e2', 'any case');
    assert.strictEqual(matchEmployee('BIJU', employees), null, 'two BIJUs: no guess');
    assert.strictEqual(matchEmployee('RIYAS', employees), null, 'not an employee');

    // Export -> save -> upload: the same people and amounts come back
    const wb = new ExcelJS.Workbook();
    writeSalaryFrontSheet(wb, [
        { name: 'JEEVANANTHAM', designation: 'DRIVER', duty: 27, salary: 30060, advance: 2500, penalty: 0, contractor: '' },
        { name: 'RIYAS', designation: 'DRIVER', duty: 3, salary: 3000, advance: 0, penalty: 250, contractor: 'RAJESH' },
        { name: 'AJITH P', designation: 'PICKER', duty: 3, salary: 1660, advance: 0, penalty: 0, contractor: '' },
    ], 9, 2026);
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(await wb.xlsx.writeBuffer() as any);
    const ws = back.worksheets[0];
    assert.strictEqual(ws.getCell('A2').value, 'KEIL SALARY DRIVERS SEP 2026');
    assert.deepStrictEqual((ws.getRow(3).values as any[]).slice(1), ['SL NO', 'NAME', 'DESIGNATION', 'DUTY', 'SALARY', 'ADVANCE', 'PENALTY', 'TOTAL']);
    assert.strictEqual(ws.getCell('I5').value, 'RAJESH', 'contractor beside the spare driver');
    assert.deepStrictEqual(ws.getCell('H5').value, { formula: 'E5-F5-G5', result: 2750 });
    assert.strictEqual(ws.getCell('A6').value, 'TOTAL');
    assert.strictEqual(ws.getCell('A8').value, 'KEIL SALARY PICKERS SEP 2026', 'pickers in their own section');

    const { rows, notes } = readSalaryFrontSheet(ws, employees, defaults);
    assert.deepStrictEqual(rows.map(r => [r.employee_id, r.worker_name, r.designation, r.month, r.year, r.no_of_duties, r.basic_salary, r.advance, r.penalty, r.net_salary, r.remarks]), [
        ['e1', null, 'DRIVER', 9, 2026, 27, 30060, 2500, 0, 27560, null],
        [null, 'RIYAS', 'DRIVER', 9, 2026, 3, 3000, 0, 250, 2750, 'RAJESH'],
        ['e6', null, 'PICKER', 9, 2026, 3, 1660, 0, 0, 1660, null],
    ]);
    assert.deepStrictEqual(notes, []);

    if (process.env.OUT_DIR) await wb.xlsx.writeFile(path.join(process.env.OUT_DIR, 'salary_front_sheet.xlsx'));

    if (process.env.SALARY_FILE) {
        const real = new ExcelJS.Workbook();
        await real.xlsx.readFile(process.env.SALARY_FILE);
        const emps = process.env.EMPLOYEES ? JSON.parse(fs.readFileSync(process.env.EMPLOYEES, 'utf8')) : employees;
        const r = readSalaryFrontSheet(real.worksheets[0], emps, defaults);
        const spare = r.rows.filter(x => x.is_spare);
        console.log(`real sheet -> ${r.rows.length} people (${r.rows.length - spare.length} employees, ${spare.length} spare), month ${r.rows[0]?.month}/${r.rows[0]?.year}`);
        console.log('  totals: salary', r.rows.reduce((s, x) => s + x.basic_salary, 0), '| advance', r.rows.reduce((s, x) => s + x.advance, 0), '| penalty', r.rows.reduce((s, x) => s + x.penalty, 0), '| net', r.rows.reduce((s, x) => s + x.net_salary, 0));
        r.notes.forEach(n => console.log('  note:', n));
    }
    console.log('salary-front-sheet: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
