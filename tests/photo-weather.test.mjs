import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {photoWeather} from '../dist/photo-model.js';

const wind={wind:14,gust:20,direction:270,humidity:50,code:0,clouds:0,precipitation:0};

test('archive drift follows the meteorological bearing without inventing missing wind',()=>{
  assert(photoWeather({...wind,direction:0}).y>0);
  assert(photoWeather({...wind,direction:180}).y<0);
  assert(photoWeather({...wind,direction:90}).x<0);
  assert(photoWeather({...wind,direction:270}).x>0);
  for(const value of [null,{}, {...wind,wind:null},{...wind,direction:NaN},{...wind,humidity:undefined}]){
    const current=photoWeather(value);
    assert.equal(current.x,0);assert.equal(current.y,0);assert.equal(current.sway,0);
    assert.equal(current.veil,0);assert.equal(current.wet,0);
  }
});

test('atmospheric treatment remains bounded for calm, gust, fog, rain and extremes',()=>{
  for(const speed of [0,2,14,80])for(const humidity of [0,50,100])for(const code of [0,45,63,65,75]){
    const model=photoWeather({...wind,wind:speed,gust:120,humidity,code,precipitation:300});
    assert(Object.values(model).every(Number.isFinite));
    assert(Math.abs(model.x)+model.sway<9);
    assert(Math.abs(model.y)+model.sway*.3<3.5);
    assert(model.veil>=0&&model.veil<=.11);
    assert(model.wet>=0&&model.wet<=.18);
  }
  assert.equal(photoWeather({...wind,wind:0,gust:0}).sway,0);
  assert(photoWeather({...wind,humidity:98,code:45}).veil>photoWeather(wind).veil);
  assert(photoWeather({...wind,humidity:95,code:63,precipitation:4}).wet>photoWeather(wind).wet);
});

test('the selected three photographic refrains retain the real archive and its provenance',async()=>{
  const expectedArchive=['6945','6946','6948','6949','6951_1','6952','6953','6954','6960','6961','6968','6969','6970'];
  for(const route of ['index.html','direction/index.html']){
    const html=await readFile(new URL('../dist/'+route,import.meta.url),'utf8');
    for(const[id,file,place]of[
      ['1016358466','antalya-after-storm.jpg','Анталья, Коньяалты'],
      ['1017632716','ca7c99443ce6-IMG_6951_1.jpg','Кэмп DD в Фетхие, 2025'],
      ['2238016901','antalya-evening.jpg','Анталья, Коньяалты'],
    ]){
      const start=html.indexOf(`<section id="rec${id}"`),end=html.indexOf('</section>',start);
      const scene=html.slice(start,end);
      assert(start>=0&&end>start);
      assert(scene.includes('class="t1003__content dd-track__motion"'));
      assert.equal((scene.match(/class="t1003__item"/g)||[]).length,2);
      assert.equal(scene.split('It costs 0.00 to be a nice camp (21+)').length-1,3);
      assert.equal(scene.split(file).length-1,2);
      assert(scene.includes('aria-hidden="true"')&&scene.includes(place));
      assert(!scene.includes('href='),'The atmospheric refrain must not gain a different navigation action in each scene.');
      assert(!html.includes(`t1003_init('${id}'`));
    }
    const archive=[...new Set([...html.matchAll(/<img\b[^>]*>/g)].flatMap(([tag])=>[...tag.matchAll(/(?:\bsrc|\bdata-original)="[^"]*IMG_(\d+(?:_\d)?)\.(?:JPG|jpg)"/g)].map(m=>m[1])))].sort();
    assert.deepEqual(archive,expectedArchive,'All13 original IMG photographs must remain real image placements.');
    assert.equal((html.match(/class="t1003 dd-track"/g)||[]).length,3);
    assert(html.includes('data-dd-photo-weather')&&html.includes('data-dd-body-type'));
    assert(!html.includes('До встречи у моря'));
    assert(!html.includes('review-entry.js')&&!html.includes('local-review')&&!html.includes('data-local-qa')&&!html.includes('LocalQAClock'));
  }
  const release=JSON.parse(await readFile(new URL('../dist/release.json',import.meta.url),'utf8'));
  const sources=JSON.parse(await readFile(new URL('../site/media/antalya-sources.json',import.meta.url),'utf8'));
  const {createHash}=await import('node:crypto');
  assert.equal(sources.length,2);
  for(const source of sources){
    const bytes=await readFile(new URL('../dist/'+source.file,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
    assert.equal(bytes.length,source.bytes);assert.equal(source.licenseURL,'https://unsplash.com/license');
    assert.equal(release.siteFiles[source.file],source.sha256);
  }
});

test('hotel previews keep every original booking destination and use the attributed local photographs',async()=>{
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  const hotels=JSON.parse(await readFile(new URL('../site/data/hotels.json',import.meta.url),'utf8'));
  for(const hotel of hotels){
    assert.equal(html.split(`data-dd-hotel="${hotel.id}"`).length-1,1);
    assert(html.includes(`href="${hotel.booking}"`));
    assert(html.includes(`data-dd-hotel-photo="${hotel.id}" hidden`));
  }
});
