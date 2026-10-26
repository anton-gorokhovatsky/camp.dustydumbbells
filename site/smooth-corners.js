// Short transitions join the straight edge to a circular arc with zero initial
// curvature and the arc's curvature at the join. Capsule ends remain round.
// This shared web contour is not Apple's private path.
export function cornerTransition() {
  const angle = Math.PI / 9, sin = Math.sin(angle), cos = Math.cos(angle);
  const tangent = (1-cos)/sin;
  const b = sin-tangent*cos;
  const a = b-3*tangent**3/(2*(1-cos));
  return {a,b,sin,cos,extension:.3};
}

export function smoothRectPath(width, height, radius, inset = 0) {
  if (![width,height,radius,inset].every(Number.isFinite)) throw new TypeError('Finite contour dimensions are required.');
  const w=width-inset*2,h=height-inset*2;
  if(w<=0||h<=0)return '';
  const {a,b,sin,cos,extension:s}=cornerTransition();
  const point=pair=>pair.map(v=>Number((v+inset).toFixed(3))).join(' ');
  const command=(name,...pairs)=>name+pairs.map(point).join(' ');
  let path;
  if(radius-inset>=h/2 && w>=h*(1+s)) {
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
    const r=Math.max(0,Math.min(radius-inset,w/(2*(1+s)),h/(2*(1+s))));
    const corners=[
      (x,y)=>[w-r+x*r,r+y*r],
      (x,y)=>[w-r-y*r,h-r+x*r],
      (x,y)=>[r-x*r,h-r-y*r],
      (x,y)=>[r+y*r,r-x*r],
    ];
    path=command('M',[r*(1+s),0]);
    for(const p of corners){
      path+=command('L',p(-s,-1))+command('C',p(a,-1),p(b,-1),p(sin,-cos));
      path+=`A${r} ${r} 0 0 1 ${point(p(cos,-sin))}`;
      path+=command('C',p(1,-b),p(1,-a),p(1,s));
    }
  }
  return path+'Z';
}

export function smoothCorners(element) {
  if (!element || !CSS.supports('clip-path','path("M0 0H1V1Z")')) return;
  const update = () => {
    const {width,height} = element.getBoundingClientRect();
    if (!width || !height) return;
    const value = parseFloat(getComputedStyle(element).borderTopLeftRadius);
    const radius = Number.isFinite(value) ? value : 24;
    element.style.setProperty('--dd-smooth-path',`path("${smoothRectPath(width,height,radius)}")`);
    const path = smoothRectPath(width,height,radius,.5);
    const edge = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${path}" fill="none" stroke="black" stroke-width="1"/></svg>`;
    element.style.setProperty('--dd-smooth-edge',`url("data:image/svg+xml,${encodeURIComponent(edge)}")`);
    element.classList.add('dd-smooth-ready');
  };
  new ResizeObserver(update).observe(element);
  document.fonts.ready.then(update);
  update();
}
