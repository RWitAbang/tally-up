import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { parseAmount, formatAmount, attachLiveAmountFormatting } from './currency.js';

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const preselectedAccount = params.get('account');
  const transactionId = params.get('transaction');

  const accountSelect = document.getElementById('account');
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, bank_name, account_type')
    .order('bank_name', { ascending: true });

  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.id;
    const typeLabel = account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1);
    option.textContent = `${account.bank_name} — ${typeLabel}`;
    accountSelect.appendChild(option);
  }

  const dateInput = document.getElementById('date');
  const descriptionInput = document.getElementById('description');
  const amountInput = document.getElementById('amount');
  const amountErrorEl = document.getElementById('amount-error');
  const errorEl = document.getElementById('error');
  const form = document.getElementById('transaction-form');
  const saveButton = document.getElementById('save-button');
  const deleteButton = document.getElementById('delete');
  const pageTitle = document.getElementById('page-title');

  attachLiveAmountFormatting(amountInput);

  let existingTransaction = null;

  if (transactionId) {
    const { data: tx } = await supabase.from('transactions').select('*').eq('id', transactionId).single();
    existingTransaction = tx;

    pageTitle.textContent = 'Edit Transaction';
    saveButton.textContent = 'Save Changes';
    deleteButton.hidden = false;

    accountSelect.value = tx.account_id;
    form.type.value = tx.type;
    dateInput.value = tx.date;
    descriptionInput.value = tx.description ?? '';
    amountInput.value = formatAmount(tx.amount);
  } else {
    dateInput.value = new Date().toISOString().slice(0, 10);
    if (preselectedAccount) {
      accountSelect.value = preselectedAccount;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    amountErrorEl.textContent = '';

    const accountId = accountSelect.value;
    const type = form.type.value;
    const date = dateInput.value;
    const description = descriptionInput.value.trim();
    const amount = parseAmount(amountInput.value);

    if (!accountId) {
      errorEl.textContent = 'please choose an account';
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      amountErrorEl.textContent = 'please enter an amount';
      return;
    }

    if (existingTransaction) {
      const { error } = await supabase
        .from('transactions')
        .update({ account_id: accountId, type, date, description, amount })
        .eq('id', existingTransaction.id);

      if (error) {
        errorEl.textContent = "couldn't save — try again";
        return;
      }

      window.location.href = `account.html?id=${accountId}`;
      return;
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: session.user.id,
      account_id: accountId,
      type,
      date,
      description,
      amount,
    });

    if (error) {
      errorEl.textContent = "couldn't save — try again";
      return;
    }

    window.location.href = `account.html?id=${accountId}`;
  });

  deleteButton.addEventListener('click', async () => {
    if (!existingTransaction) return;

    const confirmed = window.confirm('Delete this transaction?');
    if (!confirmed) return;

    const { error } = await supabase.from('transactions').delete().eq('id', existingTransaction.id);

    if (error) {
      errorEl.textContent = "couldn't delete — try again";
      return;
    }

    window.location.href = `account.html?id=${existingTransaction.account_id}`;
  });

  document.getElementById('cancel').addEventListener('click', () => {
    if (existingTransaction) {
      window.location.href = `account.html?id=${existingTransaction.account_id}`;
    } else if (preselectedAccount) {
      window.location.href = `account.html?id=${preselectedAccount}`;
    } else {
      window.location.href = 'dashboard.html';
    }
  });
}
