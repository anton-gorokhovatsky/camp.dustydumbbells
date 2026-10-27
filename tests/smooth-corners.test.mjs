import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cornerTransition, smoothRectPath, smoothCorners } from '../dist/smooth-corners.js';

test('a transformed photo uses its fractional local border box for all contour layers',()=>{
  const saved=Object.fromEntries(['CSS','getComputedStyle','ResizeObserver','document'].map(key=>[key,globalThis[key]]));
  try{
    globalThis.CSS={supports:()=>true};
    globalThis.ResizeObserver=class{observe(){}};
    globalThis.document={fonts:{ready:{then:update=>update()}}};
    for(const sample of [
      {boxSizing:'border-box',width:'181.5px',height:'260px',w:181.5,h:260},
      {boxSizing:'content-box',width:'150.5px',height:'200px',w:176.5,h:226},
    ]){
      const properties={};
      globalThis.getComputedStyle=()=>({...sample,paddingLeft:'12px',paddingRight:'12px',paddingTop:'12px',paddingBottom:'12px',borderTopWidth:'1px',borderRightWidth:'1px',borderBottomWidth:'1px',borderLeftWidth:'1px',borderTopLeftRadius:'18px',borderTopRightRadius:'18px',borderBottomLeftRadius:'18px',borderBottomRightRadius:'18px'});
      const photo={dataset:{ddSmooth:'photo'},style:{setProperty:(key,value)=>{properties[key]=value;}},classList:{add(){}},getBoundingClientRect:()=>({width:999,height:888})};
      smoothCorners(photo);
      assert.equal(properties['--dd-smooth-path'],`path("${smoothRectPath(sample.w,sample.h,18)}")`);
      const edge=decodeURIComponent(properties['--dd-smooth-edge']);
      assert(edge.includes(`viewBox="0 0 ${sample.w} ${sample.h}"`));
    }
  }finally{for(const [key,value]of Object.entries(saved))globalThis[key]=value;}
});

test('rectangular contours match independent paths exported by native SwiftUI at menu and photo sizes', async () => {
  const reference=JSON.parse(await readFile(new URL('./fixtures/apple-continuous-rectangles.json',import.meta.url),'utf8'));
  for(const sample of reference.cases) {
    const path=smoothRectPath(sample.width,sample.height,sample.radius);
    const actual=[...path.matchAll(/C([^A-Z]+)/g)].map(match=>match[1].trim().split(/\s+/).map(Number));
    const native=sample.elements.filter(element=>element.type===3).map(element=>element.points.flat());
    const expected=[...native.slice(9),...native.slice(0,9)];
    assert.equal(actual.length,expected.length);
    actual.forEach((curve,index)=>curve.forEach((value,point)=>assert(Math.abs(value-expected[index][point])<=.001,`Native contour differs at ${sample.width}×${sample.height}, segment ${index}, coordinate ${point}`)));
  }
  assert(!smoothRectPath(173,260,16).includes('A'));
  const header=smoothRectPath(256,30,2,0,[2,0,0,2]);
  assert(header.includes('L256 30C256 30 256 30 256 30'));
  assert(header.includes('L0 30C0 30 0 30 0 30'));
});

test('the straight-to-arc transition has zero initial curvature and matches the circular end', () => {
  const {a,b,sin,cos,extension}=cornerTransition();
  for(const radius of [16,26,32]) {
    const p=[[-extension,-1],[a,-1],[b,-1],[sin,-cos]].map(v=>v.map(n=>n*radius));
    const derivative=t=>t ? p[3].map((n,i)=>3*(n-p[2][i])) : p[1].map((n,i)=>3*(n-p[0][i]));
    const second=t=>t ? p[3].map((n,i)=>6*(n-2*p[2][i]+p[1][i])) : p[2].map((n,i)=>6*(n-2*p[1][i]+p[0][i]));
    const curvature=t=>{const d=derivative(t),s=second(t);return Math.abs(d[0]*s[1]-d[1]*s[0])/Math.hypot(...d)**3;};
    assert.equal(curvature(0),0);
    assert(Math.abs(curvature(1)-1/radius)<1e-9);
    const d=derivative(1);
    assert(Math.abs(d[1]/d[0]-sin/cos)<1e-9);
  }
});

test('the small movie capsule keeps circular ends and all responsive contour paths stay finite', () => {
  assert(smoothRectPath(96,52,32).includes('A26 26'));
  for(const [w,h,r] of [[96,52,32],[104,60,32],[416,316,28],[296,748,28],[180,260,16]]) {
    for(const inset of [0,.5]) {
      const path=smoothRectPath(w,h,r,inset);
      assert(path.startsWith('M')&&path.endsWith('Z'));
      assert(!/NaN|Infinity/.test(path));
    }
  }
});
