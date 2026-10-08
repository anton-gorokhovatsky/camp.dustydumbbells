import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecast, forecastURL, forecastCondition } from '../dist/direction/forecast.js';

test('forecast uses the Antalya calendar day across midnight UTC', () => {
  const payload = { hourly: {
    time:['2026-10-07T23:00', '2026-10-08T00:00'],
    temperature_2m:[20, 18], precipitation_probability:[25, 0], precipitation:[1, 0],
  }, daily:{time:['2026-10-07', '2026-10-08'], temperature_2m_min:[19, 17], temperature_2m_max:[25, 24]} };
  const forecast = normalizeForecast(payload, new Date('2026-10-07T21:05:00Z'));
  assert.equal(forecast.day, '2026-10-08');
  assert.deepEqual(forecast.hours.map(hour => hour.time), ['00:00']);
  assert.equal(forecast.low, 17);
  assert.equal(forecast.high, 24);
  assert.equal(forecast.hours[0].chance, 0);
  assert.equal(forecast.hours[0].precipitation, 0);
});

test('missing and invalid metrics are not shown as zero', () => {
  const forecast = normalizeForecast({hourly:{time:['2026-10-07T10:00'], temperature_2m:[25], precipitation_probability:[-1], wind_speed_10m:[null]}}, new Date('2026-10-07T10:00:00Z'));
  assert.equal(forecast.hours[0].feels, null);
  assert.equal(forecast.hours[0].wind, null);
  assert.equal(forecast.hours[0].chance, null);
  assert.equal(forecast.low, null);
  assert.equal(forecastCondition(null), 'Нет данных');
});

test('yesterday and malformed forecasts cannot appear as today', () => {
  const now = new Date('2026-10-07T10:00:00Z');
  for (const payload of [null, {}, {hourly:{time:[]}}, {hourly:{time:['2026-10-06T12:00'], temperature_2m:[24]}}, {hourly:{time:['2026-10-07T99:00'], temperature_2m:[24]}}]) assert.equal(normalizeForecast(payload, now), null);
});

test('forecast endpoint requests one local day with SI wind units', () => {
  const url = new URL(forecastURL());
  assert.equal(url.searchParams.get('timezone'), 'Europe/Istanbul');
  assert.equal(url.searchParams.get('forecast_days'), '1');
  assert.equal(url.searchParams.get('wind_speed_unit'), 'ms');
  assert.match(url.searchParams.get('hourly'), /precipitation_probability/);
});
