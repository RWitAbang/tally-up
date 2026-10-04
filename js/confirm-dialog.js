export function showConfirmDialog(message, confirmLabel = 'Delete') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const messageEl = document.createElement('p');
    messageEl.className = 'confirm-message';
    messageEl.textContent = message;
    box.appendChild(messageEl);

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'secondary';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'confirm-destructive';
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function cleanup(result) {
      document.removeEventListener('keydown', onKeyDown);
      document.body.removeChild(overlay);
      resolve(result);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') cleanup(false);
    }

    cancelBtn.addEventListener('click', () => cleanup(false));
    confirmBtn.addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) cleanup(false);
    });
    document.addEventListener('keydown', onKeyDown);

    confirmBtn.focus();
  });
}
