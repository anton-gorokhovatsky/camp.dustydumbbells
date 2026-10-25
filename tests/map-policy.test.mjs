import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveMapPage, liveMapFrame } from '../site/map-policy.js';

const site = 'https://anton-gorokhovatsky.github.io/camp.dustydumbbells/';
test('Mapbox is denied for local development, experiments, previews and automation', () => {
  for (const href of [
    'http://127.0.0.1:4187/camp.dustydumbbells/',
    'http://localhost:4173/camp.dustydumbbells/',
    site + 'experiments/stadium/',
    site + 'direction/',
    site + '?map=preview',
    site + '?test=1',
    site + 'map.html',
    'https://example.com/camp.dustydumbbells/',
  ]) assert.equal(liveMapPage(href, false, site), false, href);
  assert.equal(liveMapPage(site, true, site), false);
  assert.equal(liveMapPage(site + '#rec2083039171', false, site), true);
  for (const query of ['?v=1df4cd7', '?release=1df4cd7ee91f840fc2ee972140f9ea51e3b496ef', '?utm_source=telegram']) {
    assert.equal(liveMapPage(site + query, false), true, query);
    assert.equal(liveMapFrame(site + 'map.html', site + query, true, false), true, query);
  }
  for (const query of ['?v=preview', '?release=test', '?v=1df4cd7&map=preview', '?review=1', '?test=1', '?v=1df4cd7&v=1df4cd7', '?utm_source=x&map=preview']) {
    assert.equal(liveMapPage(site + query, false), false, query);
  }
});

test('The isolated Mapbox frame requires the exact live parent and cannot run directly', () => {
  const frame = site + 'map.html';
  assert.equal(liveMapFrame(frame, site, true, false, site), true);
  for (const parent of [site + '?map=preview', site + 'experiments/stadium/', 'http://localhost:4187/']) {
    assert.equal(liveMapFrame(frame, parent, true, false, site), false, parent);
  }
  assert.equal(liveMapFrame(frame, site, false, false, site), false);
  assert.equal(liveMapFrame(frame, site, true, true, site), false);
  assert.equal(liveMapFrame(frame + '?preview', site, true, false, site), false);
  assert.equal(liveMapFrame('http://localhost:4187/map.html', site, true, false, site), false);
});

test('A preview build address cannot become the billable production address', () => {
  for (const preview of ['http://localhost:4187/camp.dustydumbbells/',
    'http://127.0.0.1:4187/camp.dustydumbbells/', 'https://preview.example.com/camp.dustydumbbells/']) {
    // Exercise the former configurable-site argument: it must never grant access.
    assert.equal(liveMapPage(preview, false, preview), false);
    assert.equal(liveMapFrame(preview + 'map.html', preview, true, false, preview), false);
  }
});
