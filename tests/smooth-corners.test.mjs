import test from 'node:test';
import assert from 'node:assert/strict';
import { continuousCorner, cornerTransition, smoothRectPath } from '../dist/smooth-corners.js';

test('rectangular corners start with zero curvature, grow continuously and retain the diagonal rounding', () => {
  const {a,b,diagonal:d,spanScale}=continuousCorner();
  const p=[[0,-1],[a,-1],[b,-1],[d,-d]];
  let previous=0;
  for(let step=0;step<=200;step++) {
    const t=step/200;
    const first=[0,1].map(i=>3*((1-t)**2*(p[1][i]-p[0][i])+2*t*(1-t)*(p[2][i]-p[1][i])+t*t*(p[3][i]-p[2][i])));
    const second=[0,1].map(i=>6*((1-t)*(p[2][i]-2*p[1][i]+p[0][i])+t*(p[3][i]-2*p[2][i]+p[1][i])));
    const curvature=(first[0]*second[1]-first[1]*second[0])/Math.hypot(...first)**3;
    assert(curvature>=previous-1e-10);
    if(step===0)assert.equal(curvature,0);
    previous=curvature;
  }
  assert(Math.abs(spanScale*(1-d)-(1-1/Math.SQRT2))<1e-12);
  assert(Math.abs(d-b-(1-d))<1e-12);
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
