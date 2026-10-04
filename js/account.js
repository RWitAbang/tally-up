import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount } from './currency.js';
import { accountTypeLabel } from './account-types.js';

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

    const symbol = account.currency === 'NGN' ? '₦' : '$';
    const balance =
      Number(account.starting_balance) +
      transactions.reduce((sum, tx) => sum + (tx.type === 'inflow' ? Number(tx.amount) : -Number(tx.amount)), 0);

    balanceSectionEl.innerHTML = `
      <div class="account-balance">
        <span>Current Balance</span>
        <strong>${symbol}${formatAmount(balance)}</strong>
      </div>
    `;

    if (transactions.length === 0) {
      historyListEl.innerHTML = '<p class="empty-state">no transactions yet</p>';
    } else {
      setUpHistoryPaging(transactions, accountId, symbol);
    }
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

function setUpHistoryPaging(transactions, accountId, symbol) {
  const historyListEl = document.getElementById('history-list');
  const paginationEl = document.getElementById('pagination');
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  let currentPage = 1;

  function renderPage(page) {
    currentPage = page;

    historyListEl.innerHTML = '';
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = transactions.slice(start, start + PAGE_SIZE);
    for (const tx of pageItems) {
      const row = document.createElement('a');
      row.className = 'transaction-row';
      row.href = `transaction.html?account=${accountId}&transaction=${tx.id}`;
      const sign = tx.type === 'inflow' ? '+' : '−';
      row.innerHTML = `
        <div class="transaction-row-main">
          <span class="transaction-row-desc">${tx.description || '(no description)'}</span>
          <span class="transaction-row-date">${tx.date}</span>
        </div>
        <span class="transaction-row-amount ${tx.type}">${sign}${symbol}${formatAmount(tx.amount)}</span>
      `;
      historyListEl.appendChild(row);
    }

    renderPagination();
  }

  function renderPagination() {
    paginationEl.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.className = 'page-nav';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => renderPage(currentPage - 1));
    paginationEl.appendChild(prevBtn);

    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = String(i);
      pageBtn.className = 'page-number' + (i === currentPage ? ' active' : '');
      pageBtn.addEventListener('click', () => renderPage(i));
      paginationEl.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.className = 'page-nav';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => renderPage(currentPage + 1));
    paginationEl.appendChild(nextBtn);
  }

  let touchStartX = 0;
  historyListEl.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  });
  historyListEl.addEventListener('touchend', (event) => {
    const diff = touchStartX - event.changedTouches[0].screenX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && currentPage < totalPages) {
      renderPage(currentPage + 1);
    } else if (diff < 0 && currentPage > 1) {
      renderPage(currentPage - 1);
    }
  });

  renderPage(1);
}
