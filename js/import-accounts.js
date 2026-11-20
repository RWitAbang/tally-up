import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';
import { downloadImportTemplate, parseImportWorkbook } from './import-transactions.js';
import { formatAmount, currencySymbol } from './currency.js';
import { allowedCurrenciesForType, restrictCurrencyOptions } from './account-currency-rules.js';

const session = await requireSession();

if (session) {
  const uploadSection = document.getElementById('upload-section');
  const reviewSection = document.getElementById('review-section');
  const confirmSection = document.getElementById('confirm-section');
  const downloadTemplateButton = document.getElementById('download-template');
  const uploadWorkbookButton = document.getElementById('upload-workbook');
  const workbookFileInput = document.getElementById('workbook-file');
  const uploadFilenameEl = document.getElementById('upload-filename');
  const uploadErrorEl = document.getElementById('upload-error');
  const sheetCountEl = document.getElementById('sheet-count');
  const accountCardsEl = document.getElementById('account-cards');
  const confirmImportButton = document.getElementById('confirm-import');
  const importErrorEl = document.getElementById('import-error');
  const confirmMessageEl = document.getElementById('confirm-message');

  document.getElementById('cancel').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  document.getElementById('done').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  downloadTemplateButton.addEventListener('click', async () => {
    try {
      await downloadImportTemplate();
    } catch (err) {
      uploadErrorEl.textContent = err.message;
    }
  });

  uploadWorkbookButton.addEventListener('click', () => workbookFileInput.click());

  // One entry per sheet, importable ones carrying the editable fields the
  // template itself has no way to specify (account type/currency/category
  // aren't something a spreadsheet cell can validate against the app's
  // own rules, so they're always collected here, not read from the file).
  let parsedAccounts = [];

  workbookFileInput.addEventListener('change', async () => {
    uploadErrorEl.textContent = '';
    const file = workbookFileInput.files[0];
    if (!file) return;

    uploadFilenameEl.textContent = `Selected: ${file.name}`;
    uploadFilenameEl.hidden = false;

    try {
      const sheets = await parseImportWorkbook(file);
      parsedAccounts = sheets.map((sheet) => ({
        ...sheet,
        included: !sheet.error,
        bankName: sheet.error ? '' : sheet.sheetName,
        accountNumber: '',
        accountType: 'savings',
        currency: 'NGN',
        category: 'personal',
      }));
      renderReview();
    } catch (err) {
      uploadErrorEl.textContent = err.message;
      uploadFilenameEl.hidden = true;
      workbookFileInput.value = '';
    }
  });

  function renderReview() {
    const importable = parsedAccounts.filter((a) => !a.error).length;
    const broken = parsedAccounts.length - importable;
    sheetCountEl.textContent =
      `${parsedAccounts.length} sheet${parsedAccounts.length === 1 ? '' : 's'}` +
      (broken > 0 ? ` (${broken} couldn't be read)` : '');

    accountCardsEl.innerHTML = parsedAccounts.map((account, i) => renderCard(account, i)).join('');

    parsedAccounts.forEach((account, i) => {
      if (account.error) return;

      const typeSelect = document.getElementById(`account-type-${i}`);
      const currencySelect = document.getElementById(`currency-${i}`);
      restrictCurrencyOptions(currencySelect, account.accountType);

      document.getElementById(`include-${i}`).addEventListener('change', (e) => {
        account.included = e.target.checked;
        document.getElementById(`card-${i}`).classList.toggle('excluded', !account.included);
      });
      document.getElementById(`bank-name-${i}`).addEventListener('input', (e) => {
        account.bankName = e.target.value;
      });
      document.getElementById(`account-number-${i}`).addEventListener('input', (e) => {
        account.accountNumber = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = account.accountNumber;
      });
      typeSelect.addEventListener('change', () => {
        account.accountType = typeSelect.value;
        restrictCurrencyOptions(currencySelect, account.accountType);
        const allowed = allowedCurrenciesForType(account.accountType);
        if (!allowed.includes(currencySelect.value)) {
          currencySelect.value = allowed[0];
          account.currency = currencySelect.value;
        }
      });
      currencySelect.addEventListener('change', () => {
        account.currency = currencySelect.value;
      });
      document.getElementById(`category-${i}`).addEventListener('change', (e) => {
        account.category = e.target.value;
      });
    });

    uploadSection.hidden = true;
    reviewSection.hidden = false;
  }

  function renderCard(account, i) {
    if (account.error) {
      return `
        <div class="import-account-card excluded" id="card-${i}">
          <div class="import-account-card-header">
            <strong>${account.sheetName}</strong>
          </div>
          <p class="error">${account.error} — this sheet will be skipped.</p>
        </div>
      `;
    }

    const skippedNote =
      account.skipped.length > 0
        ? `, ${account.skipped.length} row${account.skipped.length === 1 ? '' : 's'} skipped`
        : '';

    return `
      <div class="import-account-card" id="card-${i}">
        <div class="import-account-card-header">
          <label>
            <input type="checkbox" id="include-${i}" checked />
            Include this account
          </label>
        </div>
        <p class="import-account-summary">
          Starting balance ${currencySymbol(account.currency)}${formatAmount(account.startingBalance)},
          ${account.transactions.length} transaction${account.transactions.length === 1 ? '' : 's'}${skippedNote}
        </p>
        <div class="import-account-fields">
          <div>
            <label for="bank-name-${i}">Bank Name</label>
            <input type="text" id="bank-name-${i}" value="${account.bankName}" required />
          </div>
          <div>
            <label for="account-number-${i}">Account Number (optional)</label>
            <input type="text" inputmode="numeric" id="account-number-${i}" placeholder="e.g. 0123456789" />
          </div>
          <div>
            <label for="account-type-${i}">Account Type</label>
            <select id="account-type-${i}">
              <option value="savings">Savings</option>
              <option value="current">Current</option>
              <option value="domiciliary">Domiciliary</option>
              <option value="utility_card">Utility Card</option>
              <option value="domiciliary_card">Domiciliary Card</option>
            </select>
          </div>
          <div>
            <label for="currency-${i}">Currency</label>
            <select id="currency-${i}">
              <option value="NGN">Naira (₦)</option>
              <option value="USD">Dollar ($)</option>
              <option value="GBP">Pound (£)</option>
            </select>
          </div>
          <div>
            <label for="category-${i}">Personal or Business</label>
            <select id="category-${i}">
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  confirmImportButton.addEventListener('click', async () => {
    importErrorEl.textContent = '';
    const toImport = parsedAccounts.filter((a) => !a.error && a.included);

    if (toImport.length === 0) {
      importErrorEl.textContent = 'select at least one account to import';
      return;
    }

    const missingBankName = toImport.some((a) => !a.bankName.trim());
    if (missingBankName) {
      importErrorEl.textContent = 'every included account needs a bank name';
      return;
    }

    const originalButtonText = confirmImportButton.textContent;
    confirmImportButton.disabled = true;
    confirmImportButton.textContent = 'Importing…';

    let accountsCreated = 0;
    let transactionsCreated = 0;
    let failures = [];

    for (const account of toImport) {
      const { data: inserted, error } = await supabase
        .from('accounts')
        .insert({
          user_id: session.user.id,
          bank_name: account.bankName.trim(),
          account_number: account.accountNumber || null,
          account_type: account.accountType,
          currency: account.currency,
          category: account.category,
          starting_balance: account.startingBalance,
        })
        .select()
        .single();

      if (error) {
        failures.push(account.bankName.trim());
        continue;
      }

      accountsCreated++;

      if (account.transactions.length > 0) {
        const rows = account.transactions.map((t) => ({
          user_id: session.user.id,
          account_id: inserted.id,
          date: t.date,
          type: t.type,
          description: t.description || null,
          amount: t.amount,
        }));
        const { error: txError } = await supabase.from('transactions').insert(rows);
        if (!txError) transactionsCreated += rows.length;
      }
    }

    confirmImportButton.disabled = false;
    confirmImportButton.textContent = originalButtonText;

    if (accountsCreated === 0) {
      importErrorEl.textContent = "couldn't import any accounts — try again";
      return;
    }

    confirmMessageEl.textContent =
      `Imported ${accountsCreated} account${accountsCreated === 1 ? '' : 's'} with ` +
      `${transactionsCreated} transaction${transactionsCreated === 1 ? '' : 's'}.` +
      (failures.length > 0 ? ` Couldn't import: ${failures.join(', ')}.` : '');

    reviewSection.hidden = true;
    confirmSection.hidden = false;
  });
}
