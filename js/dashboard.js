import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount } from './currency.js';
import { exportToExcel } from './export.js';

const session = await requireSession();

if (session) {
  const statusEl = document.getElementById('status');
  const contentEl = document.getElementById('content');

  const [{ data: accounts, error: accountsError }, { data: transactions, error: txError }] = await Promise.all([
    supabase.from('accounts').select('*').order('bank_name', { ascending: true }),
    supabase.from('transactions').select('account_id, type, amount'),
  ]);

  if (accountsError || txError) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    renderDashboard(accounts, transactions, contentEl);
  }

  document.getElementById('add-account').addEventListener('click', () => {
    window.location.href = 'setup.html';
  });

  document.getElementById('add-transaction').addEventListener('click', () => {
    window.location.href = 'transaction.html';
  });

  document.getElementById('sign-out').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'sign-in.html';
  });

  const exportStatusEl = document.getElementById('export-status');
  document.getElementById('export').addEventListener('click', async () => {
    exportStatusEl.textContent = '';
    const result = await exportToExcel();
    if (!result.ok) {
      exportStatusEl.textContent =
        result.reason === 'no-accounts' ? 'add an account first' : "couldn't export — try again";
    }
  });
}

function currencySymbol(code) {
  return code === 'NGN' ? '₦' : '$';
}

function computeBalances(accounts, transactions) {
  const balanceByAccount = new Map();
  for (const account of accounts) {
    balanceByAccount.set(account.id, Number(account.starting_balance));
  }
  for (const tx of transactions) {
    const current = balanceByAccount.get(tx.account_id) ?? 0;
    const delta = tx.type === 'inflow' ? Number(tx.amount) : -Number(tx.amount);
    balanceByAccount.set(tx.account_id, current + delta);
  }
  return balanceByAccount;
}

function renderAccountRow(account, balance) {
  const row = document.createElement('a');
  row.className = 'account-row';
  row.href = `account.html?id=${account.id}`;
  row.innerHTML = `
    <div class="account-row-main">
      <span class="account-row-name">${account.bank_name}</span>
      <span class="account-row-type">${account.account_type} · ${account.currency}</span>
    </div>
    <div class="account-row-balance">${currencySymbol(account.currency)}${formatAmount(balance)}</div>
  `;
  return row;
}

function renderSection(title, totals, accounts, balanceByAccount) {
  const section = document.createElement('div');
  section.className = 'dashboard-section';

  const heading = document.createElement('h2');
  heading.textContent = title;
  section.appendChild(heading);

  const subtotals = document.createElement('div');
  subtotals.className = 'section-subtotals';
  subtotals.innerHTML = `<span>₦${formatAmount(totals.NGN)}</span><span>$${formatAmount(totals.USD)}</span>`;
  section.appendChild(subtotals);

  for (const account of accounts) {
    section.appendChild(renderAccountRow(account, balanceByAccount.get(account.id) ?? 0));
  }

  return section;
}

function renderDashboard(accounts, transactions, contentEl) {
  const balanceByAccount = computeBalances(accounts, transactions);

  const overallTotals = { NGN: 0, USD: 0 };
  const personalTotals = { NGN: 0, USD: 0 };
  const businessTotals = { NGN: 0, USD: 0 };
  const personalAccounts = [];
  const businessAccounts = [];

  for (const account of accounts) {
    const balance = balanceByAccount.get(account.id) ?? 0;
    overallTotals[account.currency] += balance;
    if (account.category === 'personal') {
      personalTotals[account.currency] += balance;
      personalAccounts.push(account);
    } else {
      businessTotals[account.currency] += balance;
      businessAccounts.push(account);
    }
  }

  contentEl.innerHTML = '';

  const overall = document.createElement('div');
  overall.className = 'overall-totals';
  overall.innerHTML = `
    <div class="overall-total"><span>Total Naira</span><strong>₦${formatAmount(overallTotals.NGN)}</strong></div>
    <div class="overall-total"><span>Total Dollar</span><strong>$${formatAmount(overallTotals.USD)}</strong></div>
  `;
  contentEl.appendChild(overall);

  contentEl.appendChild(renderSection('Personal', personalTotals, personalAccounts, balanceByAccount));
  contentEl.appendChild(renderSection('Business', businessTotals, businessAccounts, balanceByAccount));
}
