import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountCampMap } from '../site/camp-map.js';
import { productionSite } from '../site/map-policy.js';

function fixture(href = productionSite, automated = false) {
  const button = { hidden: false, disabled: false, addEventListener: (_, fn) => { click = fn; } };
  const status = { hidden: true, textContent: '' }, intro = { hidden: false };
  let click, visible, message, timeout;
  const frames = [], appended = [];
  const container = { dataset: {}, querySelector: selector => selector === '[data-map-open]' ? button : selector === '[data-map-status]' ? status : intro,
    append: frame => appended.push(frame) };
  let observerCount = 0, disconnects = 0;
  mountCampMap(container, { href, automated,
    createFrame: () => {
      const frame = { contentWindow: {}, remove() { this.removed = true; } };
      frames.push(frame); return frame;
    },
    observe: fn => { observerCount++; visible = fn; return () => { disconnects++; }; },
    listenMessage: fn => { message = fn; },
    setTimeout: fn => { timeout = fn; return 1; }, clearTimeout: () => { timeout = null; },
  });
  return { container, button, status, intro, frames, appended,
    visible: () => visible?.(), click: (trusted = true) => click?.({ isTrusted: trusted }),
    send(type, origin = new URL(productionSite).origin, source = frames.at(-1)?.contentWindow) { message?.({ origin, source, data: {type} }); },
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
    env.visible(); env.click();
    assert.equal(env.observerCount, 0);
    assert.equal(env.frames.length, 0);
    assert.equal(env.container.dataset.mapState, 'preview');
  }
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
  env.visible();
  assert.equal(env.frames.length, 2);
});
