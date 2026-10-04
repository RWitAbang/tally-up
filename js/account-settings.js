import { supabase } from './supabase-client.js';
import { requireSession } from './auth-guard.js';

const session = await requireSession();

if (session) {
  const statusEl = document.getElementById('status');
  const form = document.getElementById('settings-form');
  const errorEl = document.getElementById('error');
  const successEl = document.getElementById('success');
  const passwordErrorEl = document.getElementById('password-error');
  const emailHintEl = document.getElementById('email-hint');
  const saveButton = document.getElementById('save-button');

  const { data: profile, error: profileLoadError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileLoadError) {
    statusEl.textContent = "couldn't load — try again";
  } else {
    statusEl.textContent = '';
    form.hidden = false;

    form.name.value = profile.name ?? '';
    form.surname.value = profile.surname ?? '';
    form.email.value = session.user.email;
  }

  document.getElementById('back').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  document.getElementById('cancel').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    successEl.textContent = '';
    passwordErrorEl.textContent = '';
    emailHintEl.textContent = '';

    const name = form.name.value.trim();
    const surname = form.surname.value.trim();
    const email = form.email.value.trim();
    const newPassword = form.new_password.value;

    if (!name || !surname) {
      errorEl.textContent = 'please enter your name and surname';
      return;
    }

    if (newPassword && newPassword.length < 6) {
      passwordErrorEl.textContent = 'password must be at least 6 characters';
      return;
    }

    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name, surname })
      .eq('id', session.user.id);

    if (profileError) {
      errorEl.textContent = "couldn't save — try again";
      saveButton.disabled = false;
      saveButton.textContent = originalButtonText;
      return;
    }

    const messages = ['Name and surname saved.'];

    if (email !== session.user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError) {
        errorEl.textContent = "couldn't update email — try again";
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        return;
      }
      emailHintEl.textContent = 'Check your new email for a confirmation link — your email updates once confirmed.';
    }

    if (newPassword) {
      const { error: passwordUpdateError } = await supabase.auth.updateUser({ password: newPassword });
      if (passwordUpdateError) {
        errorEl.textContent = "couldn't update password — try again";
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
        return;
      }
      messages.push('Password updated.');
      form.new_password.value = '';
    }

    successEl.textContent = messages.join(' ');
    saveButton.disabled = false;
    saveButton.textContent = originalButtonText;
  });
}
