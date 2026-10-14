import type ExcelJS from 'exceljs';
import { plainCell, monthOf, yearOf, amountOf } from './payrollImport';

/**
 * The KEIL salary front sheet ("FRONT SHEET SALARY KEIL SEP 2026"), used for
 * the export, the sample template and the bulk upload alike:
 *
 *   KEIL SALARY DRIVERS SEP 2026
 *   SL NO | NAME | DESIGNATION | DUTY | SALARY | ADVANCE | PENALTY | TOTAL | (contractor)
 *   ...one row per person...
 *   TOTAL
 *   KEIL SALARY PICKERS SEP 2026
 *   ...
 *   AUTHORIZED SIGNATORY
 *
 * TOTAL = SALARY - ADVANCE - PENALTY. The unnamed last column is the contractor
 * who supplied a spare driver; it is kept as the row's remark. People found in
 * Employee Management (by name) are saved against that employee; everyone else
 * is a spare driver, saved under their own name.
 */

export const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** One person's line on the sheet. */
export type SalaryLine = {
    name: string; designation: string; duty: number; salary: number; advance: number; penalty: number; contractor: string;
};

const FONT = { name: 'Times New Roman', size: 20, bold: true };
const THIN: Partial<ExcelJS.Border> = { style: 'thin', color: { indexed: 64 } as any };
const MEDIUM: Partial<ExcelJS.Border> = { style: 'medium', color: { indexed: 64 } as any };
const HEADERS = ['SL NO', 'NAME', 'DESIGNATION', 'DUTY', 'SALARY', 'ADVANCE', 'PENALTY', 'TOTAL'];
const WIDTHS = [20.71, 46.29, 30.14, 20.71, 20.71, 20.71, 20.71, 20.71, 19.14];
/** Sections in the client's order; any other designation follows, A to Z. */
const ORDER = ['DRIVER', 'PICKER'];

const plural = (d: string) => (/S$/.test(d) ? d : `${d}S`);

/** Writes the front sheet for one month. */
export function writeSalaryFrontSheet(workbook: ExcelJS.Workbook, lines: SalaryLine[], month: number, year: number) {
    const ws = workbook.addWorksheet('DVR');
    ws.views = [{ state: 'normal', zoomScale: 70 }];
    WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 };

    const groups = new Map<string, SalaryLine[]>();
    for (const l of lines) {
        const d = (l.designation || 'OTHER').trim().toUpperCase();
        if (!groups.has(d)) groups.set(d, []);
        groups.get(d)!.push(l);
    }
    const designations = [...groups.keys()].sort((a, b) => {
        const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });

    const box = (r: number, c: number) => {
        const cell = ws.getCell(r, c);
        cell.font = FONT;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN };
        return cell;
    };

    let r = 1;
    ws.getRow(r).height = 19.5;
    designations.forEach((designation, gi) => {
        const people = groups.get(designation)!.sort((a, b) => a.name.localeCompare(b.name));
        const top = r + 1;

        // Title
        r++;
        ws.getRow(r).height = 35.1;
        ws.mergeCells(r, 1, r, 8);
        box(r, 1).value = `KEIL SALARY ${plural(designation)} ${MONTH_ABBR[month - 1]} ${year}`;
        for (let c = 2; c <= 8; c++) box(r, c);

        // Column headings
        r++;
        ws.getRow(r).height = 35.1;
        HEADERS.forEach((h, i) => { box(r, i + 1).value = h; });

        // People
        const first = r + 1;
        people.forEach((p, i) => {
            r++;
            ws.getRow(r).height = 35.1;
            const values = [i + 1, p.name, designation, p.duty || 0, p.salary || 0, p.advance || null, p.penalty || null];
            values.forEach((v, c) => { box(r, c + 1).value = v; });
            box(r, 8).value = { formula: `E${r}-F${r}-G${r}`, result: (p.salary || 0) - (p.advance || 0) - (p.penalty || 0) };
            if (p.contractor) {
                const note = ws.getCell(r, 9);
                note.value = p.contractor;
                note.font = { ...FONT, size: 14 };
                note.alignment = { horizontal: 'center', vertical: 'middle' };
            }
        });
        const last = r;

        // Total
        r++;
        ws.getRow(r).height = 35.1;
        ws.mergeCells(r, 1, r, 3);
        box(r, 1).value = 'TOTAL';
        for (let c = 2; c <= 3; c++) box(r, c);
        const sum = (col: string, pick: (l: SalaryLine) => number) =>
            ({ formula: `SUM(${col}${first}:${col}${last})`, result: people.reduce((s, l) => s + (pick(l) || 0), 0) });
        box(r, 4).value = sum('D', l => l.duty);
        box(r, 5).value = sum('E', l => l.salary);
        box(r, 6).value = sum('F', l => l.advance);
        box(r, 7).value = sum('G', l => l.penalty);
        box(r, 8).value = sum('H', l => l.salary - l.advance - l.penalty);

        // Heavier frame round the section, as on the client's sheet
        for (let row = top; row <= r; row++) {
            for (let c = 1; c <= 8; c++) {
                const cell = ws.getCell(row, c);
                const b = { ...(cell.border || {}) };
                if (row === top) b.top = MEDIUM;
                if (row === r) b.bottom = MEDIUM;
                if (c === 1) b.left = MEDIUM;
                if (c === 8) b.right = MEDIUM;
                cell.border = b;
            }
        }
        if (gi < designations.length - 1) { r++; ws.getRow(r).height = 19.5; }
    });

    // Signatures
    r += 2;
    for (const c of [2, 4, 7]) {
        const cell = ws.getCell(r, c);
        cell.value = 'AUTHORIZED SIGNATORY';
        cell.font = { ...FONT, size: 11 };
        cell.alignment = { horizontal: 'center' };
    }
    return ws;
}

type Employee = { id: string; name?: string };
const norm = (s: unknown) => String(s ?? '').toUpperCase().replace(/[^A-Z]/g, '');

/**
 * The employee a sheet name stands for: the same name, or else the one
 * employee whose name starts with it ("JEEVA" -> "JEEVANANTHAM"). No match, or
 * more than one, means not an employee.
 */
export function matchEmployee(name: string, employees: Employee[]): Employee | null {
    const n = norm(name);
    if (!n) return null;
    const exact = employees.filter(e => norm(e.name) === n);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;
    const starts = employees.filter(e => norm(e.name).startsWith(n));
    return starts.length === 1 ? starts[0] : null;
}

/**
 * Reads every section of the front sheet into payroll rows. The month and year
 * come from each section's title ("... SEP 2026"), else from `defaults`.
 * Anyone with a contractor, or not found in Employee Management, is a spare
 * driver. `notes` lists what the person checking the upload should look at.
 */
export function readSalaryFrontSheet(
    worksheet: ExcelJS.Worksheet,
    employees: Employee[],
    defaults: { month: number; year: number; companyId: string }
) {
    const rows: any[] = [];
    const notes: string[] = [];
    let month = defaults.month;
    let year = defaults.year;
    let col: Record<string, number> = {};
    const seen = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
        const text = (c: number) => String(plainCell(row.getCell(c).value) ?? '').trim();
        const first = text(1).toUpperCase();

        // Section title: "KEIL SALARY DRIVERS SEP 2026"
        if (/SALARY/.test(first) && !/^SL/.test(first)) {
            month = monthOf(first.replace(/^.*SALARY\s+\S+\s+/, '')) ?? defaults.month;
            year = yearOf(first) ?? defaults.year;
            col = {};
            return;
        }
        // Column headings
        if (/^SL\s*NO/.test(first)) {
            col = {};
            row.eachCell((cell, c) => { col[String(plainCell(cell.value) ?? '').trim().toUpperCase()] = c; });
            col.CONTRACTOR = (col.TOTAL || 8) + 1;
            return;
        }
        if (!col.NAME || first === 'TOTAL') return;
        const name = text(col.NAME);
        if (!name || !/^\d+$/.test(first)) return;

        const designation = (text(col.DESIGNATION) || 'DRIVER').toUpperCase();
        const contractor = text(col.CONTRACTOR);
        const salary = amountOf(plainCell(row.getCell(col.SALARY).value)) ?? 0;
        const advance = amountOf(plainCell(row.getCell(col.ADVANCE).value)) ?? 0;
        const penalty = amountOf(plainCell(row.getCell(col.PENALTY).value)) ?? 0;
        const duty = amountOf(plainCell(row.getCell(col.DUTY).value)) ?? 0;

        // A spare driver comes through a contractor; otherwise look the name up.
        const emp = contractor ? null : matchEmployee(name, employees);
        if (!contractor && !emp) notes.push(`Row ${rowNumber}: "${name}" is not in Employee Management, so it is saved as a spare driver.`);
        else if (emp && norm(emp.name) !== norm(name)) notes.push(`Row ${rowNumber}: "${name}" taken as employee ${emp.name}.`);

        const key = `${emp ? emp.id : `spare:${norm(name)}`}|${month}|${year}`;
        if (seen.has(key)) {
            notes.push(`Row ${rowNumber}: "${name}" already appears for ${MONTH_ABBR[month - 1]} ${year}; this row is left out.`);
            return;
        }
        seen.add(key);

        rows.push({
            employee_id: emp ? emp.id : null,
            worker_name: emp ? null : name,
            display_name: emp ? emp.name : name,
            is_spare: !emp,
            company_id: defaults.companyId,
            month,
            year,
            designation,
            no_of_duties: duty,
            basic_salary: salary,
            allowances: 0,
            incentives: 0,
            advance,
            penalty,
            deductions: advance + penalty,
            net_salary: salary - advance - penalty,
            remarks: contractor || null,
        });
    });
    return { rows, notes };
}
