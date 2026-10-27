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

test('the archive has one source per photograph, valid gallery positions and a distinct invitation sunset', () => {
  const coast = record('1017020466');
  const form = record('1016216116');
  assert(!coast.includes('IMG_6948.JPG'));
  for (const [id, count] of [['1016322141', 3], ['2080000001', 3], ['1017020466', 5]]) {
    const gallery = record(id);
    assert.equal((gallery.match(/class="t1148__item"/g) || []).length, count);
    for (let index = 0; index < count; index++) {
      assert(gallery.includes(`aria-label="${index + 1} из ${count}"`));
      assert(gallery.includes(`data-index="${index}"`));
    }
    assert(gallery.includes(`aria-label="1 из ${count}"\naria-current="true"`));
    assert(gallery.includes('data-dd-stack'));
    assert(!gallery.includes('data-zoomable'));
    assert(!gallery.includes('t_slider__init('));
  }
  const archive = html.indexOf('data-dd-programme-memory');
  assert(archive > html.indexOf('id="dd-day-17"'));
  assert(archive < html.indexOf('id="dd-day-18"'));
  assert(record('2080000001').includes('Кэмп в Фетхие, 2025'));
  const image = form.match(/<img\b[^>]*data-dd-memory-photo[^>]*>/)?.[0];
  assert(image?.includes('d152e032841c-IMG_6948.JPG'));
  assert(image.includes('width="893" height="1339"'));
  assert(image.includes('data-zoomable="yes"'));
  assert(image.includes('role="button" tabindex="0"'));
  assert(image.includes('Кэмп в Фетхие, 2025.'));
  assert(form.indexOf('data-dd-memory-photo') < form.indexOf('id="dd-heading-form"'));
  assert.equal((html.match(/data-dd-memory-photo/g) || []).length, 1);
  const sources = [...html.matchAll(/<img\b[^>]*data-(?:dd-photo-source|img-zoom-url)="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(sources).size, 12);
  assert(form.includes('За&shy;явка на кэмп'));
  assert(!form.includes('Количество заявок ограничено'));
  assert(record('2078794741').includes('dd-travel-copy'));
  assert(!record('2078794741').includes('dd-travel-column'));
});
