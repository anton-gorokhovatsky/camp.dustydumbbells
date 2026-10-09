import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environmentAt, weatherEffects, normalizeWeather, weatherLabel } from '../dist/environment.js';
import { paintAtmosphere } from '../dist/direction/atmosphere.js';

test('WMO rain, drizzle, snow and fog remain distinct with a zero precipitation interval', () => {
  for (const code of [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99]) {
    const effects = weatherEffects({code,precipitation:0});
    assert(effects.rain > 0 && effects.rain <= 1, `rain code ${code}`);
    assert.equal(effects.snow,0);
  }
  for (const code of [71,73,75,77,85,86]) {
    const effects = weatherEffects({code,precipitation:1});
    assert(effects.snow > 0);
    assert.equal(effects.rain,0);
    assert.equal(weatherLabel({code,precipitation:1}), 'Снег');
  }
  assert.equal(weatherLabel({code:53,precipitation:0}), 'Морось');
  assert.equal(weatherLabel({code:63,precipitation:0}), 'Дождь');
  assert(weatherEffects({code:45}).fog > 0);
  assert.equal(weatherEffects({code:0}).rain,0);
  assert.equal(weatherEffects(null).rain,0);
  assert.equal(weatherEffects({code:0}).fog,0);
});

test('meteorological wind bearings drive opposite horizontal flows; extremes remain bounded', () => {
  assert(weatherEffects({direction:270}).drift > .99);
  assert(weatherEffects({direction:90}).drift < -.99);
  assert(Math.abs(weatherEffects({direction:0}).drift) < .001);
  const effects = weatherEffects({wind:80,gust:120,precipitation:300,clouds:100});
  assert.equal(effects.wind,24);
  assert.equal(effects.gust,30);
  assert.equal(effects.rain,1);
});

test('cloud cover diffuses solar light and night conditions retain their weather response', () => {
  const date = new Date('2026-10-09T10:00:00Z');
  const clear = environmentAt({date,scenario:'clear'});
  const clouds = environmentAt({date,scenario:'clouds'});
  assert(Number(clouds.css['--sun-opacity']) < Number(clear.css['--sun-opacity']));
  assert(Number(clouds.css['--cloud-veil']) > Number(clear.css['--cloud-veil']));
  assert(Number(clouds.css['--photo-saturation']) < Number(clear.css['--photo-saturation']));
  const night = environmentAt({date,minutes:1320,scenario:'rain'});
  assert.equal(night.phase,'night');
  assert.equal(Number(night.css['--sun-opacity']),0);
  assert(night.effects.rain > 0);
});

test('valid current gusts survive normalization; all extreme weather frames have finite geometry', () => {
  const date = new Date('2026-10-09T10:00:00Z');
  const current = {time:'2026-10-09T13:00',temperature_2m:17,relative_humidity_2m:99,
    cloud_cover:100,wind_speed_10m:80,wind_gusts_10m:120,wind_direction_10m:90,
    precipitation:300,weather_code:82};
  assert.equal(normalizeWeather({current},date).gust,120);
  const context = new Proxy({}, { get: (_, name) => {
    if (['clearRect','moveTo','lineTo','quadraticCurveTo','arc'].includes(name)) return (...values) => {
      assert(values.every(Number.isFinite), `${name} received nonfinite geometry`);
    };
    return () => {};
  }, set: () => true });
  for (const code of [0,3,45,48,61,65,71,86,99]) {
    for (const minutes of [460,780,1080,1320]) {
      const model = environmentAt({date,minutes,weather:{code,precipitation:300,wind:80,gust:120,direction:90,clouds:100}});
      for (const [width,height] of [[320,568],[1440,900],[1,1]]) paintAtmosphere(context,model,width,height,3600);
    }
  }
});
