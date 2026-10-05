/**
 * Self-check for the payroll import cell readers. From maxtron-frontend:
 *
 *   npx tsx src/utils/payrollImport.check.ts
 */
import assert from 'assert';
import { plainCell, monthOf, yearOf, amountOf, dateOf } from './payrollImport';

const d = new Date(Date.UTC(2026, 9, 5)); // 5 Oct 2026, as exceljs reads a date cell

// Month: a number, a name, or a date. Never NaN.
for (const v of [10, '10', ' 10 ', 'October', 'october', 'OCT', 'Oct-2026', 'October 2026', d]) assert.strictEqual(monthOf(v), 10, `month from ${String(v)}`);
assert.strictEqual(monthOf('Sept'), 9);
assert.strictEqual(monthOf(1), 1);
assert.strictEqual(monthOf(12), 12);
for (const v of [0, 13, 10.5, '', null, undefined, 'xyz', 'Oc']) assert.strictEqual(monthOf(v), null, `no month in ${String(v)}`);

// Year
for (const v of [2026, '2026', 'Oct-2026', '2026-27', d]) assert.strictEqual(yearOf(v), 2026, `year from ${String(v)}`);
for (const v of ['', null, 26, 'abc', 120261]) assert.strictEqual(yearOf(v), null, `no year in ${String(v)}`);

// Amounts: 0 is a value, blank is not
assert.strictEqual(amountOf(20000), 20000);
assert.strictEqual(amountOf('20,000'), 20000);
assert.strictEqual(amountOf('Rs. 20,000.50'), 20000.5);
assert.strictEqual(amountOf('₹ 1,500'), 1500);
assert.strictEqual(amountOf(0), 0);
assert.strictEqual(amountOf('0'), 0);
assert.strictEqual(amountOf('-250'), -250);
for (const v of ['', null, undefined, 'abc', NaN]) assert.strictEqual(amountOf(v), null, `no amount in ${String(v)}`);

// Dates
assert.strictEqual(dateOf(d), '2026-10-05');
assert.strictEqual(dateOf('2026-10-05'), '2026-10-05');
assert.strictEqual(dateOf('05-10-2026'), '2026-10-05');
assert.strictEqual(dateOf('5/10/2026'), '2026-10-05');
for (const v of ['', null, 'soon', 'Mon Oct 05 2026 05:30:00 GMT+0530 (India Standard Time)']) assert.strictEqual(dateOf(v), null);

// Formula and rich-text cells
assert.strictEqual(plainCell({ formula: 'A1*2', result: 20000 }), 20000);
assert.strictEqual(plainCell({ richText: [{ text: 'Octo' }, { text: 'ber' }] }), 'October');
assert.strictEqual(plainCell({ text: 'EMP-1111', hyperlink: 'x' }), 'EMP-1111');
assert.strictEqual(plainCell({ error: '#N/A' }), null);
assert.strictEqual(plainCell(d), d);
assert.strictEqual(plainCell(10), 10);
assert.strictEqual(monthOf(plainCell({ richText: [{ text: 'Octo' }, { text: 'ber' }] })), 10);

console.log('payroll-import: all checks passed');
