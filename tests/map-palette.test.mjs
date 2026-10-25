import test from 'node:test';
import assert from 'node:assert/strict';
import { campPalette, contrast } from '../dist/camp-palette.js';
import { mapPalette, normaliseMapPalette, trustedMapPalette, paintMap, mapPaletteType } from '../site/map-palette.js';
import { productionSite } from '../site/map-policy.js';

test('map pigments follow the same sun/weather model and retain text and marker contrast', () => {
  const colours = new Set();
  for (const month of ['01','04','07','10']) for (const weather of [null,
    {clouds:100,code:65,precipitation:12,temperature:12},
    {clouds:95,code:48,temperature:24}]) {
    const start = Date.parse(`2026-${month}-25T00:00:00+03:00`);
    for (let minute = 0; minute < 1440; minute += 10) {
      const state = campPalette({ date:new Date(start + minute * 60000), weather });
      const p = mapPalette(state.css);
      assert(p, `${month} ${minute}`);
      assert.equal(p.land, state.page);
      colours.add(p.water);
      for (const surface of ['land','water','park','building','road']) {
        assert(contrast(p.ink,p[surface]) >= 4.5, `${month} ${minute} ${surface} label`);
        assert(contrast(p.accent,p[surface]) >= 3, `${month} ${minute} ${surface} marker`);
      }
    }
  }
  assert(colours.size > 50);
});

test('the frame accepts only the exact parent and a bounded colour schema', () => {
  const parent = {}, origin = new URL(productionSite).origin;
  const palette = mapPalette(campPalette().css);
  const event = { source:parent, origin, data:{type:mapPaletteType,palette} };
  assert.deepEqual(trustedMapPalette(event,parent,origin),palette);
  for (const changed of [{source:{}},{origin:'https://example.com'},
    {data:{type:'dd-map-command',palette}},
    {data:{type:mapPaletteType,palette:{...palette,url:'https://example.com'}}},
    {data:{type:mapPaletteType,palette:{...palette,land:'url(https://example.com)'}}},
    {data:{type:mapPaletteType,palette:{...palette,scheme:'auto'}}}])
    assert.equal(trustedMapPalette({...event,...changed},parent,origin),null);
  assert.equal(normaliseMapPalette(null),null);
  assert.equal(mapPalette({'--dd-page':'invalid'}),null);
});

test('only existing paint is changed: map identity, sources, geometry, filters and icons remain intact', () => {
  const layers = [
    {id:'land',type:'background'},
    {id:'water',type:'fill','source-layer':'water'},
    {id:'landuse',type:'fill','source-layer':'landuse'},
    {id:'building',type:'fill','source-layer':'building'},
    {id:'road-primary-case',type:'line','source-layer':'road'},
    {id:'road-primary',type:'line','source-layer':'road'},
    {id:'settlement-label',type:'symbol',layout:{'text-field':['get','name']}},
    {id:'marine-label',type:'symbol',layout:{'text-field':['get','name']}},
    {id:'poi-icon',type:'symbol',layout:{'icon-image':'park'}},
    {id:'satellite',type:'raster'},
  ];
  const original = JSON.stringify(layers), calls = [];
  const map = { getStyle:()=>({layers}),setPaintProperty:(...args)=>calls.push(args) };
  const p = mapPalette(campPalette().css);
  assert(paintMap(map,p) > 8);
  assert.equal(JSON.stringify(layers),original);
  assert(calls.every(call=>/color$/.test(call[1])));
  assert(!calls.some(call=>['poi-icon','satellite'].includes(call[0])));
  assert.deepEqual(calls.find(call=>call[0]==='water'),['water','fill-color',p.water]);
  assert.deepEqual(calls.find(call=>call[0]==='marine-label'&&call[1]==='text-halo-color'),['marine-label','text-halo-color',p.water]);
  assert.equal(paintMap(map,{...p,land:'red'}),0);
  assert.doesNotThrow(()=>paintMap({getStyle:()=>({layers}),setPaintProperty:()=>{throw Error('unknown layer');}},p));
});
