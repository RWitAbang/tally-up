import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';

const session = await requireSession();

if (session) {
  const statusEl = document.getElementById('status');
  const listEl = document.getElementById('account-list');

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .order('bank_name', { ascending: true });

  if (error) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    listEl.innerHTML = '';
    for (const account of accounts) {
      const row = document.createElement('div');
      row.className = 'account-row';
      row.textContent = `${account.bank_name} — ${account.account_type}, ${account.currency}, ${account.category}`;
      listEl.appendChild(row);
    }
  }

  document.getElementById('add-account').addEventListener('click', () => {
    window.location.href = 'setup.html';
  });
}
