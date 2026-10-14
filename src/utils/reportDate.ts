/**
 * Dates in exported reports: always dd-mm-yyyy, whatever the browser's locale.
 * A plain date ("2026-09-25") is read as written, never shifted by time zone.
 */
const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-09-25" or "2026-09-25T…" -> "25-09-2026". Empty -> "". */
export const reportDate = (v?: string | Date | null): string => {
    if (!v) return '';
    const m = typeof v === 'string' ? v.match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

/** A moment ("2026-09-25T09:00:00Z") -> "25-09-2026 14:30" in local time. Empty -> "". */
export const reportDateTime = (v?: string | Date | null): string => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : `${reportDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
