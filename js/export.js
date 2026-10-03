import { supabase } from './supabase-client.js';

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
    .order('date', { ascending: false });

  if (txError) {
    return { ok: false, reason: 'load-failed' };
  }

  const workbook = XLSX.utils.book_new();
  const usedNames = new Set();

  for (const account of accounts) {
    const accountTransactions = transactions.filter((tx) => tx.account_id === account.id);
    const rows = accountTransactions.map((tx) => ({
      Date: tx.date,
      Type: tx.type,
      Description: tx.description || '',
      Amount: Number(tx.amount),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: ['Date', 'Type', 'Description', 'Amount'] });
    const sheetName = sanitizeSheetName(account.bank_name, usedNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  XLSX.writeFile(workbook, 'tally-up-export.xlsx');
  return { ok: true };
}
