import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportToExcel = async ({
  headers,
  rows,
  filename,
  sheetName = 'Report'
}: {
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  filename: string;
  sheetName?: string;
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add Headers
  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(1);

  // Style the header row
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
  });

  // Add data rows
  rows.forEach((row) => {
    worksheet.addRow(row);
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
    column.width = Math.min(Math.max(maxLength + 4, 15), 100); // Between 15 and 100 width
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
};
