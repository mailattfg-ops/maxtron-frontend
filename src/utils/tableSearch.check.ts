/**
 * Self-check for the table search. From maxtron-frontend:
 *
 *   npx tsx src/utils/tableSearch.check.ts
 */
import assert from 'assert';
import { matchesSearch, searchRows } from './tableSearch';

const FIELDS = ['hce_code', 'hce_name', 'hce_place', 'branch_name'];
const hces = [
    { hce_code: '1825', hce_name: 'UHWC THUTHIYOOR', hce_place: 'NEAR SREEKRISHNA TEMPLE', branch_name: 'ERNAKULAM' },
    { hce_code: '31', hce_name: 'SREEKRISHNA HOMEO HOSPITAL', hce_place: '', branch_name: 'THIRUVALLA' },
    { hce_code: '1038', hce_name: 'SREEKRISHNA LAB KARUVATTA', hce_place: 'KARUVATTA', branch_name: 'THIRUVALLA' },
    { hce_code: '310', hce_name: 'CITY CLINIC 31', hce_place: null, branch_name: 'ERNAKULAM' },
    { hce_code: '77', hce_name: 'ST 31 CLINIC', hce_place: 'ERNAKULAM', branch_name: 'ERNAKULAM' },
];
const codes = (query: string) => searchRows(hces, query, FIELDS).map(h => h.hce_code);

// A name match comes before a place match
assert.deepStrictEqual(codes('sreekri'), ['31', '1038', '1825']);
// A code comes before names holding the same digits: exact, then start, then the names
assert.deepStrictEqual(codes('31'), ['31', '310', '77']);
assert.deepStrictEqual(codes('1038'), ['1038']);
// Code and name together, in either order
assert.deepStrictEqual(codes('1038 sreekrishna'), ['1038']);
assert.deepStrictEqual(codes('sreekrishna 1038'), ['1038']);
// Name and code count the same, whichever a page lists first
const routes = [
    { route_name: 'EKM KTM', route_code: 'KTM-', branch_name: 'KTM' },
    { route_name: 'KTM MCH', route_code: 'MCH', branch_name: 'KOTTAYAM' },
    { route_name: 'ALP-TVLA-KTM', route_code: 'TVL', branch_name: 'ALP' },
    { route_name: 'KTM-2 to PLANT', route_code: 'KTM', branch_name: 'KOTTAYAM' },
    { route_name: 'PTA', route_code: 'PTA', branch_name: 'KTM' },
];
const routeNames = (query: string, fields: string[]) => searchRows(routes, query, fields).map(r => r.route_name);
const ktm = ['KTM-2 to PLANT', 'EKM KTM', 'KTM MCH', 'ALP-TVLA-KTM', 'PTA'];
assert.deepStrictEqual(routeNames('ktm', ['route_name', 'route_code', 'branch_name']), ktm);
assert.deepStrictEqual(routeNames('ktm', ['route_code', 'route_name', 'branch_name']), ktm);

// Spaces around the words change nothing
assert.deepStrictEqual(codes('  sreekri '), ['31', '1038', '1825']);
// Nothing typed: every row, in its own order, and the data is left unsorted
assert.deepStrictEqual(codes(''), ['1825', '31', '1038', '310', '77']);
assert.strictEqual(hces[0].hce_code, '1825');
// Nested fields, and empty values, are read safely
assert.strictEqual(matchesSearch({ customers: { customer_name: 'Asha' } }, 'ash', ['customers.customer_name']), true);
assert.strictEqual(matchesSearch({ customers: null }, 'ash', ['customers.customer_name']), false);

console.log('tableSearch: all checks passed');
