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

test('the chosen track preserves the original archive, a complete phrase and one keyboard destination',async()=>{
  for(const route of ['index.html','direction/index.html']){
    const html=await readFile(new URL('../dist/'+route,import.meta.url),'utf8');
    const scene=html.slice(html.indexOf('<section id="rec1017632716"'),html.indexOf('<div id="rec1017020466"'));
    assert(scene.includes('class="t1003__content dd-track__motion"'));
    assert.equal((scene.match(/class="t1003__item"/g)||[]).length,2);
    assert.equal((scene.match(/tabindex="-1"/g)||[]).length,1);
    assert(scene.includes('aria-hidden="true"')&&scene.includes('href="#form"'));
    for(const file of ['ca7c99443ce6-IMG_6951_1.jpg','9b0df23f9df7-IMG_6952.JPG'])assert.equal(html.split(file).length-1,2);
    assert(scene.includes('It costs')&&scene.includes('0.00 to be')&&scene.includes('a nice camp (21+)'));
    assert(scene.includes('Кэмп в Фетхие, 2025'));
    assert(!scene.includes('t1003_init('),'The old initializer must not clone the new two-lap strip.');
    assert.equal((html.match(/class="t1003 dd-track"/g)||[]).length,3);
    for(const id of ['1016358466','1017632716','2238016901'])assert(!html.includes(`t1003_init('${id}'`));
    const ending=html.slice(html.indexOf('<section id="rec2238016901"'),html.indexOf('<div id="rec2072271691"'));
    assert(ending.includes('До встречи у моря'));
    assert(!ending.includes('href="#form"'),'The ending must not invite a visitor backwards through a completed form.');
    assert(html.includes('data-dd-photo-weather')&&html.includes('data-dd-body-type'));
    assert(!html.includes('review-entry.js')&&!html.includes('local-review'));
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
