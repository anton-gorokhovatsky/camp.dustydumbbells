import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountCampMap } from '../site/camp-map.js';
import { productionSite } from '../site/map-policy.js';
import { campPalette } from '../dist/camp-palette.js';
import { mapPalette, mapPaletteType } from '../site/map-palette.js';

function fixture(href = productionSite, automated = false) {
  const button = { hidden: false, disabled: false, addEventListener: (_, fn) => { click = fn; } };
  const status = { hidden: true, textContent: '' }, intro = { hidden: false };
  let click, visible, message, timeout, paletteChanged;
  let palette = mapPalette(campPalette({date:new Date('2026-10-25T12:00:00+03:00')}).css);
  const paletteMessages = [];
  const frames = [], appended = [];
  const container = { dataset: {}, querySelector: selector => selector === '[data-map-open]' ? button : selector === '[data-map-status]' ? status : intro,
    append: frame => appended.push(frame) };
  let observerCount = 0, disconnects = 0;
  mountCampMap(container, { href, automated,
    createFrame: () => {
      const frame = { contentWindow: {postMessage:(...args)=>paletteMessages.push(args)}, remove() { this.removed = true; } };
      frames.push(frame); return frame;
    },
    observe: fn => { observerCount++; visible = fn; return () => { disconnects++; }; },
    listenMessage: fn => { message = fn; },
    setTimeout: fn => { timeout = fn; return 1; }, clearTimeout: () => { timeout = null; },
    readPalette:()=>palette,
    observePalette:fn=>{paletteChanged=fn;},
  });
  return { container, button, status, intro, frames, appended, paletteMessages,
    palette:next=>{if(next)palette=next;paletteChanged?.();},
    visible: () => visible?.(), click: (trusted = true) => click?.({ isTrusted: trusted }),
    send(type, origin = new URL(productionSite).origin, source = frames.at(-1)?.contentWindow, detail = {}) { message?.({ origin, source, data: {...detail, type} }); },
    expire: () => timeout?.(), get observerCount() { return observerCount; }, get disconnects() { return disconnects; },
  };
}

test('local, explicit QA and automation cannot observe, create or append a paid frame', () => {
  for (const [href, automated] of [
    ['http://localhost:4187/camp.dustydumbbells/', false],
    [productionSite + '?map=preview', false],
    [productionSite + '?v=1df4cd7&map=preview', false],
    [productionSite + 'experiments/stadium/', false],
    [productionSite, true],
  ]) {
    const env = fixture(href, automated);
    env.visible(); env.click(); env.palette();
    assert.equal(env.observerCount, 0);
    assert.equal(env.frames.length, 0);
    assert.equal(env.paletteMessages.length, 0);
    assert.equal(env.container.dataset.mapState, 'preview');
  }
});

test('weather sends deduplicated colours only to a ready current production frame', () => {
  const env = fixture();
  env.palette(); env.visible(); env.palette();
  assert.equal(env.paletteMessages.length,0);
  env.send('dd-map-ready');
  assert.equal(env.paletteMessages.length,1);
  assert.equal(env.paletteMessages[0][0].type,mapPaletteType);
  assert.equal(env.paletteMessages[0][1],new URL(productionSite).origin);
  env.palette(); env.send('dd-map-ready');
  assert.equal(env.paletteMessages.length,1);
  env.palette(mapPalette(campPalette({date:new Date('2026-10-25T00:00:00+03:00')}).css));
  assert.equal(env.paletteMessages.length,2);
  assert.equal(env.frames.length,1);

  const retry = fixture();
  retry.visible(); retry.send('dd-map-error'); retry.click(); retry.send('dd-map-ready');
  assert.equal(retry.frames.length,2);
  assert.equal(retry.paletteMessages.length,1,'the same palette reaches a replacement frame');
});

test('a production section starts once when viewed and accepts only its own ready message', () => {
  const env = fixture(productionSite + '?v=1df4cd7');
  assert.equal(env.frames.length, 0);
  env.visible(); env.visible(); env.click();
  assert.equal(env.frames.length, 1);
  assert.equal(env.appended.length, 1);
  assert.equal(env.disconnects, 1);
  assert.equal(env.frames[0].src, productionSite + 'map.html');
  assert.equal(env.container.dataset.mapState, 'loading');
  env.send('dd-map-ready', 'https://example.com');
  env.send('dd-map-ready', new URL(productionSite).origin, {});
  assert.equal(env.intro.hidden, false);
  env.send('dd-map-ready');
  assert.equal(env.intro.hidden, true);
  assert.equal(env.container.dataset.mapState, 'ready');
  env.send('dd-map-error'); env.visible(); env.click(); env.expire();
  assert.equal(env.container.dataset.mapState, 'ready');
  assert.equal(env.frames.length, 1);
});

test('failure never loops automatically and a trusted retry creates exactly one fresh frame', () => {
  const env = fixture();
  env.visible();
  const oldWindow = env.frames[0].contentWindow;
  env.send('dd-map-error');
  assert.equal(env.frames[0].removed, true);
  assert.equal(env.button.hidden, false);
  assert.equal(env.button.disabled, false);
  env.visible(); env.click(false);
  assert.equal(env.frames.length, 1);
  env.click(); env.click();
  assert.equal(env.frames.length, 2);
  env.send('dd-map-ready', new URL(productionSite).origin, oldWindow);
  assert.equal(env.container.dataset.mapState, 'loading');
  env.expire();
  assert.equal(env.container.dataset.mapState, 'error');
  assert.equal(env.container.dataset.mapError, 'timeout');
  env.visible();
  assert.equal(env.frames.length, 2);
});

test('failure retains only a safe reason and HTTP status, clearing them on a real retry', () => {
  const env = fixture();
  env.visible();
  env.send('dd-map-error', undefined, undefined, { reason: 'resource', status: 403, url: 'https://example.com/?access_token=example' });
  assert.deepEqual(env.container.dataset, { mapState: 'error', mapError: 'resource', mapHttpStatus: '403' });
  env.click();
  assert.deepEqual(env.container.dataset, { mapState: 'loading' });
  env.send('dd-map-error', undefined, undefined, { reason: 'https://example.com/private', status: '403' });
  assert.deepEqual(env.container.dataset, { mapState: 'error', mapError: 'resource' });
});
