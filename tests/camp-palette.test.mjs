import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { campPalette, contrast } from '../dist/camp-palette.js';
import { createWeatherReader } from '../dist/camp-environment.js';
import { normalizeForecast, weatherURL } from '../dist/environment.js';

const weather = { clouds: 2, code: 0, temperature: 25, humidity: 45, precipitation: 0, wind: 3, direction: 180 };
const states = [null, weather, { ...weather, clouds: 100, code: 3 },
  { ...weather, clouds: 100, code: 65, precipitation: 12 },
  { ...weather, clouds: 100, code: 48 }, { ...weather, clouds: 90, code: 86, temperature: -5 }];

test('the actual elevation controls the pigments through four seasons and the local midnight', () => {
  for (const month of ['01','04','07','10']) {
    const midnight = Date.parse(`2026-${month}-24T00:00:00+03:00`);
    const colours = new Set();
    for (let minute = 0; minute < 1440; minute += 10) {
      const state = campPalette({ date: new Date(midnight + minute * 60000) });
      assert(Number.isFinite(state.sun.altitude) && Number.isFinite(state.sun.azimuth));
      colours.add(state.page);
      if (state.sun.altitude < -8) assert.equal(state.phase, 'night');
      if (state.sun.altitude >= 24) assert.equal(state.phase, 'day');
    }
    assert(colours.size > 25, 'a continuous solar day, not four fixed clock switches');
    const before = campPalette({ date: new Date(midnight + 1439 * 60000) });
    const after = campPalette({ date: new Date(midnight + 1440 * 60000) });
    assert.equal(before.page, after.page);
  }
});

test('text, links, paint, controls and the translucent material retain contrast across the full day', () => {
  for (const month of ['01','04','07','10']) for (const weather of states) {
    const midnight = Date.parse(`2026-${month}-24T00:00:00+03:00`);
    for (let minute = 0; minute < 1440; minute += 5) {
      const state = campPalette({ date: new Date(midnight + minute * 60000), weather });
      for (const role of ['ink','muted','blue','red']) {
        for (const background of [state.page,state.surface])
          assert(contrast(state.text[role], background) >= 4.5, `${month} ${minute} ${role}`);
        for (const background of state.matte.surfaces)
          assert(contrast(state.matte[role], background) >= 4.5, `${month} ${minute} matte ${role}`);
      }
      assert(contrast(state.onBand, state.band) >= 4.5);
      assert(contrast(state.onBand, state.css['--dd-action-hover']) >= 4.5);
      assert(contrast(state.onBand, state.deep) >= 4.5);
      for (const background of [state.band,state.deep]) assert(contrast(state.css['--dd-footer-muted'], background) >= 4.5);
      assert(state.matte.alpha >= .76 && state.matte.alpha <= 1);
      assert(!Object.values(state.css).some(value => value == null || String(value).includes('NaN')));
    }
  }
});

test('clouds and weather codes visibly affect the palette, even with zero recorded rain', () => {
  const date = new Date('2026-10-24T13:00:00+03:00');
  const clear = campPalette({ date, weather });
  for (const changed of states.slice(2)) {
    const current = campPalette({ date, weather: changed });
    assert.notEqual(current.page, clear.page);
    assert.notEqual(current.band, clear.band);
  }
  const codedRain = campPalette({ date, weather: { ...weather, code: 65, precipitation: 0 } });
  assert(codedRain.overcast > clear.overcast);
});

const payloadAt = date => ({ current: {
  time: date.toISOString().slice(0,16), temperature_2m: 22, relative_humidity_2m: 50,
  cloud_cover: 5, precipitation: 0, weather_code: 0, wind_speed_10m: 3, wind_direction_10m: 180,
},daily:{time:[date.toISOString().slice(0,10)],temperature_2m_min:[18],temperature_2m_max:[25],weather_code:[2],precipitation_probability_max:[10],wind_speed_10m_max:[4]} });
// normalizeWeather expects the provider's civil time in Europe/Istanbul.
const payload = payloadAt(new Date('2026-10-24T13:00:00Z'));
test('weather requests share one flight and a validated session cache; expired data never stays live', async () => {
  let date = new Date('2026-10-24T10:00:00Z');
  let calls = 0;
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key,value) => data.set(key,value) };
  const fetcher = async () => { calls++; return { ok: true, json: async () => payload }; };
  const reader = createWeatherReader({ storage, fetcher, now: () => date });
  assert.equal(reader.peek(), null);
  const first = reader.refresh(), second = reader.refresh();
  assert.equal(first, second);
  await first;
  assert.equal(calls, 1);
  assert.equal(reader.peek().temperature, 22);
  assert.equal(reader.forecast().max,25);
  const restored = createWeatherReader({ storage, fetcher, now: () => date });
  await restored.refresh();
  assert.equal(calls, 1, 'no request on reload within 30 minutes');
  date = new Date(date.getTime() + 31 * 60000);
  await restored.refresh();
  assert.equal(calls, 2);
  date = new Date(date.getTime() + 2 * 3600000);
  assert.equal(reader.peek(), null);
});

test('the forecast is the camp civil day, and incomplete values never become clear or zero',()=>{
  const now=new Date('2026-10-24T21:30:00Z'); // Already the 25th in Antalya.
  const daily={time:['2026-10-24','2026-10-25'],temperature_2m_min:[18,17],temperature_2m_max:[25,24],weather_code:[2,63]};
  const result=normalizeForecast({daily},now);
  assert.equal(result.day,'2026-10-25');assert.equal(result.min,17);assert.equal(result.code,63);
  assert.equal(result.precipitationChance,null);assert.equal(result.wind,null);
  assert.equal(normalizeForecast(payload,now),null,'yesterday does not remain today');
  assert.equal(normalizeForecast({daily:{...daily,temperature_2m_min:[18,null]}},now),null);
  const url=new URL(weatherURL());
  assert.equal(url.searchParams.get('timezone'),'Europe/Istanbul');
  assert(url.searchParams.get('daily').includes('temperature_2m_min'));
});

test('one shared request refreshes the forecast at camp midnight, even inside the normal cache window',async()=>{
  let now=new Date('2026-10-24T20:55:00Z'),calls=0;
  const reader=createWeatherReader({now:()=>now,fetcher:async()=>{calls++;const local=new Date(now.getTime()+3*3600000);return{ok:true,json:async()=>payloadAt(local)};}});
  await reader.refresh();assert.equal(reader.forecast().day,'2026-10-24');
  now=new Date('2026-10-24T21:01:00Z');
  assert.equal(reader.forecast(),null);
  await Promise.all([reader.refresh(),reader.refresh()]);
  assert.equal(calls,2);assert.equal(reader.forecast().day,'2026-10-25');
  now=new Date('2026-10-25T00:00:00Z');
  assert.equal(reader.forecast(),null,'expired cached forecast is not kept live');
});

test('storage denial, network failure and future or malformed readings keep the astronomical fallback', async () => {
  const date = new Date('2026-10-24T10:00:00Z');
  const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  for (const fetcher of [async () => { throw new Error('offline'); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ current: { time: '2027-01-01T00:00' } }) }),
    async () => ({ ok: true, json: async () => ({}) })]) {
    const reader = createWeatherReader({ now: () => date, storage, fetcher });
    assert.equal(await reader.refresh(), null);
    assert.equal(campPalette({ date, weather: reader.peek() }).phase, 'day');
  }
  const validWithoutStorage = createWeatherReader({ now: () => date, storage,
    fetcher: async () => ({ ok: true, json: async () => payload }) });
  assert.equal((await validWithoutStorage.refresh()).temperature, 22);
});

test('both published entry routes and the policy use the same live system without modifying the frozen source', async () => {
  for (const path of ['index.html','direction/index.html','privacy/index.html']) {
    const html = await readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');
    assert(html.includes('data-dd-environment'));
    assert(html.includes('climate.css?v='));
    assert(html.includes('camp-environment.js?v='));
    if (path !== 'privacy/index.html') assert.equal((html.match(/data-dd-weather-values/g) || []).length, 1);
  }
  const main = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert(main.includes('var(--dd-red)'));
  assert(main.includes('var(--dd-blue)'));
  assert(!main.includes('palette-review'), 'local comparison is never a production control');
});
