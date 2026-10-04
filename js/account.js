import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount, formatSignedAmount, currencySymbol } from './currency.js';
import { accountTypeLabel } from './account-types.js';
import { fitText } from './fit-text.js';
import { createPaginatedList } from './pagination.js';
import { formatDateFriendly } from './date-utils.js';

const PAGE_SIZE = 10;

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const accountId = params.get('id');

  const statusEl = document.getElementById('status');
  const accountContentEl = document.getElementById('account-content');
  const nameEl = document.getElementById('account-name');
  const numberLineEl = document.getElementById('account-number-line');
  const balanceSectionEl = document.getElementById('balance-section');
  const startingBalanceRowEl = document.getElementById('starting-balance-row');
  const historyListEl = document.getElementById('history-list');

  const [{ data: account, error: accountError }, { data: transactions, error: txError }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', accountId).single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
  ]);

  if (accountError || txError) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    accountContentEl.hidden = false;
    const typeLabel = accountTypeLabel(account.account_type);
    nameEl.innerHTML = `${account.bank_name} <span class="account-type-inline">${typeLabel}</span>`;
    numberLineEl.textContent = account.account_number || '';

    const symbol = currencySymbol(account.currency);
    const balance =
      Number(account.starting_balance) +
      transactions.reduce((sum, tx) => sum + (tx.type === 'inflow' ? Number(tx.amount) : -Number(tx.amount)), 0);

    balanceSectionEl.innerHTML = `
      <div class="account-balance ${balance < 0 ? 'negative-balance' : ''}">
        <span>Current Balance</span>
        <strong>${formatSignedAmount(symbol, balance)}</strong>
      </div>
    `;
    fitText(balanceSectionEl.querySelector('.account-balance strong'), { max: 1.5 });

    startingBalanceRowEl.innerHTML = `
      <div class="transaction-row starting-balance-row">
        <div class="transaction-row-main">
          <span class="transaction-row-desc">Starting Balance</span>
          <span class="transaction-row-date">${formatDateFriendly(account.created_at.slice(0, 10))}</span>
        </div>
        <span class="transaction-row-amount">${formatSignedAmount(symbol, account.starting_balance)}</span>
      </div>
    `;

    createPaginatedList({
      listEl: historyListEl,
      paginationEl: document.getElementById('pagination'),
      items: transactions,
      pageSize: PAGE_SIZE,
      renderItem: (tx) => renderTransactionRow(tx, accountId, symbol),
      onEmpty: (el) => {
        el.innerHTML = '<p class="empty-state">no transactions yet</p>';
      },
    });
  }

  document.getElementById('add-transaction').addEventListener('click', () => {
    window.location.href = `transaction.html?account=${accountId}`;
  });

  document.getElementById('back').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  document.getElementById('edit-account').addEventListener('click', () => {
    window.location.href = `setup.html?account=${accountId}`;
  });
}

function renderTransactionRow(tx, accountId, symbol) {
  const row = document.createElement('a');
  row.className = 'transaction-row';
  row.href = `transaction.html?account=${accountId}&transaction=${tx.id}`;
  const sign = tx.type === 'inflow' ? '+' : '−';
  row.innerHTML = `
    <div class="transaction-row-main">
      <span class="transaction-row-desc">${tx.description || '(no description)'}</span>
      <span class="transaction-row-date">${formatDateFriendly(tx.date)}</span>
    </div>
    <span class="transaction-row-amount ${tx.type}">${sign}${symbol}${formatAmount(tx.amount)}</span>
  `;
  return row;
}
