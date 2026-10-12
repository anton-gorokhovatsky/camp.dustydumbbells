// Coral's exported sway loop in neutral inks. Preserve the source's forks,
// paper lobes, ribs, dots and grain; adapt crop, pigments and outer feathering.
const halves = [...document.querySelectorAll('.sea-current--coral')];
const canvases = halves.map(half => half.querySelector('canvas'));
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const video = document.createElement('video');
video.muted = true; video.loop = true; video.playsInline = true;
video.preload = 'none';
video.src = new URL('./media/coral-88364-loop.mp4',import.meta.url).href;
const still = new Image();
still.src = new URL('./media/coral-88364-still.jpg',import.meta.url).href;
const buffer = document.createElement('canvas');
const context = buffer.getContext('2d',{willReadFrequently:true});
const targets = canvases.map(canvas => canvas.getContext('2d'));
const visible = new Set();
let raf = 0, last = -Infinity, failed = false;

function rgb(css) {
  const values = css.match(/[\d.]+/g)?.map(Number) || [];
  return css.startsWith('color(srgb') ? values.slice(0,3).map(v=>v*255) : values.slice(0,3);
}
function size() {
  const rect = canvases[0].getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(1,1280/rect.width);
  const width = Math.round(rect.width*scale), height = Math.round(rect.height*scale);
  if (width === buffer.width && height === buffer.height) return;
  buffer.width=width; buffer.height=height;
  for (const canvas of canvases) {canvas.width=width;canvas.height=height;}
  paint();
}
function paint() {
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
  const lut=new Uint8ClampedArray(256*3);
  for (let tone=0;tone<256;tone++) for(let c=0;c<3;c++)
    lut[tone*3+c]=deep[c]+(pale[c]-deep[c])*(tone/255);
  for (let p=0;p<pixels.length;p+=4) {
    const tone=pixels[p]*3;
    pixels[p]=lut[tone];pixels[p+1]=lut[tone+1];pixels[p+2]=lut[tone+2];
  }
  context.putImageData(frame,0,0);
  for(let i=0;i<canvases.length;i++) {
    targets[i].drawImage(buffer,0,0);
    canvases[i].dataset.frame=String(Math.round(video.currentTime*12));
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
      .catch(()=>{failed=true;paint();});
  } else {video.pause();paint();}
}
still.addEventListener('load',()=>{size();paint();});
video.addEventListener('loadeddata',paint);
video.addEventListener('error',()=>{failed=true;paint();});
const visibility=new IntersectionObserver(entries=>{
  for(const entry of entries) entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target);
  sync();
});
for(const half of halves) visibility.observe(half);
new ResizeObserver(size).observe(canvases[0]);
document.addEventListener('visibilitychange',sync);
reduced.addEventListener('change',sync);
new MutationObserver(()=>{paint();sync();}).observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});
for(const dialog of document.querySelectorAll('dialog')) new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
size();
