import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
const record = id => {
  const start = html.indexOf(`<div id="rec${id}"`);
  const tags = /<\/?div\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(html));) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (!depth) return html.slice(start, tags.lastIndex);
  }
  throw new Error(`Unclosed record ${id}`);
};

test('the original introduction remains once, after the film inside main even without JavaScript', () => {
  assert(!record('1016226926').includes('третий год подряд'));
  const intro = html.indexOf('третий год подряд');
  assert(intro > html.indexOf('data-dd-intro'));
  assert(intro > html.indexOf('id="dd-title"'));
  assert(intro > html.indexOf('id="dd-heading-about"'));
  assert(intro < html.indexOf('id="carousel_1016322141"'));
  assert(html.indexOf('dd-about-details') > html.indexOf('id="carousel_1016322141"'));
  assert(intro < html.indexOf('</main>'));
  assert.equal(html.split('третий год подряд').length - 1, 1);
  assert(html.includes('id="dd-cover-video" controls muted loop playsinline'));
});

test('the sunset belongs to the invitation once and the coastal gallery still starts with a real first slide', () => {
  const coast = record('1017020466');
  const form = record('1016216116');
  assert(!coast.includes('IMG_6948.JPG'));
  assert.equal((coast.match(/class="t1148__item"/g) || []).length, 5);
  for (let index = 0; index < 5; index++) {
    assert(coast.includes(`aria-label="${index + 1} из 5"`));
    assert(coast.includes(`data-index="${index}"`));
  }
  assert(coast.includes('aria-label="1 из 5"\naria-current="true"'));
  const image = form.match(/<img\b[^>]*data-dd-memory-photo[^>]*>/)?.[0];
  assert(image?.includes('d152e032841c-IMG_6948.JPG'));
  assert(image.includes('width="893" height="1339"'));
  assert(image.includes('data-zoomable="yes"'));
  assert(image.includes('role="button" tabindex="0"'));
  assert(image.includes('Кэмп в Фетхие, 2025.'));
  assert(form.indexOf('data-dd-memory-photo') < form.indexOf('id="dd-heading-form"'));
  assert.equal((html.match(/data-dd-memory-photo/g) || []).length, 1);
  const sources = [...html.matchAll(/<img\b[^>]*data-img-zoom-url="([^"]+)"/g)].map(m => m[1]);
  assert.equal(sources.length, 11);
  assert.equal(new Set(sources).size, 11);
});
