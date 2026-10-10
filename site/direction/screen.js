import { photos, photoUse } from "../content.js";
import { typograph } from "../typography.js";
import { environmentAt, placeClock, clockText, solarDay, normalizeWeather, weatherLabel, windDirection } from "../environment.js";
import { forecastURL, normalizeForecast, forecastCondition, dayText, decimal, temperature } from "./forecast.js";
import { paintAtmosphere } from "./atmosphere.js";
import { setupNavigation } from "./navigation.js";
import { setupSeaMotion } from "./sea-motion.js";

const root = document.documentElement;
const $ = (selector) => document.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
setupSeaMotion(reduced);
let weather = null;
let forecast = null;
let weatherDay = null;
let lastWeatherAttempt = 0;
let moving = !reduced.matches;
let model;
let frame = 0;
let lastFrame = 0;
let elapsed = 0;
let onScreen = true;
let isLoading = false;
let positionedForecastDay = null;
const canvas = $('#atmosphere');
const context = canvas.getContext('2d');
let width = 1, height = 1;

function render() {
  const date = new Date();
  const firstRender = !model;
  model = environmentAt({ date, weather });
  root.dataset.phase = model.phase;
  root.dataset.motion = moving ? 'on' : 'off';
  for (const [name, value] of Object.entries(model.css)) root.style.setProperty(name, value);
  $('#local-clock').textContent = typograph(clockText(placeClock(date).minutes));
  updateForecastHour();
  draw();
  scheduleFrame();
  if (firstRender) requestAnimationFrame(() => { root.dataset.environmentReady = 'true'; });
}

function draw() {
  paintAtmosphere(context, model, width, height, elapsed);
}

function shouldMove() { return moving && !document.hidden && onScreen && !document.querySelector('dialog[open]'); }
function scheduleFrame() {
  if (!shouldMove()) { cancelAnimationFrame(frame); frame = 0; lastFrame = 0; return; }
  if (frame) return;
  frame = requestAnimationFrame(tick);
}
function tick(time) {
  frame = 0;
  if (!shouldMove()) { lastFrame = 0; return; }
  if (!lastFrame || time - lastFrame >= 32) {
    elapsed += lastFrame ? Math.min(time - lastFrame, 80) / 1000 : 0;
    lastFrame = time;
    draw();
  }
  scheduleFrame();
}
new ResizeObserver(() => {
  const box = canvas.getBoundingClientRect();
  width = box.width; height = box.height;
  const ratio = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}).observe(canvas);
new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; scheduleFrame(); }).observe(canvas);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    render();
    if (Date.now() - lastWeatherAttempt >= 30 * 60 * 1000) loadWeather();
  }
  scheduleFrame();
});
reduced.addEventListener('change', () => { moving = !reduced.matches; render(); });
window.addEventListener('online', () => { if (!weather || !forecast) loadWeather(); });

// The scene follows real weather; today's forecast is an open section after the cover.
async function loadWeather() {
  if (isLoading) return;
  isLoading = true;
  lastWeatherAttempt = Date.now();
  renderWeather();
  try {
    const response = await fetch(forecastURL(), { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Weather unavailable');
    const payload = await response.json();
    weather = normalizeWeather(payload);
    forecast = normalizeForecast(payload);
    weatherDay = weather ? placeClock().day : null;
  } catch {
    weather = null;
    forecast = null;
    weatherDay = null;
  } finally {
    isLoading = false;
    renderWeather();
    render();
  }
}
setInterval(() => {
  if (document.hidden) return;
  const stale = weather && Date.now() - new Date(weather.stamp).getTime() > 2 * 60 * 60 * 1000;
  const changedDay = (weatherDay && weatherDay !== placeClock().day) || (forecast && forecast.day !== placeClock().day);
  if (stale || changedDay) { weather = null; forecast = null; weatherDay = null; renderWeather(); }
  if (changedDay || Date.now() - lastWeatherAttempt >= 30 * 60 * 1000) loadWeather();
  render();
}, 60000);

function renderWeather() {
  root.dataset.weather = isLoading ? 'loading' : forecast ? 'ready' : 'unavailable';
  $('#current-air').textContent = typograph(weather ? temperature(weather.temperature) : isLoading ? '…' : '—');
  $('#current-condition').textContent = typograph(weather ? weatherLabel(weather) : '');
  $('#forecast-date').textContent = typograph(dayText(new Date()));
  $('#forecast-status').hidden = Boolean(forecast);
  $('#forecast-status').textContent = typograph(isLoading ? 'Загружаем прогноз…' : 'Прогноз временно недоступен.');
  $('#forecast-content').hidden = !forecast;
  if (!forecast) return;
  const solar = solarDay(new Date());
  $('#forecast-range').textContent = typograph(`${temperature(forecast.low)}…${temperature(forecast.high)}`);
  $('#current-wind').textContent = typograph(weather ? `${decimal(weather.wind)} м/с, ${windDirection(weather.direction)}` : 'Нет данных');
  $('#forecast-rain').textContent = typograph(forecast.rain === null ? 'Нет данных' : `${decimal(forecast.rain)} мм`);
  $('#sun-times').textContent = typograph(`${clockText(solar.sunrise)} / ${clockText(solar.sunset)}`);
  const rows = forecast.hours.map(hour => {
    const row = document.createElement('li');
    const time = document.createElement('time');
    time.dateTime = `${forecast.day}T${hour.time}+03:00`;
    time.textContent = hour.time;
    const air = document.createElement('span');
    air.textContent = typograph(temperature(hour.temperature));
    const condition = document.createElement('span');
    condition.className = 'hour-condition';
    condition.textContent = typograph(forecastCondition(hour.code));
    row.append(time, air, condition);
    row.setAttribute('aria-label', `${hour.time}, ${temperature(hour.temperature)}, ${forecastCondition(hour.code)}`);
    if (Number(hour.time.slice(0, 2)) === Math.floor(placeClock().minutes / 60)) row.setAttribute('aria-current', 'time');
    return row;
  });
  $('#hourly-rows').replaceChildren(...rows);
  updateForecastHour();
  const current = $('#hourly-rows [aria-current=time]');
  if (current && positionedForecastDay !== forecast.day) {
    $('.forecast-hours').scrollLeft = Math.max(0, current.offsetLeft - $('.forecast-hours').offsetLeft);
    positionedForecastDay = forecast.day;
  }
}
function updateForecastHour() {
  if (!forecast) return;
  const hour = Math.floor(placeClock().minutes / 60);
  for (const row of document.querySelectorAll('#hourly-rows li')) {
    if (Number(row.querySelector('time').textContent.slice(0, 2)) === hour) row.setAttribute('aria-current', 'time');
    else row.removeAttribute('aria-current');
  }
}
$('.weather-inline').hidden = false;

const photoNames = ['Пробежка у моря', 'На дорожке', 'Вдоль побережья', 'Бежим вместе', 'Свои люди', 'До заката', 'Лодки в бухте', 'По набережной', 'Синяя вода', 'Море с высоты', 'В гавани'];
const photoBase = new URL('../assets/', import.meta.url);
const deck = $('.team-print');
const originalCard = $('.print-card');
const cards = photoUse.cover.map((index, position) => {
  const photo = photos[index];
  const card = position === 0 ? originalCard : originalCard.cloneNode(true);
  if (position) {
    card.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    deck.append(card);
  }
  card.dataset.index = index;
  const link = card.querySelector('.team-photo');
  link.href = new URL(photo.file, photoBase).href;
  link.setAttribute('role', 'button');
  link.setAttribute('aria-label', `Следующая фотография. Сейчас: ${photoNames[index]}`);
  card.querySelector('.photo-position').textContent = typograph(`${position + 1} / ${photoUse.cover.length}`);
  card.querySelector('.print-caption').textContent = typograph(photoNames[index]);
  return card;
});
let stackBusy = false;
function prepareCard(card) {
  const photo = photos[Number(card.dataset.index)];
  const image = card.querySelector('img');
  const src = new URL(photo.file, photoBase).href;
  if (image.src !== src) image.src = src;
  image.alt = photo.alt;
  return image.decode();
}
function placeCards() {
  for (const [depth, card] of cards.entries()) {
    card.dataset.depth = depth;
    card.inert = depth !== 0;
    if (depth) card.setAttribute('aria-hidden', 'true'); else card.removeAttribute('aria-hidden');
    if (depth < 3) prepareCard(card).catch(() => {});
  }
}
placeCards();
async function shuffleStack() {
  if (stackBusy) return;
  stackBusy = true;
  const outgoing = cards[0];
  const keyboardFocus = outgoing.querySelector('.team-photo').matches(':focus-visible');
  try {
    await Promise.all(cards.slice(1, 4).map(prepareCard));
    if (!reduced.matches) {
      const duration = 230;
      const easing = 'cubic-bezier(.22,.7,.25,1)';
      const lifted = matchMedia('(max-width:760px)').matches
        ? 'translate(-18%,-13%) rotate(-9deg)'
        : 'translate(-38%,-7%) rotate(-13deg)';
      outgoing.style.zIndex = '5';
      const lift = outgoing.animate([
        { transform: 'translate(0,0) rotate(0deg)' },
        { transform: lifted }
      ], { duration, easing, fill: 'forwards' });
      await lift.finished;
      outgoing.style.zIndex = '0';
      cards[1].style.zIndex = '4';
      const advance = cards[1].animate([
        { transform: 'rotate(4deg) translate(6px,0)' },
        { transform: 'rotate(0deg) translate(0,0)' }
      ], { duration: 310, easing, fill: 'forwards' });
      const settle = outgoing.animate([
        { transform: lifted },
        { transform: 'rotate(-8deg) translate(-5px,-3px)' }
      ], { duration: 310, easing, fill: 'forwards' });
      const middle = cards[2].animate([
        { transform: 'rotate(-8deg) translate(-5px,-3px)' },
        { transform: 'rotate(4deg) translate(6px,0)' }
      ], { duration: 310, easing, fill: 'forwards' });
      await Promise.all([advance.finished, settle.finished, middle.finished]);
    }
    cards.push(cards.shift());
    placeCards();
    for (const card of cards) {
      card.getAnimations().forEach(animation => animation.cancel());
      card.style.removeProperty('z-index');
    }
    if (keyboardFocus) cards[0].querySelector('.team-photo').focus({ preventScroll: true });
    $('#scene-status').textContent = typograph(`Фото ${photoUse.cover.indexOf(Number(cards[0].dataset.index)) + 1} из ${cards.length}: ${photoNames[Number(cards[0].dataset.index)]}`);
  } catch {
    for (const card of cards) { card.getAnimations().forEach(animation => animation.cancel()); card.style.removeProperty('z-index'); }
    $('#scene-status').textContent = typograph('Снимок не загрузился. Попробуй ещё раз.');
  } finally { stackBusy = false; }
}
deck.addEventListener('click', event => {
  const card = event.target.closest('.print-card');
  if (!card || card.dataset.depth !== '0') return;
  if (event.target.closest('.team-photo')) { event.preventDefault(); shuffleStack(); }
});
deck.addEventListener('keydown', event => {
  if (event.key === ' ' && event.target.matches('.team-photo')) { event.preventDefault(); shuffleStack(); }
});

const dialog = $('#photo-dialog');
const photoControls = [$('#previous-large'), $('#next-large')];
let galleryIndex = 0;
let galleryPhotos = photoUse.cover;
let galleryBusy = false;
let galleryTrigger = cards[0].querySelector('.team-photo');
async function showGalleryPhoto(index) {
  if (galleryBusy) return false;
  galleryBusy = true;
  photoControls.forEach(button => { button.disabled = true; });
  try {
    const photo = photos[index];
    const image = new Image(); image.src = new URL(photo.file, photoBase).href;
    await image.decode();
    galleryIndex = index;
    $('#photo-dialog img').src = image.src;
    $('#photo-dialog img').alt = photo.alt;
    $('#large-caption').textContent = typograph(galleryPhotos.length === 1 ? photoNames[index] : `${photoNames[index]} · ${galleryPhotos.indexOf(index) + 1} из ${galleryPhotos.length}`);
    $('.gallery-controls').hidden = galleryPhotos.length === 1;
    return true;
  } catch {
    $('#scene-status').textContent = typograph('Снимок не загрузился. Попробуй ещё раз.');
    return false;
  } finally {
    galleryBusy = false;
    photoControls.forEach(button => { button.disabled = false; });
  }
}
async function openGallery(index, trigger, group = [index]) {
  if (galleryBusy) return;
  galleryPhotos = group;
  if (await showGalleryPhoto(index)) {
    galleryTrigger = trigger;
    dialog.showModal(); scheduleFrame();
  }
}
function stepGallery(step) {
  if (galleryPhotos.length < 2) return;
  const position = (galleryPhotos.indexOf(galleryIndex) + step + galleryPhotos.length) % galleryPhotos.length;
  showGalleryPhoto(galleryPhotos[position]);
}
for (const link of document.querySelectorAll('[data-photo]')) {
  link.addEventListener('click', event => { event.preventDefault(); openGallery(Number(link.dataset.photo), link, photoUse[link.dataset.gallery] || [Number(link.dataset.photo)]); });
}
$('#previous-large').addEventListener('click', () => stepGallery(-1));
$('#next-large').addEventListener('click', () => stepGallery(1));
$('#close-photo').addEventListener('click', () => dialog.close());
dialog.addEventListener('keydown', event => { if (event.key === 'ArrowRight') { event.preventDefault(); stepGallery(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); stepGallery(-1); } });
dialog.addEventListener('close', () => { galleryTrigger.focus({ preventScroll: true }); scheduleFrame(); });
dialog.addEventListener('click', event => { if (event.target !== dialog) return; const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); });
setupNavigation(reduced);
render();
loadWeather();
