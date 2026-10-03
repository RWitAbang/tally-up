import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount, parseAmount, attachLiveAmountFormatting } from './currency.js';

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const editingAccountId = params.get('account');

  const form = document.getElementById('setup-form');
  const formSection = document.getElementById('form-section');
  const confirmSection = document.getElementById('confirm-section');
  const errorEl = document.getElementById('error');
  const balanceInput = document.getElementById('starting_balance');
  const balanceErrorEl = document.getElementById('balance-error');
  const pageTitle = document.getElementById('page-title');
  const saveButton = document.getElementById('save-button');
  const cancelButton = document.getElementById('cancel');

  attachLiveAmountFormatting(balanceInput);

  let existingAccount = null;

  if (editingAccountId) {
    const { data: account } = await supabase.from('accounts').select('*').eq('id', editingAccountId).single();
    existingAccount = account;

    pageTitle.textContent = 'Edit Account';
    saveButton.textContent = 'Save Changes';
    form.bank_name.value = account.bank_name;
    form.account_number.value = account.account_number ?? '';
    form.account_type.value = account.account_type;
    form.currency.value = account.currency;
    form.category.value = account.category;
    balanceInput.value = formatAmount(account.starting_balance);

    cancelButton.hidden = false;
    cancelButton.addEventListener('click', () => {
      window.location.href = `account.html?id=${editingAccountId}`;
    });
  } else {
    const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true });
    if (count > 0) {
      cancelButton.hidden = false;
      cancelButton.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
      });
    }
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
    const accountNumber = form.account_number.value.trim();
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

    const escapedBankName = bankName.replace(/[%_]/g, '\\$&');
    let dupQuery = supabase
      .from('accounts')
      .select('id')
      .ilike('bank_name', escapedBankName)
      .eq('account_type', accountType)
      .eq('currency', currency)
      .eq('category', category);

    if (existingAccount) {
      dupQuery = dupQuery.neq('id', existingAccount.id);
    }

    const { data: matches } = await dupQuery;

    if (matches && matches.length > 0) {
      const proceed = window.confirm(
        `You already have a ${category} ${accountType} account at ${bankName} in ${currency}. ` +
          (existingAccount ? 'Save anyway?' : 'Add another one anyway?')
      );
      if (!proceed) {
        return;
      }
    }

    if (existingAccount) {
      const { error } = await supabase
        .from('accounts')
        .update({
          bank_name: bankName,
          account_number: accountNumber || null,
          account_type: accountType,
          currency,
          category,
          starting_balance: startingBalance,
        })
        .eq('id', existingAccount.id);

      if (error) {
        errorEl.textContent = "couldn't save — try again";
        return;
      }

      window.location.href = `account.html?id=${existingAccount.id}`;
      return;
    }

    const { error } = await supabase.from('accounts').insert({
      user_id: session.user.id,
      bank_name: bankName,
      account_number: accountNumber || null,
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
