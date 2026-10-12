// Coral's exported sway loop in neutral inks. Preserve the source's forks,
// paper lobes, ribs, dots and grain; adapt crop, pigments and outer feathering.
const halves = [...document.querySelectorAll('.sea-current--coral')];
const canvases = halves.map(half => half.querySelector('canvas'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const video = document.createElement('video');
video.muted = true; video.loop = true; video.playsInline = true;
video.preload = 'none';
const still = new Image();
const buffer = document.createElement('canvas');
const context = buffer.getContext('2d',{willReadFrequently:true});
const targets = canvases.map(canvas => canvas.getContext('2d'));
const visible = new Set();
let raf = 0, last = -Infinity, failed = false, above = 0, worldHeight = 0, orientation = '';

const smooth = value => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
function luminance(color) {
  const linear=color.map(v=>v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4);
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
function readableAmount(base,ink,text,maximum) {
  const fg=luminance(text);
  let low=0,high=maximum;
  for(let i=0;i<10;i++) {
    const value=(low+high)/2, bg=luminance(base.map((v,c)=>v+(ink[c]-v)*value));
    const ratio=(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);
    if(ratio>=4.6) low=value;else high=value;
  }
  return low;
}
function near(rect,x,y,radius=96) {
  const dx=Math.max(rect.left-x,0,x-rect.right),dy=Math.max(rect.top-y,0,y-rect.bottom);
  if(dx>=radius||dy>=radius)return 0;
  if(dx===0&&dy===0)return 1;
  return 1-smooth(Math.hypot(dx,dy)/radius);
}
function chooseSource() {
  const next=innerWidth<=760?'portrait-':'';
  if(orientation===next && video.getAttribute('src'))return;
  orientation=next;failed=false;
  video.pause();
  video.src=new URL(`./media/coral-88364-${next}loop.mp4`,import.meta.url).href;
  still.src=new URL(`./media/coral-88364-${next}still.jpg`,import.meta.url).href;
  for(const canvas of canvases)canvas.dataset.source=next?'coral-88364-9x16':'coral-88364-16x9';
}

function rgb(css) {
  const values = css.match(/[\d.]+/g)?.map(Number) || [];
  return css.startsWith('color(srgb') ? values.slice(0,3).map(v=>v*255) : values.slice(0,3);
}
function size() {
  chooseSource();
  const rect=halves[0].getBoundingClientRect();
  above=rect.height;
  worldHeight=above+halves[1].getBoundingClientRect().height;
  if (!rect.width || !worldHeight) return;
  for(const half of halves)half.style.setProperty('--coral-world-height',`${worldHeight}px`);
  const scale = Math.min(1,1280/rect.width,Math.sqrt(480000/(rect.width*worldHeight)));
  const width = Math.round(rect.width*scale), height = Math.round(worldHeight*scale);
  if (width === buffer.width && height === buffer.height) {paint();sync();return;}
  buffer.width=width; buffer.height=height;
  for (const canvas of canvases) {canvas.width=width;canvas.height=height;}
  paint();sync();
}
function paint() {
  const started=performance.now();
  const source = video.readyState>=2 ? video : still;
  const sw = source.videoWidth || source.naturalWidth;
  const sh = source.videoHeight || source.naturalHeight;
  if (!sw || !sh || !buffer.width || !buffer.height) return;
  const w=buffer.width,h=buffer.height;
  const scale=Math.max(w/sw,h/sh), cw=w/scale, ch=h/scale;
  context.drawImage(source,(sw-cw)/2,(sh-ch)/2,cw,ch,0,0,w,h);
  const frame=context.getImageData(0,0,w,h), pixels=frame.data;
  const probes=halves[0].querySelectorAll('.sea-coral-pigment');
  const pale=rgb(getComputedStyle(probes[0]).color), deep=rgb(getComputedStyle(probes[1]).color);
  if (pale.length!==3 || deep.length!==3) return;
  const weatherText=rgb(getComputedStyle(document.querySelector('#weather')).color);
  const aboutText=rgb(getComputedStyle(document.querySelector('#about')).color);
  const weatherAmount=readableAmount(pale,deep,weatherText,.16);
  const aboutAmount=readableAmount(deep,pale,aboutText,.30);
  const world=canvases[0].getBoundingClientRect();
  const box=node=>{const r=node.getBoundingClientRect();return{left:r.left-world.left,right:r.right-world.left,top:r.top-world.top,bottom:r.bottom-world.top};};
  const weatherBoxes=[...document.querySelectorAll('#weather .weather-heading,#weather .forecast-brief,#weather .forecast-timeline')].map(box);
  const copyBox=box(document.querySelector('#about .about-copy'));
  const caption=document.querySelector('#about .about-print figcaption');
  const captionBox=caption?box(caption):null;
  const tones=new Float32Array(256);
  for(let tone=0;tone<256;tone++)tones[tone]=tone/255;
  for(let y=0,p=0;y<h;y++) {
    const wy=y/h*worldHeight,distance=wy-above;
    for(let x=0;x<w;x++,p+=4) {
      const grey=tones[pixels[p]],wx=x/w*world.width;
      // The broad pigment edge bends with Coral's actual printed field.
      // Soft local washes keep the existing light/dark reading roles legible.
      let weatherWash=0;
      for(const rect of weatherBoxes){weatherWash=Math.max(weatherWash,near(rect,wx,wy,80));if(weatherWash===1)break;}
      const aboutWash=Math.max(near(copyBox,wx,wy,112),captionBox?near(captionBox,wx,wy,80):0);
      let blend=smooth((distance+(grey-.5)*200+160)/320);
      blend*=1-weatherWash;
      blend+=(1-blend)*aboutWash;
      const protectedArea=Math.max(weatherWash,aboutWash);
      const safeAmount=weatherAmount*(1-blend)+aboutAmount*blend;
      const amount=safeAmount*protectedArea+.5*(1-protectedArea);
      for(let c=0;c<3;c++) {
        const ground=pale[c]+(deep[c]-pale[c])*blend;
        const ink=deep[c]+(pale[c]-deep[c])*blend;
        pixels[p+c]=ground+(ink-ground)*grey*amount;
      }
    }
  }
  context.putImageData(frame,0,0);
  for(let i=0;i<canvases.length;i++) {
    targets[i].drawImage(buffer,0,0);
    canvases[i].dataset.frame=String(Math.floor(video.currentTime*12));
    canvases[i].dataset.paintMs=(performance.now()-started).toFixed(1);
    canvases[i].dataset.weatherAmount=weatherAmount.toFixed(3);
    canvases[i].dataset.aboutAmount=aboutAmount.toFixed(3);
  }
}
function tick(time) {
  if(time-last>=1000/12) {paint();last=time;}
  raf=requestAnimationFrame(tick);
}
function sync() {
  const play = !reduced.matches && !document.hidden && visible.size>0 && !document.querySelector('dialog[open]') && !failed;
  cancelAnimationFrame(raf);
  if(play) {
    video.play().then(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);})
      .catch(error=>{if(error.name!=='AbortError')failed=true;paint();});
  } else {video.pause();paint();}
}
still.addEventListener('load',()=>{document.documentElement.classList.add('coral-as-background');size();paint();});
video.addEventListener('loadeddata',paint);
video.addEventListener('error',()=>{failed=true;paint();});
const visibility=new IntersectionObserver(entries=>{
  for(const entry of entries) entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target);
  sync();
});
for(const half of halves) visibility.observe(half);
const layout=new ResizeObserver(size);
for(const half of halves)layout.observe(half.parentElement);
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',sync);
new MutationObserver(()=>{paint();sync();}).observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});
for(const dialog of document.querySelectorAll('dialog')) new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
size();
