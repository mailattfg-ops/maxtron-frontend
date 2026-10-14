import ExcelJS from 'exceljs';

/**
 * The KEIL trip sheet in the client's own format (their file
 * "TRIP_SHEET_1 6TO30_SEP_2026"): one sheet per vehicle type, each with the
 * contract header, a numbered vehicle-type line, the trip table and a total.
 */

// Contract details printed at the top of every sheet, as on the client's sheet.
const CONTRACTOR = 'MAXTRON ASSOCIATES';
const WORK = 'COLLECTION AND TRANSPORTATION OF BIO MEDICAL \n WASTE FOR MEDICAL WASTE TREATMENT FACILITY CBWTF AT KEIL';
const WO_NO = 3800000536;
const WO_DATE = new Date(Date.UTC(2024, 8, 3)); // 03-09-2024

/** Sheet order, number and heading for each vehicle type, as on the client's sheet. */
const TYPES: Record<string, { sheet: string; no: number; title: string }> = {
    LCV: { sheet: 'LCV', no: 1, title: 'LCV LIKE TATA 407 FOR 36 MONTHS' },
    PICKUP: { sheet: 'PICK UP', no: 2, title: 'PICK UP' },
    HCV: { sheet: 'HCV', no: 3, title: 'HEAVY VEHICLE (HCV) 17FT' },
};
const typeOf = (category: string) => {
    const key = String(category || '').toUpperCase().replace(/[^A-Z]/g, '');
    return TYPES[key] || { sheet: (category || 'OTHER').toUpperCase().slice(0, 31), no: 4, title: (category || 'OTHER').toUpperCase() };
};

const HEADERS = ['SL NO', 'DATE', 'TRIP \n SHEET\n  NO', 'DISTRICT', 'STARTING\n  KM', 'CLOSING\n  KM', 'TOTAL KM',
    'VEHICLE REG. NO.', 'REMARK', 'DRIVER NAME', 'SUPERVISOR NAME', 'STARTING TIME', 'ENDING TIME',
    // Kept from the system's own trip sheet, after the client's columns
    'SPARE DRIVER', 'SPARE PICKER', 'SCHEDULE TIME', 'RUNNING STATUS', 'FUEL (LTR)', 'COMPLAINT', 'COMPLAINT TYPE',
    'WORKSHOP IN', 'WORKSHOP OUT', 'BILL AMT'];
const WIDTHS = [7.13, 13, 8.13, 26, 11, 11, 10.5, 15.38, 12, 20.63, 17.25, 10.5, 10.5,
    20, 18, 10.5, 10.5, 9, 13, 16, 18, 18, 11];

const FONT = { name: 'Calibri', size: 12, color: { argb: 'FF000000' } };
const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
const ALL_SIDES = { top: THIN, left: THIN, bottom: THIN, right: THIN };

/** "2026-09-16" -> the date as an Excel date cell. */
const dateCell = (s: string) => {
    const [y, m, d] = String(s || '').slice(0, 10).split('-').map(Number);
    return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : null;
};
/** "07:30:00" -> an Excel time (a fraction of a day), shown as hh:mm. */
const timeCell = (s: string) => {
    const m = String(s || '').match(/^(\d{1,2}):(\d{2})/);
    return m ? (Number(m[1]) * 60 + Number(m[2])) / 1440 : null;
};
/** "2026-09-16" -> "16.09.2026" */
const dotted = (s: string) => String(s || '').slice(0, 10).split('-').reverse().join('.');

export type TripRow = {
    log_date: string; sheet_number?: string | number | null; route?: string; start_km?: number | null; end_km?: number | null;
    vehicle_no: string; vehicle_category: string; remarks?: string; driver?: string; supervisor?: string;
    start_time?: string | null; end_time?: string | null;
    spare_driver?: string; spare_picker?: string; schedule_time?: string | null; running?: boolean;
    fuel_qty?: number | null; complaint?: boolean; complaint_type?: string;
    workshop_in?: string | null; workshop_out?: string | null; bill_amount?: number | null;
};

/** "2026-09-16T10:30:00" -> the moment as an Excel date-time, in local time like the old export. */
const dateTimeCell = (s?: string | null) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null
        : new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
};

export function buildTripSheetWorkbook(rows: TripRow[], period?: { from?: string; to?: string }): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook();
    const dates = rows.map(r => String(r.log_date).slice(0, 10)).filter(Boolean).sort();
    const periodText = `${dotted(period?.from || dates[0] || '')} TO ${dotted(period?.to || dates[dates.length - 1] || '')}`;

    // One sheet per vehicle type, in the client's order
    const groups = new Map<string, { type: ReturnType<typeof typeOf>; rows: TripRow[] }>();
    for (const r of rows) {
        const t = typeOf(r.vehicle_category);
        if (!groups.has(t.sheet)) groups.set(t.sheet, { type: t, rows: [] });
        groups.get(t.sheet)!.rows.push(r);
    }
    const ordered = [...groups.values()].sort((a, b) => a.type.no - b.type.no || a.type.sheet.localeCompare(b.type.sheet));

    for (const { type, rows: trips } of ordered) {
        const ws = wb.addWorksheet(type.sheet);
        ws.views = [{ state: 'normal' }]; // load-bearing on scaled displays, see quotationExcelGenerator
        WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

        // Contract header (rows 1-5): label in A:D, value from E
        const label = (r: number, text: string, v: ExcelJS.Alignment['vertical'] = 'bottom') => {
            ws.mergeCells(r, 1, r, 4);
            const c = ws.getCell(r, 1);
            c.value = text; c.font = { ...FONT, bold: true }; c.alignment = { horizontal: 'right', vertical: v };
        };
        const value = (r: number, v: ExcelJS.CellValue, toCol: number, opts: { v?: ExcelJS.Alignment['vertical']; fmt?: string; wrap?: boolean } = {}) => {
            if (toCol > 5) ws.mergeCells(r, 5, r, toCol);
            const c = ws.getCell(r, 5);
            c.value = v; c.font = { ...FONT, bold: true };
            c.alignment = { horizontal: 'left', vertical: opts.v || 'bottom', wrapText: !!opts.wrap };
            if (opts.fmt) c.numFmt = opts.fmt;
        };
        label(1, 'NAME OF THE CONTRACTOR :'); value(1, CONTRACTOR, 6);
        label(2, 'NAME OF THE WORK :', 'top'); value(2, WORK, 11, { v: 'top', wrap: true });
        ws.getRow(2).height = 33;
        label(3, 'WO NO :'); value(3, WO_NO, 6, { fmt: '0' }); // the whole number, not 3.8E+09
        label(4, 'WO DATE :'); value(4, WO_DATE, 5, { fmt: 'dd-mm-yy' });
        label(5, 'PERIOD :'); value(5, periodText, 5);

        // Row 6: vehicle-type number and heading, boxed
        const no = ws.getCell(6, 1);
        no.value = type.no; no.font = { ...FONT, bold: true }; no.alignment = { horizontal: 'center' };
        ws.mergeCells(6, 2, 6, 8);
        const title = ws.getCell(6, 2);
        title.value = type.title; title.font = { ...FONT, bold: true }; title.alignment = { horizontal: 'center' };
        for (let c = 1; c <= 8; c++) ws.getCell(6, c).border = ALL_SIDES;

        // Row 7: column headings, blue
        const head = ws.getRow(7);
        head.height = 50;
        HEADERS.forEach((h, i) => {
            const c = head.getCell(i + 1);
            c.value = h;
            c.font = { ...FONT, bold: true };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB4C6E7' } };
            c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            c.border = ALL_SIDES;
        });

        // Trips: vehicle by vehicle, each in date and time order
        trips.sort((a, b) => a.vehicle_no.localeCompare(b.vehicle_no)
            || String(a.log_date).localeCompare(String(b.log_date))
            || String(a.start_time || '').localeCompare(String(b.start_time || '')));
        const first = 8;
        trips.forEach((t, i) => {
            const r = first + i;
            const hasEnd = t.end_km !== null && t.end_km !== undefined && String(t.end_km) !== '';
            const values: ExcelJS.CellValue[] = [
                i + 1,
                dateCell(t.log_date),
                t.sheet_number === null || t.sheet_number === undefined || t.sheet_number === '' ? null
                    : (isNaN(Number(t.sheet_number)) ? String(t.sheet_number) : Number(t.sheet_number)),
                t.route || null,
                t.start_km ?? null,
                hasEnd ? Number(t.end_km) : null,
                hasEnd ? { formula: `F${r}-E${r}`, result: Number(t.end_km) - Number(t.start_km || 0) } : null,
                t.vehicle_no,
                t.remarks || null,
                t.driver || null,
                t.supervisor || null,
                timeCell(t.start_time || ''),
                timeCell(t.end_time || ''),
                t.spare_driver || null,
                t.spare_picker || null,
                timeCell(t.schedule_time || ''),
                t.running === undefined ? null : (t.running ? 'YES' : 'NO'),
                t.fuel_qty ? Number(t.fuel_qty) : null,
                t.complaint === undefined ? null : (t.complaint ? 'YES' : 'NO'),
                t.complaint_type || null,
                dateTimeCell(t.workshop_in),
                dateTimeCell(t.workshop_out),
                t.bill_amount ? Number(t.bill_amount) : null,
            ];
            values.forEach((v, j) => {
                const c = ws.getCell(r, j + 1);
                c.value = v;
                c.font = { ...FONT, bold: j === 7 };
                c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: j === 8 };
                c.border = ALL_SIDES;
            });
            // A heavy line under each vehicle's last trip, as the client's sheet
            // marks where one vehicle's trips end and the next begin
            if (trips[i + 1] && trips[i + 1].vehicle_no !== t.vehicle_no) {
                for (let c = 1; c <= HEADERS.length; c++) ws.getCell(r, c).border = { ...ALL_SIDES, bottom: { style: 'thick', color: { argb: 'FF000000' } } };
            }
            ws.getCell(r, 2).numFmt = 'dd-mm-yyyy';
            ws.getCell(r, 12).numFmt = 'hh:mm';
            ws.getCell(r, 13).numFmt = 'hh:mm';
            ws.getCell(r, 16).numFmt = 'hh:mm';
            ws.getCell(r, 21).numFmt = 'dd-mm-yyyy hh:mm';
            ws.getCell(r, 22).numFmt = 'dd-mm-yyyy hh:mm';
        });

        // Total row: TOTAL : across A:F, the sum of TOTAL KM, orange
        const last = first + trips.length - 1;
        const tr = last + 1;
        ws.mergeCells(tr, 1, tr, 6);
        const totalKm = trips.reduce((s, t) => s + (t.end_km !== null && t.end_km !== undefined && String(t.end_km) !== ''
            ? Number(t.end_km) - Number(t.start_km || 0) : 0), 0);
        const lab = ws.getCell(tr, 1);
        lab.value = 'TOTAL :';
        const sum = ws.getCell(tr, 7);
        sum.value = { formula: `SUM(G${first}:G${last})`, result: totalKm };
        for (let c = 1; c <= 7; c++) {
            const cell = ws.getCell(tr, c);
            cell.font = { ...FONT, bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
            cell.alignment = { horizontal: c === 7 ? 'center' : 'right', vertical: 'middle' };
            cell.border = ALL_SIDES;
        }

        ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '7:7' };
    }
    return wb;
}
