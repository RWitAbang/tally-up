export function attachPasswordToggle(inputEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'password-field';
  inputEl.parentNode.insertBefore(wrapper, inputEl);
  wrapper.appendChild(inputEl);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'password-toggle';
  toggle.textContent = 'Show';
  toggle.setAttribute('aria-label', 'Show password');
  wrapper.appendChild(toggle);

  toggle.addEventListener('click', () => {
    const showing = inputEl.type === 'text';
    inputEl.type = showing ? 'password' : 'text';
    toggle.textContent = showing ? 'Show' : 'Hide';
    toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  });
}
