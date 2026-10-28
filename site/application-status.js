/** One visible status replaces the submit action while waiting and after receipt. */
import { setActionLabel } from './action-wordmark.js';

export function createApplicationStatus(form) {
  const button = form.querySelector('[type="submit"]');
  const label = button.querySelector('.t-btnflex__text') || button;
  const original = label.dataset.ddLabel || label.textContent;
  const status = document.createElement('p');
  status.className = 'dd-form-status t-text t-text_xs';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  status.tabIndex = -1;
  status.hidden = true;
  button.parentElement.append(status);
  return {
    show(state = 'idle', text = '', detail = '') {
      form.dataset.applicationState = state;
      status.dataset.state = state;
      status.textContent = text;
      if (detail) {
        const title = document.createElement('strong'); title.textContent = text;
        const explanation = document.createElement('span'); explanation.textContent = detail;
        status.replaceChildren(title, explanation);
      }
      status.hidden = !text;
      button.hidden = state === 'pending' || state === 'success';
      button.disabled = button.hidden;
      const next = state === 'error' ? 'Отправить ещё раз' : original;
      if (label.dataset.ddWordmark === 'true') setActionLabel(button, label, next);
      else label.textContent = next;
      if (text) status.focus({preventScroll: true});
    },
  };
}
