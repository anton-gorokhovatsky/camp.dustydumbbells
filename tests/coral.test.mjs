import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCoralPalette } from '../site/direction/coral-current.js';
import { environmentAt, SCENARIOS } from '../dist/environment.js';

const rgb = hex => hex.slice(1).match(/../g).map(value => parseInt(value,16));
const luminance = colour => colour.map(value=>value/255)
  .map(value=>value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4)
  .reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);

test('solid Coral text remains readable over every exported tone in changing weather', () => {
  const date=new Date('2026-10-19T13:00:00+03:00');
  for(const weather of [null,...Object.values(SCENARIOS)]) for(let minutes=0;minutes<1440;minutes+=60) {
    const css=environmentAt({date,minutes,weather}).css;
    const deep=rgb(css['--environment-reading']);
    const pale=deep.map(channel=>255*.68+channel*.32);
    const palette=createCoralPalette(pale,deep);
    for(let tone=0;tone<256;tone++) {
      const daylight=Array.from(palette.weather.slice(tone*3,tone*3+3));
      const dark=Array.from(palette.about.slice(tone*3,tone*3+3));
      assert((luminance(daylight)+.05)/.05>=4.5,`weather ${minutes}, tone ${tone}`);
      assert(1.05/(luminance(dark)+.05)>=4.5,`about ${minutes}, tone ${tone}`);
    }
  }
});

test('Coral retains texture and responds to the scene pigments', () => {
  const a=createCoralPalette([196,208,212],[54,90,102]);
  const b=createCoralPalette([204,214,212],[34,64,70]);
  for(const field of ['weather','about']) {
    assert.notDeepEqual(a[field].slice(0,3),a[field].slice(-3),`${field} keeps texture`);
    assert.notDeepEqual(a[field],b[field],`${field} follows weather`);
  }
});
