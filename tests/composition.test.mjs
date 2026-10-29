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

test('the archive has one source per photograph, valid gallery positions and a shared people invitation', () => {
  const coast = record('1017020466');
  const form = record('1016216116');
  assert(coast.includes('IMG_6948.JPG'));
  assert(!form.includes('IMG_6948.JPG'));
  for (const [id, count] of [['1016322141', 7], ['2080000001', 8], ['1017020466', 13]]) {
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
  const people=[...form.matchAll(/<img\b[^>]*data-dd-invitation-photo[^>]*>/g)].map(match=>match[0]);
  assert.equal(people.length,2);
  for(const image of people){assert(image.includes('Кэмп в Анталье, 2026.'));assert(!image.includes('role="button"'));}
  assert(form.indexOf('data-dd-invitation-photo') < form.indexOf('id="dd-heading-form"'));
  assert.equal((html.match(/data-dd-memory-photo/g)||[]).length,0);
  for(const id of ['04','08'])assert(!html.includes(`camp-antalya-2026-${id}.webp`));
  const firstCoast=coast.match(/data-dd-photo-source="([^"]+)"/)?.[1];
  assert(firstCoast?.endsWith('camp-antalya-2026-03.webp'));
  const sources = [...html.matchAll(/<img\b[^>]*data-(?:dd-photo-source|img-zoom-url)="([^"]+)"/g)].map(m => m[1]);
  assert.equal(sources.length,30);
  assert.equal(new Set(sources).size,30);
  assert(form.includes('За&shy;явка на кэмп'));
  assert(!form.includes('Количество заявок ограничено'));
  assert(record('2078794741').includes('dd-travel-copy'));
  assert(!record('2078794741').includes('dd-travel-column'));
});

test('the Antalya report supplements each scene without relabelling the Fethiye archive',async()=>{
  const archive=JSON.parse(await readFile(new URL('../site/data/camp-antalya-2026.json',import.meta.url),'utf8'));
  assert.equal(archive.photos.length,18);
  assert.equal(new Set([...archive.stacks.flatMap(stack=>stack.photos),...archive.invitation]).size,18);
  for(const stack of archive.stacks){
    const gallery=record(stack.carousel);
    const cards=[...gallery.matchAll(/<div\s+class="t1148__item"[\s\S]*?<img\b[^>]*>/g)].map(match=>match[0]);
    assert(gallery.includes('<p class="dd-archive-caption">Кэмп в Анталье, 2026</p>'));
    for(const [index,id]of stack.photos.entries()){
      const photo=archive.photos.find(photo=>photo.id===id);
      assert(cards[index].includes(photo.file));
      assert(cards[index].includes(`width="${photo.width}" height="${photo.height}"`));
      assert(cards[index].includes('data-dd-archive-caption="Кэмп в Анталье, 2026"'));
      assert(cards[index].includes('Кэмп в Анталье, 2026.'));
    }
    for(const card of cards.slice(stack.photos.length)){
      assert(card.includes('/assets/'));
      assert(card.includes('data-dd-archive-caption="Кэмп в Фетхие, 2025"'));
      assert(card.includes('Кэмп в Фетхие, 2025.'));
    }
  }
  const credits=await readFile(new URL('../dist/photographs/index.html',import.meta.url),'utf8');
  assert(credits.includes(archive.source));assert(credits.includes(archive.author));
});
