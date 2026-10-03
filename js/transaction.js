import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { parseAmount, attachLiveAmountFormatting } from './currency.js';

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const preselectedAccount = params.get('account');

  const accountSelect = document.getElementById('account');
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, bank_name')
    .order('bank_name', { ascending: true });

  for (const account of accounts) {
    const option = document.createElement('option');
    option.value = account.id;
    option.textContent = account.bank_name;
    accountSelect.appendChild(option);
  }
  if (preselectedAccount) {
    accountSelect.value = preselectedAccount;
  }

  const dateInput = document.getElementById('date');
  dateInput.value = new Date().toISOString().slice(0, 10);

  const amountInput = document.getElementById('amount');
  attachLiveAmountFormatting(amountInput);
  const amountErrorEl = document.getElementById('amount-error');

  const form = document.getElementById('transaction-form');
  const errorEl = document.getElementById('error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    amountErrorEl.textContent = '';

    const accountId = accountSelect.value;
    const type = form.type.value;
    const date = dateInput.value;
    const description = form.description.value.trim();
    const amount = parseAmount(amountInput.value);

    if (!accountId) {
      errorEl.textContent = 'please choose an account';
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      amountErrorEl.textContent = 'please enter an amount';
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

    window.location.href = 'dashboard.html';
  });

  document.getElementById('cancel').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
}
