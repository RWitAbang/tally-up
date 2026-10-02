import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';

const session = await requireSession();

if (session) {
  const statusEl = document.getElementById('status');

  const { data: accounts, error } = await supabase.from('accounts').select('id').limit(1);

  if (error) {
    statusEl.textContent = "couldn't load — try again";
  } else if (!accounts || accounts.length === 0) {
    window.location.href = 'setup.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}
