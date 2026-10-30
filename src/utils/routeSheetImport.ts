import type { Workbook } from 'exceljs';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** One route's list for one set of days, as the sheet gives it, in the sheet's order. */
export type RouteSheetBlock = {
    sheet: string;
    title: string;   // "EKM 1 MONDAY&THURSDAY"
    route: string;   // "EKM 1"
    days: string[];  // ["Monday", "Thursday"]
    rows: { sl: string; name: string; code: string }[];
};

/** A word that names a day: MON, MONDAY, THU, THURSDAY... */
const DAY_WORD = /\b(MON|TUE|WED|THU|FRI|SAT|SUN)[A-Z]*/g;
const SL_NO = /^SL\.?\s*NO/i;

const cellText = (cell: any): string => {
    const v = cell?.value;
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        if (v.richText) return v.richText.map((t: any) => t.text).join('').trim();
        if (v.result !== undefined) return String(v.result).trim();
        if (v.text !== undefined) return String(v.text).trim();
    }
    return String(v).trim();
};

/**
 * Reads a route sheet: one sheet per set of days, the routes side by side,
 * each a block of SL NO | HCF NAME | AFF NO columns under a title naming the
 * route and its days ("EKM 1 MONDAY&THURSDAY", "EKM 1 SUNDAY ROUTE"). The
 * sheet's name counts for the days too ("MON&THU").
 */
export function readRouteSheet(workbook: Workbook): RouteSheetBlock[] {
    const blocks: RouteSheetBlock[] = [];
    for (const ws of workbook.worksheets) {
        const text = (r: number, c: number) => cellText(ws.getRow(r).getCell(c));
        let header = 0;
        for (let r = 1; r <= Math.min(ws.rowCount, 10) && !header; r++) {
            for (let c = 1; c <= ws.columnCount; c++) if (SL_NO.test(text(r, c))) { header = r; break; }
        }
        if (!header) continue;

        for (let c = 1; c <= ws.columnCount; c++) {
            if (!SL_NO.test(text(header, c))) continue;
            const codeCol = [c + 1, c + 2, c + 3].find(i => /AFF/i.test(text(header, i)));
            if (!codeCol) continue;

            // The title: the nearest text above the block's columns
            let title = '';
            for (let r = header - 1; r >= 1 && !title; r--) {
                for (let i = c; i <= codeCol && !title; i++) title = text(r, i);
            }
            const words = `${title} ${ws.name}`.toUpperCase().match(DAY_WORD) || [];
            const days = DAYS.filter(d => words.some(w => w.startsWith(d.slice(0, 3).toUpperCase())));
            const firstDay = title.toUpperCase().search(DAY_WORD);
            const route = (firstDay >= 0 ? title.slice(0, firstDay) : title).trim();

            const rows: RouteSheetBlock['rows'] = [];
            for (let r = header + 1; r <= ws.rowCount; r++) {
                const name = codeCol > c + 1 ? text(r, c + 1) : '';
                const code = text(r, codeCol);
                if (name || code) rows.push({ sl: text(r, c), name, code });
            }
            blocks.push({ sheet: ws.name, title, route, days, rows });
        }
    }
    return blocks;
}

/** An HCE code as the registry compares it: digits without leading zeros ("00078" is 78). */
export const codeKey = (v: unknown) => String(v ?? '').trim().replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');

/** Route names compared without spaces or dashes, so the sheet's "EKM 1" is route "EKM- 1". */
export const routeKey = (v: unknown) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** The frequency a set of days stands for, in the route form's terms. */
export const frequencyOf = (days: string[]) =>
    ({ 1: 'Once a Week', 2: 'Alternate days', 3: 'Thrice a Week' } as Record<number, string>)[days.length] || 'Daily';

/** A list entry: an HCE already registered, or one to register from the sheet's name and AFF NO. */
export type RouteSheetItem = { hce_id: string } | { hce_code: string; hce_name: string };

/**
 * Matches each block to its route (by name, else by code) and each row to the
 * HCE of that route's branch with that AFF NO, keeping the sheet's order. A
 * facility listed twice stays twice. A row whose AFF NO is not registered yet
 * becomes an HCE to register (`toRegister`); a row without an AFF NO or a name
 * cannot be, and is listed in `missing`, never dropped silently.
 */
export function matchRouteSheet(blocks: RouteSheetBlock[], routes: any[], hces: any[]) {
    return blocks.map(block => {
        const target = routes.find(r => routeKey(r.route_name) === routeKey(block.route))
            || routes.find(r => routeKey(r.route_code) === routeKey(block.route));
        const byCode = new Map(hces.filter(h => target && h.branch_id === target.branch_id).map(h => [codeKey(h.hce_code), h]));
        const items: RouteSheetItem[] = [];
        const toRegister: RouteSheetBlock['rows'] = [];
        const missing: RouteSheetBlock['rows'] = [];
        for (const row of block.rows) {
            const hce = codeKey(row.code) ? byCode.get(codeKey(row.code)) : undefined;
            if (hce) items.push({ hce_id: hce.id });
            else if (codeKey(row.code) && row.name) {
                items.push({ hce_code: row.code, hce_name: row.name });
                toRegister.push(row);
            } else missing.push(row);
        }
        return { ...block, target, items, toRegister, missing };
    });
}
