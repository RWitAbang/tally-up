import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount, parseAmount, attachLiveAmountFormatting } from './currency.js';

const session = await requireSession();

if (session) {
  const form = document.getElementById('setup-form');
  const formSection = document.getElementById('form-section');
  const confirmSection = document.getElementById('confirm-section');
  const errorEl = document.getElementById('error');
  const balanceInput = document.getElementById('starting_balance');
  const balanceErrorEl = document.getElementById('balance-error');

  attachLiveAmountFormatting(balanceInput);

  const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true });
  if (count > 0) {
    const cancelButton = document.getElementById('cancel');
    cancelButton.hidden = false;
    cancelButton.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }

  balanceInput.addEventListener('blur', () => {
    if (balanceInput.value.trim() === '') {
      balanceErrorEl.textContent = '';
      return;
    }
    const parsed = parseAmount(balanceInput.value);
    if (Number.isNaN(parsed)) {
      balanceErrorEl.textContent = 'Please enter a number';
    } else {
      balanceErrorEl.textContent = '';
      balanceInput.value = formatAmount(parsed);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    balanceErrorEl.textContent = '';

    const bankName = form.bank_name.value.trim();
    const accountType = form.account_type.value;
    const currency = form.currency.value;
    const category = form.category.value;

    let startingBalance = 0;
    if (balanceInput.value.trim() !== '') {
      const parsed = parseAmount(balanceInput.value);
      if (Number.isNaN(parsed)) {
        balanceErrorEl.textContent = 'Please enter a number';
        return;
      }
      startingBalance = parsed;
    }

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
