// Template shape: one sheet, header row, then row 2 is always the opening
// balance (only its Amount is read — the Date and Description there are
// just for the person filling it in), then every row after that is a real
// transaction. The Balance column is never read — the app always computes
// its own running balance, the same way it does everywhere else.
//
// Dates are read as raw serial numbers and decoded with XLSX.SSF.parse_date_code
// (pure date arithmetic, no Date object, no timezone involved) rather than
// the library's cellDates option, which converts through a JS Date and gets
// the calendar day wrong whenever the browser's local timezone isn't UTC —
// confirmed by testing the round trip in several timezones before writing this.
import { loadXLSX } from './load-xlsx.js';

export async function downloadImportTemplate() {
  await loadXLSX();
  const rows = [
    ['Date', 'Description', 'Amount', 'Balance'],
    [new Date(), 'Starting Balance', 0, 0],
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import');
  XLSX.writeFile(workbook, 'TallyUp_Import_Template.xlsx');
}

function readDateCell(cell) {
  if (!cell || cell.t !== 'n') return null;
  const decoded = XLSX.SSF.parse_date_code(Math.round(cell.v));
  if (!decoded || decoded.y < 1980 || decoded.y > 2100) return null;
  return `${decoded.y}-${String(decoded.m).padStart(2, '0')}-${String(decoded.d).padStart(2, '0')}`;
}

function readCellValue(cell) {
  return cell ? cell.v : null;
}

// Reads one already-parsed worksheet into { startingBalance, transactions,
// skipped }, or { error } if the sheet doesn't have a usable starting
// balance row. Shared by the single-account and multi-account (one sheet
// per account) import paths below — the per-sheet shape is identical.
function parseSheet(sheet) {
  if (!sheet || !sheet['!ref']) {
    return { error: 'this file has no starting balance row' };
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const cellAt = (r, c) => sheet[XLSX.utils.encode_cell({ r, c })];

  if (range.e.r < 1) {
    return { error: 'this file has no starting balance row' };
  }

  const startingBalanceRaw = readCellValue(cellAt(1, 2));
  const startingBalance = Number(startingBalanceRaw);
  if (startingBalanceRaw === null || Number.isNaN(startingBalance)) {
    return { error: "couldn't read the starting balance in row 2" };
  }

  const transactions = [];
  const skipped = [];

  for (let r = 2; r <= range.e.r; r++) {
    const dateCell = cellAt(r, 0);
    const descriptionCell = cellAt(r, 1);
    const amountCell = cellAt(r, 2);
    const rowNumber = r + 1;

    if (!dateCell && !descriptionCell && !amountCell) continue;

    const date = readDateCell(dateCell);
    if (!date) {
      skipped.push({ row: rowNumber, reason: "date isn't a real date cell" });
      continue;
    }

    const amountRaw = readCellValue(amountCell);
    const amount = Number(amountRaw);
    if (amountRaw === null || Number.isNaN(amount) || amount === 0) {
      skipped.push({ row: rowNumber, reason: 'amount is missing or not a number' });
      continue;
    }

    const description = readCellValue(descriptionCell);

    transactions.push({
      date,
      type: amount > 0 ? 'inflow' : 'expense',
      amount: Math.abs(amount),
      description: description ? String(description).trim() : '',
    });
  }

  return { startingBalance, transactions, skipped };
}

function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("couldn't read this file"));
    reader.onload = () => {
      try {
        resolve(XLSX.read(new Uint8Array(reader.result), { type: 'array' }));
      } catch {
        reject(new Error("couldn't read this file — make sure it's the Tally Up template"));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export async function parseImportFile(file) {
  await loadXLSX();
  const workbook = await readWorkbook(file);
  const result = parseSheet(workbook.Sheets[workbook.SheetNames[0]]);
  if (result.error) throw new Error(result.error);
  return result;
}

// One sheet per account — the sheet's own tab name becomes that account's
// Bank Name, since the template carries transactions, not account details
// (type/currency/category aren't something a spreadsheet cell can validate
// against the app's own rules, so those are always collected in the app).
export async function parseImportWorkbook(file) {
  await loadXLSX();
  const workbook = await readWorkbook(file);
  return workbook.SheetNames.map((sheetName) => {
    const result = parseSheet(workbook.Sheets[sheetName]);
    return { sheetName, ...result };
  });
}
