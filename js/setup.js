import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount, parseAmount, attachLiveAmountFormatting, currencySymbol } from './currency.js';
import { showConfirmDialog } from './confirm-dialog.js';

const session = await requireSession();

if (session) {
  const params = new URLSearchParams(window.location.search);
  const editingAccountId = params.get('account');

  const statusEl = document.getElementById('status');
  const form = document.getElementById('setup-form');
  const formSection = document.getElementById('form-section');
  const confirmSection = document.getElementById('confirm-section');
  const errorEl = document.getElementById('error');
  const balanceInput = document.getElementById('starting_balance');
  const balanceErrorEl = document.getElementById('balance-error');
  const pageTitle = document.getElementById('page-title');
  const welcomeDescEl = document.getElementById('welcome-desc');
  const saveButton = document.getElementById('save-button');
  const cancelButton = document.getElementById('cancel');
  const deleteButton = document.getElementById('delete-account');
  const accountNumberInput = document.getElementById('account_number');
  const addTransactionNowButton = document.getElementById('add-transaction-now');
  const balanceLockedHint = document.getElementById('balance-locked-hint');
  const currencySelect = document.getElementById('currency');
  const balanceSymbolEl = document.getElementById('balance-symbol');

  let newAccountId = null;
  let balanceLocked = false;

  attachLiveAmountFormatting(balanceInput);

  accountNumberInput.addEventListener('input', () => {
    accountNumberInput.value = accountNumberInput.value.replace(/[^0-9]/g, '');
  });

  currencySelect.addEventListener('change', () => {
    balanceSymbolEl.textContent = currencySymbol(currencySelect.value);
  });
  balanceSymbolEl.textContent = currencySymbol(currencySelect.value);

  let existingAccount = null;
  let loadError = null;

  if (editingAccountId) {
    statusEl.innerHTML = '<div class="spinner"></div>';
    formSection.hidden = true;

    const { data: account, error: accountLoadError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', editingAccountId)
      .single();

    if (accountLoadError || !account) {
      loadError = accountLoadError || new Error('account not found');
    } else {
      existingAccount = account;

      pageTitle.textContent = 'Edit Account';
      saveButton.textContent = 'Save Changes';
      form.bank_name.value = account.bank_name;
      form.account_number.value = account.account_number ?? '';
      form.account_type.value = account.account_type;
      form.currency.value = account.currency;
      balanceSymbolEl.textContent = currencySymbol(account.currency);
      form.category.value = account.category;
      balanceInput.value = formatAmount(account.starting_balance);

      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', editingAccountId);

      if (transactionCount > 0) {
        balanceLocked = true;
        balanceInput.disabled = true;
        balanceLockedHint.hidden = false;
      }

      cancelButton.hidden = false;
      cancelButton.addEventListener('click', () => {
        window.location.href = `account.html?id=${editingAccountId}`;
      });

      deleteButton.hidden = false;
      deleteButton.addEventListener('click', async () => {
        const accountLabel = account.account_number ? `${account.bank_name} (${account.account_number})` : account.bank_name;
        const confirmed = await showConfirmDialog(
          [
            { text: 'Delete ' },
            { text: accountLabel, highlight: true },
            { text: "? This also deletes every transaction on this account. This can't be undone." },
          ],
          'Delete Account'
        );
        if (!confirmed) return;

        const { error } = await supabase.from('accounts').delete().eq('id', editingAccountId);
        if (error) {
          errorEl.textContent = "couldn't delete — try again";
          return;
        }

        window.location.href = 'dashboard.html';
      });
    }
  } else {
    const { count } = await supabase.from('accounts').select('id', { count: 'exact', head: true });
    if (count > 0) {
      cancelButton.hidden = false;
      cancelButton.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
      });
    } else {
      pageTitle.textContent = 'Welcome to Tally Up';
      welcomeDescEl.hidden = false;
    }
  }

  if (loadError) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    formSection.hidden = false;

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

      const originalButtonText = saveButton.textContent;
      saveButton.disabled = true;
      saveButton.textContent = 'Saving…';

      function reenableSave() {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
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
          reenableSave();
          return;
        }
      }

      if (existingAccount) {
        const updates = {
          bank_name: bankName,
          account_number: accountNumber || null,
          account_type: accountType,
          currency,
          category,
        };
        if (!balanceLocked) {
          updates.starting_balance = startingBalance;
        }

        const { error } = await supabase.from('accounts').update(updates).eq('id', existingAccount.id);

        if (error) {
          errorEl.textContent = "couldn't save — try again";
          reenableSave();
          return;
        }

        window.location.href = `account.html?id=${existingAccount.id}`;
        return;
      }

      const { data: inserted, error } = await supabase
        .from('accounts')
        .insert({
          user_id: session.user.id,
          bank_name: bankName,
          account_number: accountNumber || null,
          account_type: accountType,
          currency,
          category,
          starting_balance: startingBalance,
        })
        .select()
        .single();

      if (error) {
        errorEl.textContent = "couldn't save — try again";
        reenableSave();
        return;
      }

      newAccountId = inserted.id;
      form.reset();
      reenableSave();
      formSection.hidden = true;
      confirmSection.hidden = false;
    });

    document.getElementById('add-another').addEventListener('click', () => {
      pageTitle.textContent = 'Add an Account';
      welcomeDescEl.hidden = true;
      confirmSection.hidden = true;
      formSection.hidden = false;
    });

    addTransactionNowButton.addEventListener('click', () => {
      window.location.href = `transaction.html?account=${newAccountId}`;
    });

    document.getElementById('done').addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }
}
