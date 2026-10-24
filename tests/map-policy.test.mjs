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
