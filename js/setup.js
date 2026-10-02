import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';

const session = await requireSession();

if (session) {
  const form = document.getElementById('setup-form');
  const formSection = document.getElementById('form-section');
  const confirmSection = document.getElementById('confirm-section');
  const errorEl = document.getElementById('error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const bankName = form.bank_name.value.trim();
    const accountType = form.account_type.value;
    const currency = form.currency.value;
    const category = form.category.value;
    const startingBalance = form.starting_balance.value === '' ? 0 : Number(form.starting_balance.value);

    if (!bankName) {
      errorEl.textContent = 'please enter a bank name';
      return;
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: session.user.id,
      bank_name: bankName,
      account_type: accountType,
      currency,
      category,
      starting_balance: startingBalance,
    });

    if (error) {
      errorEl.textContent = "couldn't save — try again";
      return;
    }

    form.reset();
    formSection.hidden = true;
    confirmSection.hidden = false;
  });

  document.getElementById('add-another').addEventListener('click', () => {
    confirmSection.hidden = true;
    formSection.hidden = false;
  });

  document.getElementById('done').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
}
