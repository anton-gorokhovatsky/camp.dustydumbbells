/** One visible status replaces the submit action while waiting and after receipt. */
export function createApplicationStatus(form) {
  const button = form.querySelector('[type="submit"]');
  const label = button.querySelector('.t-btnflex__text') || button;
  const original = label.textContent;
  const status = document.createElement('p');
  status.className = 'dd-form-status t-text t-text_xs';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  status.tabIndex = -1;
  status.hidden = true;
  button.parentElement.append(status);
  return {
    show(state = 'idle', text = '') {
      form.dataset.applicationState = state;
      status.dataset.state = state;
      status.textContent = text;
      status.hidden = !text;
      button.hidden = state === 'pending' || state === 'success';
      button.disabled = button.hidden;
      label.textContent = state === 'error' ? 'Отправить ещё раз' : original;
      if (text) status.focus({preventScroll: true});
    },
  };
}
