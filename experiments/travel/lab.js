import { normalizeCurrency } from '../../currency.js';

// The complete hotel directory and guide remain available without JavaScript.
const directory = document.querySelector('[data-hotel-directory]');
if (directory) {
  const rows = [...directory.querySelectorAll('[data-hotel]')];
  const media = window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)');
  let active = directory.dataset.initialHotel;
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (!entry.target.hidden && media.matches) {
        directory.style.setProperty('--hotel-preview-height', `${entry.target.getBoundingClientRect().height}px`);
      }
    }
  });
  function show(id) {
    active = id;
    for (const row of rows) {
      const selected = row.dataset.hotel === active;
      row.classList.toggle('is-previewed', selected);
      row.querySelector('.hotel-preview').hidden = media.matches && !selected;
    }
  }
  function adapt() {
    directory.classList.toggle('has-hotel-preview', media.matches);
    show(active);
    if (!media.matches) directory.style.removeProperty('--hotel-preview-height');
  }
  for (const row of rows) {
    resize.observe(row.querySelector('.hotel-preview'));
    row.addEventListener('pointerenter', () => {
      // Do not change the preview under a keyboard user who is following its source link.
      const keyboardFocus = document.activeElement.closest('.hotel-preview') && document.activeElement.matches(':focus-visible');
      if (media.matches && !keyboardFocus) show(row.dataset.hotel);
    });
    row.addEventListener('focusin', () => { if (media.matches) show(row.dataset.hotel); });
  }
  media.addEventListener('change', adapt);
  adapt();
}

const currencyReference = document.querySelector('[data-currency-reference]');
if (currencyReference) {
  const endpoint = new URL('../../data/currency.json', import.meta.url);
  fetch(endpoint, { cache: 'no-cache' }).then(response => {
    if (!response.ok) throw new Error('Currency snapshot unavailable');
    return response.json();
  }).then(payload => {
    const currency = normalizeCurrency(payload);
    if (!currency) return;
    const number = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    for (const value of currencyReference.querySelectorAll('[data-currency]')) {
      value.textContent = `${number.format(currency.rates[value.dataset.currency])} ₽`;
    }
    const time = currencyReference.querySelector('time');
    time.dateTime = currency.effectiveDate;
    time.textContent = new Intl.DateTimeFormat('ru-RU', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Moscow' }).format(new Date(`${currency.effectiveDate}T12:00:00+03:00`));
    currencyReference.querySelector('.currency-source a').href = currency.source;
  }).catch(() => {
    // Keep the last dated, server-rendered values without a blocking error or fake quote.
  });
}
