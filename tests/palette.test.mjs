import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environmentAt, solarDay, SCENARIOS } from '../dist/environment.js';

const date = new Date('2026-10-09T13:00:00+03:00');
const roles = ['reading', 'zine', 'poster', 'ticket', 'guide', 'footer'];
const channels = hex => hex.slice(1).match(/../g).map(value => parseInt(value, 16));
const luminance = values => values.map(value => value / 255)
  .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const colours = options => environmentAt({ date, ...options }).css;

test('every page field responds to solar time and weather, including missing weather', () => {
  const solar = solarDay(date);
  const times = [solar.sunrise + 35, solar.noon, solar.sunset - 12, solar.sunset + 150];
  for (const role of roles) {
    const token = `--environment-${role}`;
    assert.equal(new Set(times.map(minutes => colours({ minutes })[token])).size, 4, role);
    const clear = colours({ minutes: solar.noon, scenario: 'clear' })[token];
    for (const scenario of ['clouds', 'rain'])
      assert.notEqual(colours({ minutes: solar.noon, scenario })[token], clear, `${role} ${scenario}`);
    assert.match(colours({ minutes: solar.noon, weather: null })[token], /^#[0-9a-f]{6}$/);
  }
});

test('text and matte ticket retain contrast throughout the day and in severe weather', () => {
  const cases = [null, ...Object.values(SCENARIOS),
    { code: 48, clouds: 100, humidity: 100, temperature: 12 },
    { code: 99, clouds: 100, precipitation: 15, temperature: 15 },
    { code: 86, clouds: 100, precipitation: 5, temperature: 1 }];
  for (const weather of cases) for (let minutes = 0; minutes < 1440; minutes += 5) {
    const css = colours({ minutes, weather });
    const pairs = [['reading', '#f7f7f7'], ['zine', '#153c3e'], ['poster', '#15383d'],
      ['ticket', '#ffffff'], ['guide', '#153b49'], ['footer', '#f7f7f7']];
    for (const [role, ink] of pairs) {
      const field = channels(css[`--environment-${role}`]);
      assert(contrast(channels(ink), field) >= 4.5, `${role} at ${minutes}, code ${weather?.code}`);
    }
    // The actual white material is 68% opaque over the ticket field.
    const glass = channels(css['--environment-ticket']).map(value => 255 * .68 + value * .32);
    assert(contrast(channels('#153b49'), glass) >= 4.5, `glass at ${minutes}`);
    const [zr, zg, zb] = channels(css['--environment-zine']);
    const [pr, pg, pb] = channels(css['--environment-poster']);
    assert(zg > zr && zg > zb, 'zine keeps its green role');
    assert(pr > pg && pr > pb, 'poster keeps its coral role');
  }
});

test('page fields cross sunrise and sunset continuously, without switching text colours', () => {
  let previous = colours({ minutes: 0, scenario: 'clear' });
  for (let minutes = 1; minutes < 1440; minutes++) {
    const next = colours({ minutes, scenario: 'clear' });
    for (const role of roles) {
      const token = `--environment-${role}`;
      const before = channels(previous[token]);
      assert(channels(next[token]).every((value, index) => Math.abs(value - before[index]) <= 3), `${role} at ${minutes}`);
    }
    previous = next;
  }
});
