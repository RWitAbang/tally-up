import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { parseAmount, formatAmount, attachLiveAmountFormatting } from './currency.js';
import { accountTypeLabel } from './account-types.js';
import { showConfirmDialog } from './confirm-dialog.js';

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const preselectedAccount = params.get('account');
  const transactionId = params.get('transaction');

  const statusEl = document.getElementById('status');
  const form = document.getElementById('transaction-form');
  const accountSelect = document.getElementById('account');
  const dateInput = document.getElementById('date');
  const descriptionInput = document.getElementById('description');
  const amountInput = document.getElementById('amount');
  const amountErrorEl = document.getElementById('amount-error');
  const errorEl = document.getElementById('error');
  const saveButton = document.getElementById('save-button');
  const deleteButton = document.getElementById('delete');
  const pageTitle = document.getElementById('page-title');

  attachLiveAmountFormatting(amountInput);

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, bank_name, account_type')
    .order('bank_name', { ascending: true });

  let existingTransaction = null;
  let loadError = accountsError;

  if (!loadError) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Select an account';
    placeholderOption.disabled = true;
    accountSelect.appendChild(placeholderOption);

    for (const account of accounts) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = `${account.bank_name} — ${accountTypeLabel(account.account_type)}`;
      accountSelect.appendChild(option);
    }

    if (transactionId) {
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txError || !tx) {
        loadError = txError || new Error('transaction not found');
      } else {
        existingTransaction = tx;
        pageTitle.textContent = 'Edit Transaction';
        saveButton.textContent = 'Save Changes';
        deleteButton.hidden = false;

        accountSelect.value = tx.account_id;
        form.type.value = tx.type;
        dateInput.value = tx.date;
        descriptionInput.value = tx.description ?? '';
        amountInput.value = formatAmount(tx.amount);
      }
    } else {
      dateInput.value = new Date().toISOString().slice(0, 10);
      accountSelect.value = preselectedAccount || '';
    }
  }

  if (loadError) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    form.hidden = false;

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

      const originalButtonText = saveButton.textContent;
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';

      if (existingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update({ account_id: accountId, type, date, description, amount })
          .eq('id', existingTransaction.id);

        if (error) {
          errorEl.textContent = "couldn't save — try again";
          saveButton.disabled = false;
          saveButton.textContent = originalButtonText;
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
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        return;
      }

      window.location.href = `account.html?id=${accountId}`;
    });

    deleteButton.addEventListener('click', async () => {
      if (!existingTransaction) return;

      const confirmed = await showConfirmDialog('Delete this transaction? This can\'t be undone.', 'Delete');
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
}
