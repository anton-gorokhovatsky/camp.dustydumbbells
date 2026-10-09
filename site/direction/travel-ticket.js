import { normalizeCurrency } from "../currency.js";

// The complete hotel directory and guide remain available without JavaScript.
const directory = document.querySelector('[data-hotel-directory]');
if (directory) {
  const rows = [...directory.querySelectorAll('[data-hotel]')];
  const picker = directory.querySelector('.hotel-picker');
  const choices = [...picker.querySelectorAll('input')];
  const media = window.matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)');
  let active = rows.find(row => `#${row.id}` === location.hash)?.dataset.hotel || directory.dataset.initialHotel;
  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      if (!entry.target.hidden && media.matches) {
        directory.style.setProperty('--hotel-preview-height', `${entry.target.getBoundingClientRect().height}px`);
      }
    }
  });
  function show(id) {
    if (!rows.some(row => row.dataset.hotel === id)) return;
    active = id;
    for (const row of rows) {
      const selected = row.dataset.hotel === active;
      row.hidden = !media.matches && !selected;
      row.classList.toggle('is-previewed', selected);
      row.querySelector('.hotel-preview').hidden = media.matches && !selected;
    }
    for (const choice of choices) choice.checked = choice.value === active;
  }
  function adapt() {
    const focused = document.activeElement;
    const focusedRow = focused.closest('[data-hotel]');
    if (focusedRow) active = focusedRow.dataset.hotel;
    directory.classList.toggle('has-hotel-preview', media.matches);
    directory.classList.toggle('has-hotel-choice', !media.matches);
    picker.hidden = media.matches;
    show(active);
    if (!media.matches) directory.style.removeProperty('--hotel-preview-height');
    if (media.matches && picker.contains(focused)) {
      rows.find(row => row.dataset.hotel === active).querySelector('.hotel-name').focus({ preventScroll: true });
    }
  }
  picker.addEventListener('change', event => show(event.target.value));
  for (const row of rows) {
    resize.observe(row.querySelector('.hotel-preview'));
    row.addEventListener('pointerenter', () => {
      // Pointer movement caused by scrolling must not replace the hotel selected by keyboard.
      const keyboardFocus = directory.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      if (media.matches && !keyboardFocus) show(row.dataset.hotel);
    });
    row.addEventListener('focusin', () => { if (media.matches) show(row.dataset.hotel); });
  }
  media.addEventListener('change', adapt);
  adapt();
  function showDestination(hash) {
    const row = rows.find(row => `#${row.id}` === hash);
    if (row) show(row.dataset.hotel);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#hotel-"]');
    if (link) showDestination(link.hash);
  });
  window.addEventListener('hashchange', () => showDestination(location.hash));
}

// The guide is optional reference material, not a gate to the programme or trip conditions.
// Native disclosures keep independent topics usable with keyboard, touch and no JavaScript.
const guide = document.querySelector('#running-guide');
if (guide) {
  const chapters = [...guide.querySelectorAll('details.guide-section')];
  const narrow = window.matchMedia('(max-width: 999px)');
  const openedOnPhone = new Map(chapters.map(chapter => [chapter.id, false]));
  function openDestination(hash) {
    const destination = document.getElementById(hash.slice(1));
    const chapter = destination?.closest('details.guide-section');
    if (!chapter) return;
    chapter.open = true;
    openedOnPhone.set(chapter.id, true);
  }
  function adaptGuide() {
    guide.classList.toggle('has-guide-disclosures', narrow.matches);
    for (const chapter of chapters) {
      const containsFocus = chapter.contains(document.activeElement);
      chapter.open = !narrow.matches || openedOnPhone.get(chapter.id) || containsFocus;
    }
  }
  for (const chapter of chapters) chapter.addEventListener('toggle', () => {
    if (narrow.matches) openedOnPhone.set(chapter.id, chapter.open);
  });
  guide.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#run-"]');
    if (link) openDestination(link.hash);
  });
  // Reveal a topic before native anchor navigation, including links elsewhere on the page.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#run-"]');
    if (link && !guide.contains(link)) openDestination(link.hash);
  });
  window.addEventListener('hashchange', () => openDestination(location.hash));
  narrow.addEventListener('change', adaptGuide);
  adaptGuide();
  openDestination(location.hash);
}

const currencyReference = document.querySelector('[data-currency-reference]');
if (currencyReference) {
  const endpoint = new URL("../data/currency.json", import.meta.url);
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
