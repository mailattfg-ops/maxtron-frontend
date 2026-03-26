import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcel = async ({
  headers,
  rows,
  filename,
  sheetName = 'Report'
}: {
  headers: string[];
  rows: (any)[][];
  filename: string;
  sheetName?: string;
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add Headers
  const headerRow = worksheet.addRow(headers);

  // Style the header row
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Dark blue (Tailwind blue-800 equivalent)
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
  });

  headerRow.height = 25;

  // Add data rows
  rows.forEach((row) => {
    const r = worksheet.addRow(row);
    r.eachCell((cell) => {
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
    });
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
            maxLength = columnLength;
        }
    });
    column.width = Math.min(Math.max(maxLength + 4, 15), 50); // Between 15 and 50 width
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};

export const exportToCSV = async ({
  headers,
  rows,
  filename
}: {
  headers: string[];
  rows: (any)[][];
  filename: string;
}) => {
  const content = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell || '');
      return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ].join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
};
