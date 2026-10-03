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

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
      return [tx.date, tx.type, tx.description || '', Number(tx.amount), runningBalance];
    });

    const sheetData = [
      ['Account Number:', account.account_number || '—'],
      ['Starting Balance:', Number(account.starting_balance)],
      [],
      ['Date', 'Type', 'Description', 'Amount', 'Balance'],
      ...rows,
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const sheetName = sanitizeSheetName(`${account.bank_name} ${capitalize(account.account_type)}`, usedNames);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  XLSX.writeFile(workbook, 'tally-up-export.xlsx');
  return { ok: true };
}
