import { supabase } from './supabase-client.js';
import { accountTypeLabel } from './account-types.js';

function sanitizeSheetName(name, usedNames) {
  const base = (name || 'Account').replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Account';
  let finalName = base;
  let counter = 2;
  while (usedNames.has(finalName)) {
    const suffix = ` (${counter})`;
    finalName = base.slice(0, 31 - suffix.length) + suffix;
    counter++;
  }
  usedNames.add(finalName);
  return finalName;
}

function todayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// tx.date arrives as "YYYY-MM-DD" text from Supabase. Parsing it with
// `new Date("YYYY-MM-DD")` reads it as UTC midnight, which can roll back
// to the previous calendar day once converted to a local-time value —
// building the Date from its parts in local time avoids that entirely.
function parseDateCell(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export async function exportToExcel() {
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('*')
    .order('bank_name', { ascending: true });

  if (accountsError) {
    return { ok: false, reason: 'load-failed' };
  }

  if (!accounts || accounts.length === 0) {
    return { ok: false, reason: 'no-accounts' };
  }

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (txError) {
    return { ok: false, reason: 'load-failed' };
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set();

  for (const account of accounts) {
    const accountTransactions = transactions.filter((tx) => tx.account_id === account.id);

    let runningBalance = Number(account.starting_balance);
    const rows = accountTransactions.map((tx) => {
      runningBalance += tx.type === 'inflow' ? Number(tx.amount) : -Number(tx.amount);
      return [parseDateCell(tx.date), tx.type, tx.description || '', Number(tx.amount), runningBalance];
    });

    const sheetData = [
      ['Account Number:', account.account_number || '—'],
      ['Starting Balance:', Number(account.starting_balance)],
      [],
      ['Date', 'Type', 'Description', 'Amount', 'Balance'],
      ...rows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    const dateHeaderRow = 3;
    rows.forEach((_, i) => {
      const cellRef = XLSX.utils.encode_cell({ r: dateHeaderRow + 1 + i, c: 0 });
      if (worksheet[cellRef]) {
        worksheet[cellRef].z = 'dddd, d mmmm yyyy';
      }
    });
    worksheet['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 24 }, { wch: 14 }, { wch: 14 }];

    const sheetName = sanitizeSheetName(`${account.bank_name} ${accountTypeLabel(account.account_type)}`, usedNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  XLSX.writeFile(workbook, `${todayDateString()}_TallyUp_Export.xlsx`);
  return { ok: true };
}
