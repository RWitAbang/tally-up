import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';

const statusEl = document.getElementById('status');

const session = await requireSession();
if (session) {
  const testBankName = 'connection-test-' + Date.now();

  const { data: inserted, error: insertError } = await supabase
    .from('accounts')
    .insert({
      user_id: session.user.id,
      bank_name: testBankName,
      account_type: 'savings',
      currency: 'NGN',
      category: 'personal',
      starting_balance: 0,
    })
    .select()
    .single();

  if (insertError) {
    statusEl.textContent = 'Insert failed: ' + insertError.message;
  } else {
    const { data: readBack, error: readError } = await supabase
      .from('accounts')
      .select()
      .eq('id', inserted.id)
      .single();

    if (readError) {
      statusEl.textContent = 'Read-back failed: ' + readError.message;
    } else {
      statusEl.textContent = 'Connection works! Saved and read back: ' + JSON.stringify(readBack);
    }
  }
}
