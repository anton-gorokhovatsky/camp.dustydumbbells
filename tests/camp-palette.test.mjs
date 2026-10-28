import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { campPalette, contrast } from '../dist/camp-palette.js';
import { createWeatherReader } from '../dist/camp-environment.js';
import { normalizeWeather, normalizeForecast, weatherURL } from '../dist/environment.js';

const weather = { clouds: 2, code: 0, temperature: 25, humidity: 45, precipitation: 0, wind: 3, direction: 180 };
const states = [null, weather, { ...weather, clouds: 100, code: 3 },
  { ...weather, clouds: 100, code: 65, precipitation: 12 },
  { ...weather, clouds: 100, code: 95, precipitation: 0 },
  { ...weather, clouds: 100, code: 99, precipitation: 10 },
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
        for (const background of state.surfaces)
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

test('current storm, rain and fog retain different light rather than one almost unchanged cloudy surface',()=>{
  const date=new Date('2026-10-28T13:00:00+03:00');
  const cloudy=campPalette({date,weather:{...weather,clouds:100,code:3}});
  const rainy=campPalette({date,weather:{...weather,clouds:100,code:65,precipitation:5}});
  const storm=campPalette({date,weather:{...weather,clouds:100,code:95,precipitation:5}});
  const fog=campPalette({date,weather:{...weather,clouds:100,code:48}});
  const channels=colour=>colour.slice(1).match(/../g).map(value=>parseInt(value,16));
  const distance=(a,b)=>Math.hypot(...channels(a).map((value,i)=>value-channels(b)[i]));
  assert(distance(cloudy.page,rainy.page)>25,'Rain changes the whole page sufficiently to require a real visual comparison.');
  assert(distance(cloudy.page,storm.page)>45,'Storm is not merely the cloudy palette with a different forecast label.');
  for(const palette of [cloudy,rainy,fog]){
    const [red,green,blue]=channels(palette.page);
    assert(blue<=red,'Diffuse daylight stays a mineral surface, without a separate cyan cast.');
  }
  assert.notEqual(storm.matte.colour,cloudy.matte.colour);
  assert.notEqual(fog.page,storm.page);
  assert.equal(storm.condition,'storm');assert.equal(fog.condition,'fog');
  assert.equal(campPalette({date}).condition,'unknown','No observation is not a clear-weather reading.');
});

test('the accepted natural pigments carry the full solar day into lanes and footer',()=>{
  const date=new Date('2026-10-28T12:00:00+03:00');
  const solar=campPalette({date}).solar;
  const at=minute=>campPalette({date:new Date(Date.parse('2026-10-28T00:00:00+03:00')+minute*60000),weather});
  const times=[solar.sunrise-45,solar.sunrise-10,solar.sunrise+65,solar.noon,
    solar.noon+(solar.sunset-solar.noon)*.52,solar.sunset-50,solar.sunset,solar.sunset+35,solar.sunset+100];
  const selected=times.map(at);
  assert.equal(new Set(selected.map(s=>s.page)).size,9);
  assert.equal(new Set(selected.map(s=>s.band)).size,9);
  assert.equal(new Set(selected.map(s=>s.deep)).size,9);
  assert(at(solar.sunrise+65).light.angle<at(solar.noon).light.angle);
  assert(at(solar.noon).light.angle<at(solar.sunset-50).light.angle);
  const noon=at(solar.noon);
  assert.notEqual(noon.light.lit,noon.light.shaded,'Directional daylight is a real field, not a label.');
  const cloudy=campPalette({date,weather:{...weather,clouds:100,code:3}});
  assert(cloudy.light.direct<noon.light.direct*.2,'Clouds scatter the direct sunlight.');
  assert(contrast(selected.at(-1).text.ink,selected.at(-1).page)>8,'The solar night supplies the dark reading state.');
});

test('solar colour surfaces remain continuous through every minute and across midnight',()=>{
  const start=Date.parse('2026-10-28T00:00:00+03:00');
  const rgb=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16));
  let previous=campPalette({date:new Date(start)});
  for(let m=1;m<=1440;m++){
    const current=campPalette({date:new Date(start+m*60000)});
    for(const role of ['page','band','deep'])assert(Math.hypot(...rgb(current[role]).map((v,i)=>v-rgb(previous[role])[i]))<12,`${role} at ${m}`);
    previous=current;
  }
});

test('the translucent navigation retains distinct colour roles between the sunset and twilight anchors',()=>{
  const start=Date.parse('2026-10-28T00:00:00+03:00');
  const sunset=campPalette({date:new Date(start+12*3600000)}).solar.sunset;
  const rgb=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16));
  for(const offset of [12,18,24]){
    const state=campPalette({date:new Date(start+(sunset+offset)*60000),weather});
    const separation=Math.hypot(...rgb(state.matte.blue).map((v,i)=>v-rgb(state.matte.red)[i]));
    assert(separation>12,`The navigation's ordinary and current colours do not collapse at sunset+${offset}.`);
  }
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
  assert(url.searchParams.get('current').includes('wind_gusts_10m'));
});

test('the current observation supplies the palette and gusts while the daily storm remains a forecast',async()=>{
  const date=new Date('2026-10-24T10:00:00Z');
  const source={...payload,current:{...payload.current,wind_gusts_10m:13},daily:{...payload.daily,weather_code:[95],precipitation_probability_max:[100]}};
  const reader=createWeatherReader({now:()=>date,fetcher:async()=>({ok:true,json:async()=>source})});
  await reader.refresh();
  assert.equal(reader.peek().code,0);assert.equal(reader.forecast().code,95);
  assert.equal(normalizeWeather(source,date).gust,13);
  const palette=campPalette({date,weather:reader.peek()});
  assert.equal(palette.condition,'clear');assert.equal(palette.effects.storm,0);assert.equal(palette.effects.rain,0);
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
