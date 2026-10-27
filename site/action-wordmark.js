/** Shared DD lettering; the control keeps one current accessible name. */
export function setActionLabel(control, label, text) {
  label.dataset.ddLabel = text;
  label.dataset.ddWordmark = 'true';
  const wordmark = document.createElement('span');
  wordmark.className = 'dd-action-wordmark';
  wordmark.setAttribute('aria-hidden', 'true');
  for (let part = 0; part < 2; part++) {
    const half = document.createElement('span');
    half.textContent = text;
    wordmark.append(half);
  }
  label.replaceChildren(wordmark);
  control.setAttribute('aria-label', text);
}

export function enhanceAction(control) {
  const label = control.querySelector('.t-btnflex__text') || control;
  if (label.dataset.ddWordmark === 'true') return;
  const text = control.getAttribute('aria-label') || label.textContent.trim();
  setActionLabel(control, label, text);
}
