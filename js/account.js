import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount } from './currency.js';

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const accountId = params.get('id');

  const statusEl = document.getElementById('status');
  const nameEl = document.getElementById('account-name');
  const metaEl = document.getElementById('account-meta');
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
    nameEl.textContent = account.bank_name;

    const typeLabel = account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1);
    metaEl.textContent = account.account_number ? `${typeLabel} · ${account.account_number}` : typeLabel;

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
      historyListEl.innerHTML = '';
      for (const tx of transactions) {
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
