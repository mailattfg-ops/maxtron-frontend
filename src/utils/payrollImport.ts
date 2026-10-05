/**
 * Reading cells of a payroll import sheet, shared by the KEIL and Polybag
 * payroll pages.
 *
 * Each reader answers null when the cell cannot be read, so the page can list
 * that row as an error. They used to be `Number(cell)`, which turns "October"
 * or "20,000" into NaN, NaN into null on the way to the server, and the whole
 * import into a database error.
 */

/** Plain value of an Excel cell: a formula gives its result, rich text its text. */
export const plainCell = (v: any): any => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
        if (v.result !== undefined) return v.result;
        if (v.richText) return v.richText.map((t: any) => t.text).join('');
        if (v.text !== undefined) return v.text;
        return null;
    }
    return v;
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** Month 1-12 from 10, "10", "October", "Oct", "Oct-2026" or a date cell. */
export const monthOf = (v: any): number | null => {
    if (v instanceof Date) return v.getUTCMonth() + 1; // exceljs reads dates as UTC
    const text = String(v ?? '').trim().toLowerCase();
    if (text !== '' && !isNaN(Number(text))) {
        const n = Number(text);
        return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
    }
    const word = text.match(/[a-z]{3,}/)?.[0];
    const idx = word ? MONTHS.findIndex(m => m.startsWith(word)) : -1;
    return idx > -1 ? idx + 1 : null;
};

/** Four-digit year from 2026, "2026", "Oct-2026" or a date cell. */
export const yearOf = (v: any): number | null => {
    if (v instanceof Date) return v.getUTCFullYear();
    const m = String(v ?? '').match(/(?<!\d)(20\d{2})(?!\d)/);
    return m ? Number(m[1]) : null;
};

/** Amount from 20000, "20,000" or "Rs. 20,000.50". Blank or unreadable is null, never NaN. */
export const amountOf = (v: any): number | null => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const text = String(v ?? '').replace(/^[^0-9-]+/, '').replace(/[^0-9.-]/g, '');
    return text === '' || isNaN(Number(text)) ? null : Number(text);
};

/** yyyy-mm-dd from a date cell or from text already in that form. */
export const dateOf = (v: any): string | null => {
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().split('T')[0];
    const text = String(v ?? '').trim();
    const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
};
