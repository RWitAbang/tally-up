import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { formatAmount, parseAmount, attachLiveAmountFormatting, currencySymbol } from './currency.js';
import { showConfirmDialog } from './confirm-dialog.js';
import { downloadImportTemplate, parseImportFile } from './import-transactions.js';
import { formatDateFriendly } from './date-utils.js';

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
  const accountTypeSelect = document.getElementById('account_type');
  const ngnOption = currencySelect.querySelector('option[value="NGN"]');
  const balanceSymbolEl = document.getElementById('balance-symbol');
  const importSection = document.getElementById('import-section');
  const downloadTemplateButton = document.getElementById('download-template');
  const uploadTemplateButton = document.getElementById('upload-template');
  const importFileInput = document.getElementById('import-file');
  const importFilenameEl = document.getElementById('import-filename');
  const importErrorEl = document.getElementById('import-error');
  const importPreviewEl = document.getElementById('import-preview');
  const importSummaryEl = document.getElementById('import-summary');
  const importSkippedEl = document.getElementById('import-skipped');
  const confirmMessageEl = document.getElementById('confirm-message');
  const importQuestionEl = document.getElementById('import-question');
  const importChoiceYesButton = document.getElementById('import-choice-yes');
  const importChoiceNoButton = document.getElementById('import-choice-no');
  const accountFieldsEl = document.getElementById('account-fields');
  const manualBalanceFieldEl = document.getElementById('manual-balance-field');
  const importBalanceReadoutEl = document.getElementById('import-balance-readout');
  const importHeaderEl = document.getElementById('import-header');

  let newAccountId = null;
  let balanceLocked = false;
  let pendingImport = null;

  function resetImportState() {
    pendingImport = null;
    importFileInput.value = '';
    importFilenameEl.hidden = true;
    importErrorEl.textContent = '';
    importPreviewEl.hidden = true;
    importHeaderEl.hidden = false;
  }

  function updateImportBalanceReadout() {
    importBalanceReadoutEl.textContent =
      `Starting Balance: ${currencySymbol(currencySelect.value)}${formatAmount(pendingImport.startingBalance)} (from your imported file)`;
  }

  function showImportChoice() {
    accountFieldsEl.hidden = true;
    importSection.hidden = false;
    resetImportState();
    balanceInput.value = '';
  }

  function showManualEntry() {
    importQuestionEl.hidden = true;
    importSection.hidden = true;
    resetImportState();
    balanceInput.value = '';
    accountFieldsEl.hidden = false;
    manualBalanceFieldEl.hidden = false;
    importBalanceReadoutEl.hidden = true;
  }

  importChoiceYesButton.addEventListener('click', showImportChoice);
  importChoiceNoButton.addEventListener('click', showManualEntry);

  downloadTemplateButton.addEventListener('click', () => downloadImportTemplate());
  uploadTemplateButton.addEventListener('click', () => importFileInput.click());

  importFileInput.addEventListener('change', async () => {
    importErrorEl.textContent = '';
    importPreviewEl.hidden = true;
    pendingImport = null;

    const file = importFileInput.files[0];
    if (!file) {
      importFilenameEl.hidden = true;
      return;
    }

    importFilenameEl.textContent = `Selected: ${file.name}`;
    importFilenameEl.hidden = false;

    try {
      const result = await parseImportFile(file);
      if (result.transactions.length === 0) {
        importErrorEl.textContent = 'no valid transactions found in this file';
        importFileInput.value = '';
        importFilenameEl.hidden = true;
        return;
      }

      pendingImport = result;
      balanceInput.value = formatAmount(result.startingBalance);
      importQuestionEl.hidden = true;
      importHeaderEl.hidden = true;
      importFilenameEl.textContent = `Uploaded: ${file.name}`;
      accountFieldsEl.hidden = false;
      manualBalanceFieldEl.hidden = true;
      importBalanceReadoutEl.hidden = false;
      updateImportBalanceReadout();

      const dates = result.transactions.map((t) => t.date).sort();
      const count = result.transactions.length;
      importSummaryEl.textContent =
        `Found ${count} transaction${count === 1 ? '' : 's'}, from ${formatDateFriendly(dates[0])} to ` +
        `${formatDateFriendly(dates[dates.length - 1])}. Starting balance set to ${formatAmount(result.startingBalance)}.`;

      importSkippedEl.innerHTML = '';
      if (result.skipped.length > 0) {
        const header = document.createElement('li');
        header.textContent = `${result.skipped.length} row${result.skipped.length === 1 ? '' : 's'} skipped:`;
        importSkippedEl.appendChild(header);
        for (const skip of result.skipped.slice(0, 10)) {
          const li = document.createElement('li');
          li.textContent = `Row ${skip.row}: ${skip.reason}`;
          importSkippedEl.appendChild(li);
        }
        if (result.skipped.length > 10) {
          const li = document.createElement('li');
          li.textContent = `…and ${result.skipped.length - 10} more`;
          importSkippedEl.appendChild(li);
        }
      }

      importPreviewEl.hidden = false;
    } catch (err) {
      importErrorEl.textContent = err.message;
      importFileInput.value = '';
      importFilenameEl.hidden = true;
    }
  });

  attachLiveAmountFormatting(balanceInput);

  accountNumberInput.addEventListener('input', () => {
    accountNumberInput.value = accountNumberInput.value.replace(/[^0-9]/g, '');
  });

  currencySelect.addEventListener('change', () => {
    balanceSymbolEl.textContent = currencySymbol(currencySelect.value);
    if (pendingImport) updateImportBalanceReadout();
  });
  balanceSymbolEl.textContent = currencySymbol(currencySelect.value);

  function isDomiciliaryType(type) {
    return type === 'domiciliary' || type === 'domiciliary_card';
  }

  // A domiciliary account is a foreign-currency account by definition, so
  // Naira is never a valid choice for one. Disabling rather than removing
  // the option means a pre-existing account saved with this combination
  // (from before this rule existed) still displays correctly when edited.
  ngnOption.disabled = isDomiciliaryType(accountTypeSelect.value);

  accountTypeSelect.addEventListener('change', () => {
    const restrictNgn = isDomiciliaryType(accountTypeSelect.value);
    ngnOption.disabled = restrictNgn;
    if (restrictNgn && currencySelect.value === 'NGN') {
      currencySelect.value = 'USD';
      balanceSymbolEl.textContent = currencySymbol(currencySelect.value);
      if (pendingImport) updateImportBalanceReadout();
    }
  });

  let existingAccount = null;
  let loadError = null;

  if (editingAccountId) {
    statusEl.innerHTML = '<div class="spinner"></div>';
    formSection.hidden = true;
    importQuestionEl.hidden = true;
    importSection.hidden = true;
    accountFieldsEl.hidden = false;

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
      ngnOption.disabled = isDomiciliaryType(account.account_type);
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

      if (pendingImport) {
        const rows = pendingImport.transactions.map((t) => ({
          user_id: session.user.id,
          account_id: inserted.id,
          date: t.date,
          type: t.type,
          description: t.description || null,
          amount: t.amount,
        }));
        const { error: importError } = await supabase.from('transactions').insert(rows);
        confirmMessageEl.textContent = importError
          ? 'Account added, but the import failed — try adding those transactions from the account page.'
          : `Account added! Imported ${rows.length} transaction${rows.length === 1 ? '' : 's'}.`;
      } else {
        confirmMessageEl.textContent = 'Account added!';
      }

      form.reset();
      resetImportState();
      reenableSave();
      formSection.hidden = true;
      confirmSection.hidden = false;
    });

    document.getElementById('add-another').addEventListener('click', () => {
      pageTitle.textContent = 'Add an Account';
      welcomeDescEl.hidden = true;
      confirmSection.hidden = true;
      formSection.hidden = false;
      importQuestionEl.hidden = false;
      accountFieldsEl.hidden = true;
      importSection.hidden = true;
      resetImportState();
      balanceInput.value = '';
    });

    addTransactionNowButton.addEventListener('click', () => {
      window.location.href = `transaction.html?account=${newAccountId}`;
    });

    document.getElementById('done').addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
  }
}
