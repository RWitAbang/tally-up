import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatSignedAmount, CURRENCIES, currencyLabel, currencySymbol } from './currency.js';
import { exportToExcel } from './export.js';
import { accountTypeLabel } from './account-types.js';
import { fitText } from './fit-text.js';
import { createPaginatedList } from './pagination.js';

const ACCOUNTS_PAGE_SIZE = 6;

const session = await requireSession();

if (session) {
  const statusEl = document.getElementById('status');
  const dashboardContentEl = document.getElementById('dashboard-content');
  const totalsEl = document.getElementById('totals');
  const sectionsEl = document.getElementById('sections');

  const [{ data: accounts, error: accountsError }, { data: transactions, error: txError }] = await Promise.all([
    supabase.from('accounts').select('*').order('bank_name', { ascending: true }),
    supabase.from('transactions').select('account_id, type, amount'),
  ]);

  if (accountsError || txError) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    dashboardContentEl.hidden = false;
    renderDashboard(accounts, transactions, totalsEl, sectionsEl);
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

  document.getElementById('account-settings').addEventListener('click', () => {
    window.location.href = 'account-settings.html';
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

function emptyTotals() {
  return Object.fromEntries(CURRENCIES.map((code) => [code, 0]));
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
      <span class="account-row-type">${accountTypeLabel(account.account_type)} · ${account.currency}</span>
      ${account.account_number ? `<span class="account-row-number">${account.account_number}</span>` : ''}
    </div>
    <div class="account-row-balance ${balance < 0 ? 'negative' : 'positive'}">${formatSignedAmount(currencySymbol(account.currency), balance)}</div>
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
  subtotals.innerHTML = CURRENCIES.map(
    (code) =>
      `<span class="${totals[code] < 0 ? 'negative' : 'positive'}">${formatSignedAmount(currencySymbol(code), totals[code])}</span>`
  ).join('');
  section.appendChild(subtotals);

  const listEl = document.createElement('div');
  section.appendChild(listEl);

  const paginationEl = document.createElement('div');
  paginationEl.className = 'pagination';
  section.appendChild(paginationEl);

  createPaginatedList({
    listEl,
    paginationEl,
    items: accounts,
    pageSize: ACCOUNTS_PAGE_SIZE,
    renderItem: (account) => renderAccountRow(account, balanceByAccount.get(account.id) ?? 0),
    onEmpty: (el) => {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = `no ${title.toLowerCase()} accounts yet`;
      el.appendChild(empty);
    },
  });

  return section;
}

function renderDashboard(accounts, transactions, totalsEl, sectionsEl) {
  const balanceByAccount = computeBalances(accounts, transactions);

  const overallTotals = emptyTotals();
  const personalTotals = emptyTotals();
  const businessTotals = emptyTotals();
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

  const secondaryCurrencies = CURRENCIES.filter((code) => code !== 'NGN');

  totalsEl.innerHTML = `
    <div class="overall-totals">
      <div class="overall-total overall-total-primary ${overallTotals.NGN < 0 ? 'negative-balance' : ''}">
        <span>Total ${currencyLabel('NGN')} (${currencySymbol('NGN')})</span>
        <strong>${formatSignedAmount(currencySymbol('NGN'), overallTotals.NGN)}</strong>
      </div>
      <div class="overall-totals-secondary">
        ${secondaryCurrencies
          .map(
            (code) => `
          <div class="overall-total ${overallTotals[code] < 0 ? 'negative-balance' : ''}">
            <span>Total ${currencyLabel(code)} (${currencySymbol(code)})</span>
            <strong>${formatSignedAmount(currencySymbol(code), overallTotals[code])}</strong>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  totalsEl.querySelectorAll('.overall-total strong').forEach((el) => fitText(el));

  sectionsEl.innerHTML = '';
  sectionsEl.appendChild(renderSection('Personal', personalTotals, personalAccounts, balanceByAccount));
  sectionsEl.appendChild(renderSection('Business', businessTotals, businessAccounts, balanceByAccount));
}
