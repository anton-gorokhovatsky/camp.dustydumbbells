import { applicationEndpoint } from './application-config.js';
import { fieldNames, travelField, validateFields, acceptedReply } from './application-validation.js';
import { createApplicationStatus } from './application-status.js';
import { initFormWidgets } from './form-widgets.js';

// The original gallery opens on a photo click; give its images the same keyboard action.
document.addEventListener('keydown', event => {
  if (!['Enter', ' '].includes(event.key) || !event.target.matches('img.t1148__img[role="button"]')) return;
  event.preventDefault();
  event.target.click();
});

const form = document.getElementById('form1016216116');
if (form) initApplication(form);

function initApplication(form) {
  initFormWidgets(form);
  const button = form.querySelector('[type="submit"]');
  const status = createApplicationStatus(form);
  const trap = document.createElement('label');
  trap.className = 'dd-form-honeypot';
  trap.setAttribute('aria-hidden', 'true');
  trap.textContent = 'Ваш сайт';
  const honeypot = document.createElement('input');
  honeypot.name = 'website';
  honeypot.tabIndex = -1;
  honeypot.autocomplete = 'off';
  trap.append(honeypot);
  form.append(trap);
  let pending = null;
  let retry = null;
  let completed = false;
  let lockedControls = [];

  // Local Tilda files provide only the original field widgets and geometry.
  // The processing class and receiver IDs were removed at build time.
  form.noValidate = true;
  button.disabled = false;
  form.querySelectorAll('input, textarea').forEach(input => {
    const label = input.getAttribute('placeholder');
    if (label && !input.hasAttribute('aria-label')) input.setAttribute('aria-label', label.trim());
    if (input.name && !['hidden', 'radio'].includes(input.type)) input.maxLength = input.name === 'Textarea' ? 4000 : 254;
  });
  function labelPhoneInputs() {
    for (const name of ['Phone', 'Phone_2']) {
      const group = [...form.querySelectorAll('[data-field-name]')].find(group => group.dataset.fieldName === name);
      const phone = group?.querySelector('input[type="tel"]');
      phone?.setAttribute('aria-label', name === 'Phone' ? 'Телефон' : 'Телефон партнёра');
    }
  }
  labelPhoneInputs();
  form.addEventListener('inputReady', labelPhoneInputs, true);
  function readFields() {
    const data = new FormData(form);
    return Object.fromEntries(fieldNames.map(name => [name, String(data.get(name) || '').trim()]));
  }
  function clearCorrectedError(event) {
    const group = event.target.closest('[data-field-name]');
    if (!group?.querySelector('[aria-invalid="true"]')) return;
    if (!validateFields(readFields())[group.dataset.fieldName]) {
      group.querySelector('.t-input-error')?.replaceChildren();
      group.querySelectorAll('[aria-invalid="true"]').forEach(input => input.removeAttribute('aria-invalid'));
    }
  }
  form.addEventListener('input', clearCorrectedError);
  form.addEventListener('change', clearCorrectedError);

  function message(text, state) {
    status.show(state, text);
  }

  function clearErrors() {
    form.querySelectorAll('[aria-invalid="true"]').forEach(input => input.removeAttribute('aria-invalid'));
    form.querySelectorAll('.t-input-error').forEach(error => { error.textContent = ''; });
  }

  function showErrors(errors) {
    let first;
    for (const [name, text] of Object.entries(errors)) {
      const group = [...form.querySelectorAll('[data-field-name]')].find(group => group.dataset.fieldName === name);
      const input = group?.querySelector('input:not([type="hidden"]), textarea');
      const error = group?.querySelector('.t-input-error');
      if (error) {
        if (!error.id) error.id = `dd-error-${group.dataset.inputLid}`;
        error.textContent = text;
        if (input) input.setAttribute('aria-describedby', [...new Set([...(input.getAttribute('aria-describedby') || '').split(/\s+/),error.id])].filter(Boolean).join(' '));
      }
      if (input) { input.setAttribute('aria-invalid', 'true'); first ||= input; }
    }
    first?.focus();
  }

  function finish(ok, text) {
    if (pending) {
      clearTimeout(pending.timer);
      pending.frame.remove();
      pending.post.remove();
      pending = null;
    }
    form.removeAttribute('aria-busy');
    for (const input of lockedControls) input.disabled = ok;
    lockedControls = [];
    completed = ok;
    message(text, ok ? 'success' : 'error');
    if (ok) retry = null;
  }

  window.addEventListener('message', event => {
    if (!acceptedReply(event, pending)) return;
    finish(event.data.ok === true, event.data.ok === true ? 'Заявка отправлена' :
      event.data.code === 'INVALID' ? 'Проверьте заполненные поля и отправьте заявку ещё раз.' :
      'Не удалось сохранить заявку. Ваши данные остались в форме — попробуйте отправить ещё раз.');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    if (pending || completed) return;
    clearErrors();
    status.show();
    const fields = readFields();
    const errors = validateFields(fields);
    if (Object.keys(errors).length) { showErrors(errors); return; }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(applicationEndpoint)) {
      message('Не удалось отправить заявку. Попробуйте позже — заполненные поля сохранены.', 'error');
      return;
    }
    // A repeated attempt of unchanged data uses the same ID, so a lost reply cannot duplicate a row.
    if (fields[travelField] === 'Один') for (const name of fieldNames) if (/_2$|-p$/.test(name)) fields[name] = '';
    const signature = JSON.stringify(fields);
    if (!retry || retry.signature !== signature) retry = {signature, id: crypto.randomUUID()};
    const nonce = [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const frame = document.createElement('iframe');
    frame.name = `dd-application-${nonce}`;
    frame.title = 'Отправка заявки';
    frame.hidden = true;
    const post = document.createElement('form');
    post.hidden = true;
    post.method = 'POST';
    post.action = applicationEndpoint;
    post.target = frame.name;
    const payload = document.createElement('input');
    payload.type = 'hidden';
    payload.name = 'payload';
    payload.value = JSON.stringify({id: retry.id, nonce, fields, origin: location.origin,
      source: location.origin + location.pathname, consent: true, website: honeypot.value});
    post.append(payload);
    document.body.append(frame, post);
    pending = {id: retry.id, nonce, frame, post};
    pending.timer = setTimeout(() => finish(false,
      'Подтверждение не пришло. Проверьте соединение и отправьте ещё раз — повторная отправка не создаст дубликат.'), 45000);
    form.setAttribute('aria-busy', 'true');
    form.dispatchEvent(new CustomEvent('dd-close-calendars'));
    lockedControls = [...form.querySelectorAll('input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled):not([type="submit"])')];
    lockedControls.forEach(input => { input.disabled = true; });
    message('Отправляем заявку…', 'pending');
    post.submit();
  });
}
