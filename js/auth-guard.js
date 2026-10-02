import { supabase } from './supabase-client.js';

export async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'sign-in.html';
    return null;
  }
  return session;
}
