import { normalizeCurrency } from "../currency.js";

// The complete hotel directory and guide remain available without JavaScript.
const directory = document.querySelector('[data-hotel-directory]');
if (directory) {
  const rows = [...directory.querySelectorAll('[data-hotel]')];
  const picker = directory.querySelector('.hotel-picker');
  const choices = [...picker.querySelectorAll('input')];
  const status = directory.querySelector('[data-hotel-status]');
  let active = rows.find(row => `#${row.id}` === location.hash)?.dataset.hotel || directory.dataset.initialHotel;
  function show(id, announce = false) {
    if (!rows.some(row => row.dataset.hotel === id)) return;
    active = id;
    for (const row of rows) {
      const selected = row.dataset.hotel === active;
      row.hidden = !selected;
      row.classList.toggle('is-previewed', selected);
    }
    for (const choice of choices) choice.checked = choice.value === active;
    if (announce) status.textContent = `Фотографии: ${choices.find(choice => choice.checked).closest('label').textContent.trim()}`;
  }
  // Selection and booking have separate roles on every device. CSS alone adapts
  // their layout, so resizing and pointer movement cannot replace the selection.
  directory.classList.add('has-hotel-choice');
  picker.hidden = false;
  picker.addEventListener('change', event => show(event.target.value, true));
  show(active);
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
  const topicView = guide.dataset.guideMode === 'topics';
  const openedTopics = new Map(chapters.map(chapter => [chapter.id, false]));
  function openDestination(hash) {
    const destination = document.getElementById(hash.slice(1));
    const chapter = destination?.closest('details.guide-section');
    if (!chapter) return;
    chapter.open = true;
    openedTopics.set(chapter.id, true);
  }
  function adaptGuide() {
    guide.classList.toggle('has-guide-disclosures', topicView || narrow.matches);
    for (const chapter of chapters) {
      const containsFocus = chapter.contains(document.activeElement);
      chapter.open = !(topicView || narrow.matches) || openedTopics.get(chapter.id) || containsFocus;
    }
  }
  for (const chapter of chapters) chapter.addEventListener('toggle', () => {
    if (topicView || narrow.matches) openedTopics.set(chapter.id, chapter.open);
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
