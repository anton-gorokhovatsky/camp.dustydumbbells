// Rectangular coordinates sampled from Apple's public SwiftUI RoundedRectangle
// with style .continuous. See scripts/research/native-rounded-rectangle.swift
// and the independently generated fixtures. Capsule ends retain their accepted path.
export function continuousCorner() {
  return {
    extent: 1.5286649465560913,
    curves: [
      [[-1.0884900093078613,0],[-.8684070110321045,0],[-.6314939856529236,.07491140067577362]],
      [[-.3728240132331848,.16906000673770905],[-.16906000673770905,.3728240132331848],[-.07491140067577362,.6314939856529236]],
      [[0,.8684070110321045],[0,1.0884900093078613],[0,1.5286649465560913]],
    ],
  };
}

export function cornerTransition() {
  const angle = Math.PI / 9, sin = Math.sin(angle), cos = Math.cos(angle);
  const tangent = (1-cos)/sin;
  const b = sin-tangent*cos;
  const a = b-3*tangent**3/(2*(1-cos));
  return {a,b,sin,cos,extension:.3};
}

export function smoothRectPath(width, height, radius, inset = 0, cornerRadii = null) {
  if (![width,height,radius,inset,...(cornerRadii||[])].every(Number.isFinite)) throw new TypeError('Finite contour dimensions are required.');
  if(cornerRadii&&cornerRadii.length!==4)throw new TypeError('Four corner radii are required.');
  const w=width-inset*2,h=height-inset*2;
  if(w<=0||h<=0)return '';
  const {a,b,sin,cos,extension:s}=cornerTransition();
  const point=pair=>pair.map(v=>Number((v+inset).toFixed(3))).join(' ');
  const command=(name,...pairs)=>name+pairs.map(point).join(' ');
  let path;
  if((!cornerRadii||cornerRadii.every(value=>value===radius))&&radius-inset>=h/2 && w>=h*(1+s)) {
    const r=h/2,right=w-r,left=r;
    path=command('M',[left+s*r,0])+command('L',[right-s*r,0]);
    for(const [cx,cy,sign] of [[right,r,1],[left,r,-1]]) {
      const p=(x,y)=>[cx+sign*x*r,cy+sign*y*r];
      path+=command('C',p(a,-1),p(b,-1),p(sin,-cos));
      path+=`A${r} ${r} 0 0 1 ${point(p(sin,cos))}`;
      path+=command('C',p(b,1),p(a,1),p(-s,1));
      if(sign===1)path+=command('L',[left+s*r,h]);
    }
  } else {
    const {extent,curves}=continuousCorner();
    const [tr,br,bl,tl]=(cornerRadii||[radius,radius,radius,radius]).map(value=>Math.max(0,Math.min(value-inset,w/(2*extent),h/(2*extent))));
    const corners=[
      (x,y)=>[w+x*tr,y*tr],
      (x,y)=>[w-y*br,h+x*br],
      (x,y)=>[-x*bl,h-y*bl],
      (x,y)=>[y*tl,-x*tl],
    ];
    path=command('M',[tl*extent,0]);
    for(const p of corners){
      path+=command('L',p(-extent,0));
      for(const curve of curves)path+=command('C',...curve.map(([x,y])=>p(x,y)));
    }
  }
  return path+'Z';
}

export function smoothCorners(element) {
  if (!element || !CSS.supports('clip-path','path("M0 0H1V1Z")')) return;
  const update = () => {
    const {width,height} = element.getBoundingClientRect();
    if (!width || !height) return;
    const style=getComputedStyle(element);
    const value = parseFloat(style.borderTopLeftRadius);
    const radius = Number.isFinite(value) ? value : 24;
    const radii=['borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','borderTopLeftRadius'].map(name=>parseFloat(style[name])||0);
    element.style.setProperty('--dd-smooth-path',`path("${smoothRectPath(width,height,radius,0,radii)}")`);
    const stroke = element.dataset.ddSmooth === 'paint' ? parseFloat(style.borderTopWidth) || 0 : 1;
    element.style.setProperty('--dd-smooth-border',`${parseFloat(style.borderTopWidth)||0}px`);
    const path = smoothRectPath(width,height,radius,stroke/2,radii);
    const edge = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${path}" fill="none" stroke="black" stroke-width="${stroke}"/></svg>`;
    element.style.setProperty('--dd-smooth-edge',`url("data:image/svg+xml,${encodeURIComponent(edge)}")`);
    element.classList.add('dd-smooth-ready');
  };
  new ResizeObserver(update).observe(element);
  document.fonts.ready.then(update);
  update();
}
