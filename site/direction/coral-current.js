// Coral keeps two weather-derived pigments. Limit the texture's tonal range,
// so real DOM text can keep one solid ink throughout the exported motion.
const linear = Float32Array.from({length:256}, (_,i) => {
  const value=i/255;
  return value<=.04045 ? value/12.92 : ((value+.055)/1.055)**2.4;
});
export const coralLuminance = rgb => rgb.reduce((sum,value,index) =>
  sum+linear[Math.max(0,Math.min(255,Math.round(value)))]*[.2126,.7152,.0722][index],0);
const mix = (a,b,amount) => a.map((value,index)=>value+(b[index]-value)*amount);
function withinTone(colour, target, limit, minimum) {
  if (minimum ? coralLuminance(colour)>=limit : coralLuminance(colour)<=limit) return colour;
  let low=0,high=1;
  for(let i=0;i<14;i++) {
    const middle=(low+high)/2, value=coralLuminance(mix(colour,target,middle));
    if(minimum ? value>=limit : value<=limit) high=middle; else low=middle;
  }
  return mix(colour,target,high);
}
export function createCoralPalette(pale,deep) {
  const light=withinTone(pale,[255,255,255],.28,true);
  const dark=withinTone(deep,[0,0,0],.12,false);
  const weatherDetail=withinTone(mix(light,dark,.5),light,.20,true);
  const aboutDetail=withinTone(mix(dark,light,.5),dark,.15,false);
  const weather=new Uint8ClampedArray(256*3), about=new Uint8ClampedArray(256*3);
  for(let tone=0;tone<256;tone++) for(let channel=0;channel<3;channel++) {
    weather[tone*3+channel]=light[channel]+(weatherDetail[channel]-light[channel])*tone/255;
    about[tone*3+channel]=dark[channel]+(aboutDetail[channel]-dark[channel])*tone/255;
  }
  return {weather,about};
}

// Coral's exported sway loop in neutral inks. Preserve the source's forks,
// paper lobes, ribs, dots and grain; adapt crop, pigments and outer feathering.
export function setupCoralCurrent(reduced) {
const halves = [...document.querySelectorAll('.sea-current--coral')];
if (halves.length !== 2) return;
const canvases = halves.map(half => half.querySelector('canvas'));
const video = document.createElement('video');
video.muted = true; video.loop = true; video.playsInline = true;
video.preload = 'none';
const still = new Image();
// Retain a neutral source frame across responsive source changes. Resizing a
// canvas must not expose the plain field while a new crop is downloading.
const retainedSource=document.createElement('canvas');
retainedSource.width=retainedSource.height=0;
const retainedContext=retainedSource.getContext('2d');
const buffer = document.createElement('canvas');
const context = buffer.getContext('2d',{willReadFrequently:true});
const targets = canvases.map(canvas => canvas.getContext('2d'));
let paletteKey='',palette;
const visible = new Set();
let raf = 0, last = -Infinity, failed = false, above = 0, worldHeight = 0, orientation = '';

const smooth = value => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
function chooseSource() {
  const next=innerWidth<=760?'portrait-':'';
  if(orientation===next && video.getAttribute('src'))return;
  const previous=video.readyState>=2?video:still;
  const previousWidth=previous.videoWidth||previous.naturalWidth;
  const previousHeight=previous.videoHeight||previous.naturalHeight;
  if(previousWidth&&previousHeight){
    retainedSource.width=previousWidth;retainedSource.height=previousHeight;
    retainedContext.drawImage(previous,0,0);
  }
  orientation=next;failed=false;
  video.pause();
  const mediaURL=file=>{const url=new URL(`./media/${file}`,import.meta.url);url.search=new URL(import.meta.url).search;return url.href;};
  video.src=mediaURL(`coral-88364-${next}loop.mp4`);
  still.src=mediaURL(`coral-88364-${next}still.jpg`);
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
  const source = video.readyState>=2 ? video : still.naturalWidth ? still : retainedSource;
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  if (!sw || !sh || !buffer.width || !buffer.height) return;
  const w=buffer.width,h=buffer.height;
  const scale=Math.max(w/sw,h/sh), cw=w/scale, ch=h/scale;
  context.drawImage(source,(sw-cw)/2,(sh-ch)/2,cw,ch,0,0,w,h);
  const frame=context.getImageData(0,0,w,h), pixels=frame.data;
  const probes=halves[0].querySelectorAll('.sea-coral-pigment');
  const pale=rgb(getComputedStyle(probes[0]).color), deep=rgb(getComputedStyle(probes[1]).color);
  if (pale.length!==3 || deep.length!==3) return;
  const key=pale.join(',')+';'+deep.join(',');
  if(key!==paletteKey) {palette=createCoralPalette(pale,deep);paletteKey=key;}
  const {weather,about}=palette;
  // The colour crossing fits between the two reading fields. The exported
  // drawing continues through both; no rectangle follows any text bounds.
  for(let y=0,p=0;y<h;y++) {
    const distance=y/h*worldHeight-above;
    const blend=smooth((distance+80)/120);
    for(let x=0;x<w;x++,p+=4) {
      const tone=pixels[p]*3;
      for(let channel=0;channel<3;channel++)
        pixels[p+channel]=weather[tone+channel]+(about[tone+channel]-weather[tone+channel])*blend;
    }
  }
  context.putImageData(frame,0,0);
  for(let i=0;i<canvases.length;i++) {
    targets[i].drawImage(buffer,0,0);
    canvases[i].dataset.frame=String(Math.floor(video.currentTime*12));
    canvases[i].dataset.paintMs=(performance.now()-started).toFixed(1);
    canvases[i].dataset.inkMode='solid-field';
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
let scrollPaintPending=false;
document.addEventListener('scroll',()=>{
  if(video.paused&&!scrollPaintPending){scrollPaintPending=true;requestAnimationFrame(()=>{scrollPaintPending=false;paint();});}
},{capture:true,passive:true});
document.fonts.ready.then(()=>{size();paint();});
reduced.addEventListener('change',sync);
new MutationObserver(()=>{paint();sync();}).observe(document.documentElement,{attributes:true,attributeFilter:['style','class']});
for(const dialog of document.querySelectorAll('dialog')) new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
size();
}
