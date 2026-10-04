import { supabase } from './supabase-client.js';

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'sign-in.html';
    return null;
  }

  // Email changes confirm asynchronously via a link in the new inbox, so the
  // profiles row can lag the Auth record briefly. Catch up here on every load.
  const { data: profile } = await supabase.from('profiles').select('email').eq('id', session.user.id).single();
  if (profile && profile.email !== session.user.email) {
    await supabase.from('profiles').update({ email: session.user.email }).eq('id', session.user.id);
  }

  return session;
}
