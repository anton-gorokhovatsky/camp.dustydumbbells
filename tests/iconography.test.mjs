import test from 'node:test';
import assert from 'node:assert/strict';
import{weatherIcon}from'../site/iconography.js';
import{composeActivitySymbols}from'../scripts/activity-markup.mjs';

test('weather symbols distinguish current night, the daily forecast and missing observations',()=>{
  assert.equal(weatherIcon(null),null);
  assert.equal(weatherIcon({code:0},true),'moon-stars');
  assert.equal(weatherIcon({code:0}),'sun');
  assert.equal(weatherIcon({code:2},true),'cloud-moon');
  assert.equal(weatherIcon({code:95}),'cloud-lightning');
  for(const code of[51,65,67,82])assert.equal(weatherIcon({code}),'cloud-rain');
  for(const code of[71,86])assert.equal(weatherIcon({code}),'cloud-snow');
  assert.equal(weatherIcon({code:48}),'cloud-fog');
  assert.equal(weatherIcon({code:null}),null);
  assert.notEqual(weatherIcon({code:0},true),weatherIcon({code:95}));
});

test('sports marks retain programme copy, time, links and the distinction between activities and rest',()=>{
  const descriptions=['День приезда','9:00 — легкий бег, 60 минут<br />19:00 — приветственный ужин',
    '8:00 — скоростная работа по плану DD<br />17:00 — легкий бег / райд / плавание',
    '9:00 — кросс 15–20 км в горах или поход в горы','8:00 — DDLong','Свободный вечер'];
  const source=descriptions.map(text=>`<div class="t547__descr t-text">${text}</div>`).join('');
  const enhanced=composeActivitySymbols(source);
  const restore=html=>html.replace(/<span class="dd-activity"><span class="dd-icon" data-dd-icon="[a-z]+" aria-hidden="true"><\/span>([^<]*)<\/span>/g,'$1');
  assert.equal(restore(enhanced),source);
  assert(enhanced.includes('data-dd-icon="bike"'));
  assert(enhanced.includes('data-dd-icon="swim"'));
  assert(!composeActivitySymbols('<p>В свободный вечер — плавание</p>').includes('dd-icon'));
});
