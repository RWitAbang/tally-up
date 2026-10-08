import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount, formatSignedAmount, currencySymbol } from './currency.js';
import { accountTypeLabel } from './account-types.js';
import { fitText } from './fit-text.js';
import { createPaginatedList } from './pagination.js';
import { formatDateFriendly } from './date-utils.js';
import { showConfirmDialog } from './confirm-dialog.js';

const PAGE_SIZE = 10;
const UNDO_WINDOW_MS = 8000;

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
  const searchInput = document.getElementById('history-search');
  const typeSelect = document.getElementById('history-type');
  const selectToggleButton = document.getElementById('select-toggle');
  const selectionBarEl = document.getElementById('selection-bar');
  const selectionCountEl = document.getElementById('selection-count');
  const undoBannerEl = document.getElementById('undo-banner');
  const undoTextEl = document.getElementById('undo-text');

  let account = null;
  let transactions = [];
  let symbol = '';
  let history = null;
  let selectionMode = false;
  const selectedIds = new Set();
  let pendingDelete = null;

  const [{ data: accountData, error: accountError }, { data: txData, error: txError }] = await Promise.all([
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
    account = accountData;
    transactions = txData;
    statusEl.textContent = '';
    accountContentEl.hidden = false;
    nameEl.innerHTML = `${account.bank_name} <span class="account-type-inline">${accountTypeLabel(account.account_type)}</span>`;
    numberLineEl.textContent = account.account_number || '';
    symbol = currencySymbol(account.currency);

    startingBalanceRowEl.innerHTML = `
      <div class="transaction-row starting-balance-row">
        <div class="transaction-row-main">
          <span class="transaction-row-desc">Starting Balance</span>
          <span class="transaction-row-date">${formatDateFriendly(account.created_at.slice(0, 10))}</span>
        </div>
        <span class="transaction-row-amount">${formatSignedAmount(symbol, account.starting_balance)}</span>
      </div>
    `;

    history = createPaginatedList({
      listEl: historyListEl,
      paginationEl: document.getElementById('pagination'),
      items: [],
      pageSize: PAGE_SIZE,
      renderItem: renderTransactionRow,
      onEmpty: (el) => {
        const message = transactions.length === 0 ? 'no transactions yet' : 'no matching transactions';
        el.innerHTML = `<p class="empty-state">${message}</p>`;
      },
    });

    renderAll();
  }

  function renderBalance() {
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
  }

  function filteredTransactions() {
    const query = searchInput.value.trim().toLowerCase().replace(/,/g, '');
    const type = typeSelect.value;
    return transactions.filter((tx) => {
      if (type !== 'all' && tx.type !== type) return false;
      if (!query) return true;
      const description = (tx.description || '').toLowerCase();
      if (description.includes(query)) return true;
      const numericQuery = Math.abs(Number(query));
      if (query !== '' && !Number.isNaN(numericQuery) && Number(tx.amount) === numericQuery) return true;
      return String(Number(tx.amount)).includes(query);
    });
  }

  function renderAll() {
    renderBalance();
    history.setItems(filteredTransactions());
    updateSelectionBar();
  }

  function renderTransactionRow(tx) {
    const row = document.createElement('a');
    row.className = 'transaction-row';
    row.href = `transaction.html?account=${accountId}&transaction=${tx.id}`;
    if (selectedIds.has(tx.id)) row.classList.add('selected');

    const main = document.createElement('div');
    main.className = 'transaction-row-main';
    const desc = document.createElement('span');
    desc.className = 'transaction-row-desc';
    desc.textContent = tx.description || '(no description)';
    const date = document.createElement('span');
    date.className = 'transaction-row-date';
    date.textContent = formatDateFriendly(tx.date);
    main.append(desc, date);

    const amount = document.createElement('span');
    amount.className = `transaction-row-amount ${tx.type}`;
    amount.textContent = `${tx.type === 'inflow' ? '+' : '−'}${symbol}${formatAmount(tx.amount)}`;

    row.append(main, amount);

    row.addEventListener('click', (event) => {
      if (!selectionMode) return;
      event.preventDefault();
      if (selectedIds.has(tx.id)) {
        selectedIds.delete(tx.id);
        row.classList.remove('selected');
      } else {
        selectedIds.add(tx.id);
        row.classList.add('selected');
      }
      updateSelectionBar();
    });

    return row;
  }

  function setSelectionMode(on) {
    selectionMode = on;
    if (!on) selectedIds.clear();
    selectToggleButton.textContent = on ? 'Done' : 'Select';
    historyListEl.classList.toggle('selecting', on);
    history.setItems(filteredTransactions());
    updateSelectionBar();
  }

  function updateSelectionBar() {
    selectionBarEl.hidden = !selectionMode;
    selectionCountEl.textContent = `${selectedIds.size} selected`;
    document.getElementById('delete-selected').disabled = selectedIds.size === 0;
  }

  async function flushPendingDelete() {
    if (!pendingDelete) return;
    const { ids } = pendingDelete;
    clearTimeout(pendingDelete.timer);
    pendingDelete = null;
    undoBannerEl.hidden = true;

    const { error } = await supabase.from('transactions').delete().in('id', ids);
    if (error) {
      await reloadTransactions();
      statusEl.textContent = "couldn't delete — try again";
    }
  }

  async function reloadTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error) {
      transactions = data;
      renderAll();
    }
  }

  selectToggleButton.addEventListener('click', () => setSelectionMode(!selectionMode));

  document.getElementById('cancel-selection').addEventListener('click', () => setSelectionMode(false));

  document.getElementById('delete-selected').addEventListener('click', async () => {
    const count = selectedIds.size;
    const confirmed = await showConfirmDialog(
      [
        { text: `Delete ${count} transaction${count === 1 ? '' : 's'}? You can undo this for a few seconds.` },
      ],
      'Delete'
    );
    if (!confirmed) return;

    await flushPendingDelete();

    const ids = [...selectedIds];
    const removed = transactions.filter((tx) => selectedIds.has(tx.id));
    transactions = transactions.filter((tx) => !selectedIds.has(tx.id));
    selectedIds.clear();
    selectionMode = false;
    selectToggleButton.textContent = 'Select';
    historyListEl.classList.remove('selecting');

    const timer = setTimeout(flushPendingDelete, UNDO_WINDOW_MS);
    pendingDelete = { ids, removed, timer };

    undoTextEl.textContent = `${count} transaction${count === 1 ? '' : 's'} deleted.`;
    undoBannerEl.hidden = false;
    renderAll();
  });

  document.getElementById('undo-button').addEventListener('click', () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    transactions = [...transactions, ...pendingDelete.removed].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.created_at < b.created_at ? 1 : -1;
    });
    pendingDelete = null;
    undoBannerEl.hidden = true;
    renderAll();
  });

  searchInput.addEventListener('input', () => history.setItems(filteredTransactions()));
  typeSelect.addEventListener('change', () => history.setItems(filteredTransactions()));

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
