/** Self-check: npx tsx src/utils/reportDate.check.ts */
import assert from 'assert';
import { reportDate, reportDateTime } from './reportDate';

assert.strictEqual(reportDate('2026-09-25'), '25-09-2026', 'plain date');
assert.strictEqual(reportDate('2026-10-10T00:00:00+00:00'), '10-10-2026', 'date with time part keeps its own day');
assert.strictEqual(reportDate(''), '');
assert.strictEqual(reportDate(null), '');
assert.strictEqual(reportDate(new Date(2026, 0, 5)), '05-01-2026', 'Date object');
assert.match(reportDateTime('2026-09-25T09:00:00Z'), /^\d{2}-\d{2}-2026 \d{2}:\d{2}$/, 'date and time');
console.log('report-date: all checks passed');
