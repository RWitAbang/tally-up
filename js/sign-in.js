import { supabase } from './supabase-client.js';
import { attachPasswordToggle } from './password-field.js';

const form = document.getElementById('sign-in-form');
const errorEl = document.getElementById('error');
attachPasswordToggle(document.getElementById('password'));

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';

  const email = form.email.value;
  const password = form.password.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = 'incorrect email or password';
    return;
  }

  window.location.href = 'index.html';
});
