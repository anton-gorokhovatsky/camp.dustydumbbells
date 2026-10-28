import { campPalette } from './camp-palette.js';
import { normalizeWeather, normalizeForecast, weatherURL, placeClock, clockText, weatherLabel } from './environment.js';
import { mountPhotoWeather } from './photo-weather.js';
import { smoothCorners } from './smooth-corners.js';

const CACHE_KEY = 'dd-camp-antalya-weather-v1';
const REFRESH = 30 * 60 * 1000;

// One request at a time; the session cache is revalidated before use. A failed
// request never prolongs a reading's age or turns missing weather into "clear".
export function createWeatherReader({ fetcher = fetch, storage = null, now = () => new Date() } = {}) {
  let cached = null;
  let lastAttempt = -Infinity;
  let lastAttemptDay = null;
  let pending = null;
  try { cached = JSON.parse(storage?.getItem(CACHE_KEY) || 'null'); } catch {}
  if (cached && normalizeWeather(cached.payload, now()) && normalizeForecast(cached.payload,now()) && Number.isFinite(cached.received)
    && cached.received <= now().getTime()) {lastAttempt = cached.received;lastAttemptDay=placeClock(new Date(cached.received)).day;}
  const peek = () => normalizeWeather(cached?.payload, now());
  const forecast = () => {
    const age=now().getTime()-cached?.received;
    return Number.isFinite(age)&&age>=0&&age<=2*60*60*1000?normalizeForecast(cached?.payload,now()):null;
  };
  const refresh = () => {
    if (pending) return pending;
    const time = now().getTime();
    const day=placeClock(now()).day;
    if (time - lastAttempt < REFRESH && lastAttemptDay===day) return Promise.resolve(peek());
    lastAttempt = time;
    lastAttemptDay = day;
    pending = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      try {
        const response = await fetcher(weatherURL(), { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!response.ok) throw new Error('Weather unavailable');
        const payload = await response.json();
        if (!normalizeWeather(payload, now()) && !normalizeForecast(payload,now())) throw new Error('Weather reading is invalid or stale');
        cached = { payload, received: now().getTime() };
        try { storage?.setItem(CACHE_KEY, JSON.stringify(cached)); } catch {}
      } catch { /* The astronomical palette remains available without a network. */ }
      finally { clearTimeout(timeout); pending = null; }
      return peek();
    })();
    return pending;
  };
  return { peek, forecast, refresh };
}

export function applyCampPalette(root, state) {
  for (const [name, value] of Object.entries(state.css)) root.style.setProperty(name, value);
  root.dataset.ddLight = state.phase;
  root.dataset.ddWeather = state.condition;
  root.dataset.ddPalette = 'ready';
  root.dispatchEvent(new CustomEvent('dd-palette-change'));
}

function initCampEnvironment() {
  const root = document.documentElement;
  if (!document.querySelector('[data-dd-environment]')) return;
  let storage = null;
  try { storage = sessionStorage; } catch {}
  const reader = createWeatherReader({ storage });
  const updatePhotographs = document.body.hasAttribute('data-dd-photo-weather') ? mountPhotoWeather(null) : null;
  document.querySelectorAll('.dd-track__photo').forEach(smoothCorners);
  const reading = document.querySelector('[data-dd-weather-values]');
  const menuWeather=document.querySelector('[data-dd-menu-weather]');
  let currentConditions=menuWeather?.querySelector('[data-dd-current-weather]')||null;
  if(menuWeather){
    if(!currentConditions){
      currentConditions=document.createElement('p');
      currentConditions.className='dd-menu-weather__current';
      currentConditions.setAttribute('data-dd-current-weather','');
      menuWeather.prepend(currentConditions);
    }
  }
  let triedWeather=false;
  const temperature=value=>`${Math.round(value)>0?'+':''}${Math.round(value)}°`;
  const render = () => {
    if (document.hidden) return;
    const date = new Date();
    const weather = reader.peek();
    const palette = campPalette({ date, weather });
    applyCampPalette(root, palette);
    updatePhotographs?.(weather);
    if(menuWeather){
      const forecast=reader.forecast();
      const heading=menuWeather.querySelector('[data-dd-forecast-heading]');
      const range=menuWeather.querySelector('[data-dd-forecast-range]');
      const conditions=menuWeather.querySelector('[data-dd-forecast-conditions]');
      const detail=menuWeather.querySelector('[data-dd-forecast-detail]');
      const currentTime=menuWeather.querySelector('[data-dd-current-time]');
      // The daily WMO code describes the strongest condition of the day. Keep
      // it separate from the current reading that colours the page and photos.
      currentConditions.textContent=menuWeather.hasAttribute('data-dd-weather-open')
        ? weather?`Сейчас ${temperature(weather.temperature)} · ${weatherLabel(weather).toLowerCase()} · ${weather.time}`
          : triedWeather?'Текущая погода недоступна':'Загружаем текущую погоду…'
        : currentTime
        ? weather?`Анталья · ${temperature(weather.temperature)} · ${weatherLabel(weather).toLowerCase()}`
          : triedWeather?'Анталья · погода недоступна':'Анталья · загружаем погоду…'
        : weather?`Сейчас · ${temperature(weather.temperature)} · ${weatherLabel(weather).toLowerCase()} · на ${weather.time}`
          : triedWeather?'Текущая погода недоступна':'Загружаем текущую погоду…';
      if(currentTime){currentTime.textContent=weather?`Текущая погода на ${weather.time}`:'';currentTime.hidden=!weather;}
      heading.textContent=`Сегодня в Анталье · ${new Intl.DateTimeFormat('ru',{timeZone:'Europe/Istanbul',day:'numeric',month:'long'}).format(date)}`;
      range.hidden=!forecast;
      detail.hidden=!forecast;
      if(forecast){
        range.textContent=`${temperature(forecast.min)}…${temperature(forecast.max)}`;
        range.setAttribute('aria-label',`От ${Math.round(forecast.min)} до ${Math.round(forecast.max)} градусов`);
        conditions.textContent=weatherLabel(forecast);
        detail.textContent=[forecast.precipitationChance===null?null:`Вероятность осадков ${Math.round(forecast.precipitationChance)}%`,forecast.wind===null?null:`Ветер до ${Math.round(forecast.wind)} м/с`].filter(Boolean).join(' · ');
        detail.hidden=!detail.textContent;
      }else{
        range.textContent='';range.removeAttribute('aria-label');detail.textContent='';
        conditions.textContent=triedWeather?'Прогноз недоступен':'Загружаем прогноз…';
      }
    }
    if (reading) {
      const clock = clockText(placeClock(date).minutes);
      const phase = palette.light.label;
      reading.textContent = weather
        ? `Сейчас в Анталье ${clock} · ${Math.round(weather.temperature) > 0 ? '+' : ''}${Math.round(weather.temperature)}° · ${weatherLabel(weather).toLowerCase()}. Погода на ${weather.time}.`
        : `Сейчас в Анталье ${clock} · ${phase}. Погода недоступна — цвета следуют положению солнца.`;
    }
  };
  const update = () => {
    if (document.hidden) return;
    render();
    reader.refresh().then(()=>{triedWeather=true;render();});
  };
  update();
  setInterval(update, 60000);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  window.addEventListener('online', update);
}
if (typeof document !== 'undefined') initCampEnvironment();
