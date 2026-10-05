import type { Workbook } from 'exceljs';

/** A registered vehicle, as far as the import needs to know it. */
type Vehicle = { id: string; registration_number: string };

/**
 * Reads the diesel register workbook: one sheet per month, each with a title,
 * a header row (DATE | VEH NO | LTR | RATE | AMOUNT | PUMP) and one filling per
 * row, closed by a totals row.
 *
 * Returns every filling of every month sheet, each marked valid or with what is
 * wrong with it, plus how many sheets were read (0 means the file is not a
 * register at all).
 */
export function readFuelRegister(
    workbook: Workbook,
    matchVehicle: (rawVehicleNo: string) => Vehicle | null | undefined
): { rows: any[]; sheetsRead: number } {
    const getCellValue = (cell: any): string => {
        if (!cell || cell.value === null || cell.value === undefined) return '';
        // exceljs reads a date cell as that date at midnight UTC, so it is read back in UTC
        if (cell.value instanceof Date) {
            const d = cell.value;
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        if (typeof cell.value === 'object') {
            if (cell.value.result !== undefined) return String(cell.value.result).trim();
            if (cell.value.text !== undefined) return String(cell.value.text).trim();
            if (cell.value.richText) return cell.value.richText.map((t: any) => t.text).join('').trim();
            return JSON.stringify(cell.value).trim();
        }
        return String(cell.value).trim();
    };

    const parseDateValue = (raw: string, cell: any): string => {
        if (cell?.value instanceof Date) {
            const d = cell.value;
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        if (typeof cell?.value === 'number' && cell.value > 20000 && cell.value < 100000) {
            const dateObj = new Date((cell.value - 25569) * 86400 * 1000);
            const yyyy = dateObj.getUTCFullYear();
            const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getUTCDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        const clean = raw.trim();
        if (!clean) return '';

        // Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
        const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (dmyMatch) {
            const [_, day, month, year] = dmyMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Match YYYY-MM-DD
        const ymdMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (ymdMatch) {
            const [_, year, month, day] = ymdMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Anything else ("1 Apr 2026") is parsed as local time, so it is read back as local
        const parsed = new Date(clean);
        if (!isNaN(parsed.getTime())) {
            return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
        }
        return '';
    };

    // The register keeps one sheet per month. Every sheet that has the
    // register's columns is read; sheets without them are passed over.
    // It used to read the first sheet only, so only April came in.
    const parsedRows: any[] = [];
    let sheetsRead = 0;

    for (const worksheet of workbook.worksheets) {
        // Detect header row by scanning rows 1 to 10
        let headerRowIndex = -1;
        const colMap = { date: -1, veh: -1, ltr: -1, rate: -1, amount: -1, pump: -1 };

        worksheet.eachRow((row, rowNumber) => {
            if (headerRowIndex !== -1) return;
            const cellTexts: { [col: number]: string } = {};
            row.eachCell((cell, colNumber) => {
                cellTexts[colNumber] = getCellValue(cell).toUpperCase();
            });

            const values = Object.values(cellTexts);
            const hasDate = values.some(v => v.includes('DATE'));
            const hasVeh = values.some(v => v.includes('VEH') || v.includes('REG') || v.includes('ASSET'));
            const hasLtr = values.some(v => v.includes('LTR') || v.includes('LITER') || v.includes('QTY'));

            if (hasDate && (hasVeh || hasLtr)) {
                headerRowIndex = rowNumber;
                Object.entries(cellTexts).forEach(([colStr, text]) => {
                    const colIdx = Number(colStr);
                    if (text.includes('DATE')) colMap.date = colIdx;
                    else if (text.includes('VEH') || text.includes('REG') || text.includes('ASSET')) colMap.veh = colIdx;
                    else if (text.includes('LTR') || text.includes('LITER') || text.includes('QTY')) colMap.ltr = colIdx;
                    else if (text.includes('RATE') || text.includes('PRICE')) colMap.rate = colIdx;
                    else if (text.includes('AMOUT') || text.includes('AMOUNT') || text.includes('TOTAL') || text.includes('COST')) colMap.amount = colIdx;
                    else if (text.includes('PUMP') || text.includes('STATION') || text.includes('BUNK')) colMap.pump = colIdx;
                });
            }
        });

        if (headerRowIndex === -1 || colMap.date === -1 || colMap.veh === -1 || colMap.ltr === -1) continue;
        sheetsRead++;

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber <= headerRowIndex) return;

            const rawDate = colMap.date !== -1 ? getCellValue(row.getCell(colMap.date)) : '';
            const rawVeh = colMap.veh !== -1 ? getCellValue(row.getCell(colMap.veh)) : '';
            const rawLtr = colMap.ltr !== -1 ? getCellValue(row.getCell(colMap.ltr)) : '';
            const rawRate = colMap.rate !== -1 ? getCellValue(row.getCell(colMap.rate)) : '';
            const rawAmount = colMap.amount !== -1 ? getCellValue(row.getCell(colMap.amount)) : '';
            const rawPump = colMap.pump !== -1 ? getCellValue(row.getCell(colMap.pump)) : '';

            // Skip blank rows and the totals row at the foot of each sheet (it
            // carries sums but neither a date nor a vehicle)
            if (!rawDate && !rawVeh) return;
            if (rawDate.toUpperCase().includes('TOTAL') || rawVeh.toUpperCase().includes('TOTAL')) return;

            const rowErrors: string[] = [];

            // 1. Date Validation
            const dateCell = colMap.date !== -1 ? row.getCell(colMap.date) : null;
            const formattedDate = parseDateValue(rawDate, dateCell);
            if (!rawDate) {
                rowErrors.push("Date is required");
            } else if (!formattedDate) {
                rowErrors.push(`Invalid date: "${rawDate}" (use DD-MM-YYYY)`);
            } else {
                const yr = parseInt(formattedDate.split('-')[0], 10);
                if (yr < 2000 || yr > 2099) {
                    rowErrors.push(`Date year ${yr} out of range`);
                }
            }

            // 2. Vehicle Matching
            if (!rawVeh) {
                rowErrors.push("Vehicle number is required");
            }
            const matchedVeh = matchVehicle(rawVeh);
            if (rawVeh && !matchedVeh) {
                rowErrors.push(`Vehicle "${rawVeh}" not found in registered fleet`);
            }

            // 3. Liters Validation
            const ltrNum = parseFloat(rawLtr);
            if (!rawLtr) {
                rowErrors.push("Liters (LTR) is required");
            } else if (isNaN(ltrNum) || ltrNum <= 0) {
                rowErrors.push(`Invalid liters: "${rawLtr}"`);
            }

            // 4. Rate & Amount Validation / Auto-calculation
            let rateNum = parseFloat(rawRate);
            let amountNum = parseFloat(rawAmount);

            if ((isNaN(amountNum) || amountNum <= 0) && !isNaN(ltrNum) && !isNaN(rateNum) && ltrNum > 0 && rateNum > 0) {
                amountNum = parseFloat((ltrNum * rateNum).toFixed(2));
            }

            if ((isNaN(rateNum) || rateNum <= 0) && !isNaN(ltrNum) && !isNaN(amountNum) && ltrNum > 0 && amountNum > 0) {
                rateNum = parseFloat((amountNum / ltrNum).toFixed(2));
            }

            if (isNaN(amountNum) || amountNum <= 0) {
                rowErrors.push("Valid amount or rate is required");
            }

            parsedRows.push({
                sheetName: worksheet.name,
                rowNumber,
                rawDate,
                formattedDate,
                rawVeh,
                vehicleId: matchedVeh?.id || null,
                vehicleReg: matchedVeh?.registration_number || rawVeh,
                liters: !isNaN(ltrNum) ? ltrNum : 0,
                rate: !isNaN(rateNum) ? rateNum : 0,
                amount: !isNaN(amountNum) ? amountNum : 0,
                pump: rawPump || '',
                isValid: rowErrors.length === 0,
                errors: rowErrors
            });
        });
    }

    return { rows: parsedRows, sheetsRead };
}
