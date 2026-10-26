import test from 'node:test';
import assert from 'node:assert/strict';
import { cornerTransition, smoothRectPath } from '../dist/smooth-corners.js';

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
