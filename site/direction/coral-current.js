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
const buffer = document.createElement('canvas');
const context = buffer.getContext('2d',{willReadFrequently:true});
const targets = canvases.map(canvas => canvas.getContext('2d'));
const inkSurface=document.createElement('canvas');
const inkContext=inkSurface.getContext('2d');
const probeSurface=document.createElement('canvas');
const probeContext=probeSurface.getContext('2d');
const linear=new Float32Array(256);
for(let i=0;i<256;i++)linear[i]=i/255<=.04045?i/255/12.92:((i/255+.055)/1.055)**2.4;
const inkThreshold=Math.sqrt(.05*1.05)-.05;
let inkFrame;
const visible = new Set();
let raf = 0, last = -Infinity, failed = false, above = 0, worldHeight = 0, orientation = '';

const smooth = value => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
function chooseSource() {
  const next=innerWidth<=760?'portrait-':'';
  if(orientation===next && video.getAttribute('src'))return;
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
  if (width === buffer.width && height === buffer.height && inkFrame) {paint();sync();return;}
  buffer.width=width; buffer.height=height;
  inkSurface.width=width;inkSurface.height=height;
  probeSurface.width=width;probeSurface.height=height;
  inkFrame=inkContext.createImageData(width,height);
  inkFrame.data.fill(255);
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
  const world=canvases[0].getBoundingClientRect();
  const tones=new Float32Array(256);
  for(let tone=0;tone<256;tone++)tones[tone]=tone/255;
  let minInkContrast=100;
  const rgba=new Uint8ClampedArray(3),inkPixels=inkFrame.data;
  for(let y=0,p=0;y<h;y++) {
    const wy=y/h*worldHeight,distance=wy-above;
    const t=y/h;
    const mask=t<.08?t/.08:t>.72?(1-t)/.28:1;
    const backdrop=wy<above?pale:deep;
    for(let x=0;x<w;x++,p+=4) {
      const grey=tones[pixels[p]];
      // One continuous picture. Text bounds never darken the background.
      const blend=smooth((distance+(grey-.5)*200+160)/320);
      for(let c=0;c<3;c++) {
        const ground=pale[c]+(deep[c]-pale[c])*blend;
        const ink=deep[c]+(pale[c]-deep[c])*blend;
        pixels[p+c]=ground+(ink-ground)*grey*.5;
        rgba[c]=pixels[p+c]*mask+backdrop[c]*(1-mask);
      }
      // Change the ink inside the actual DOM glyphs, not the picture beneath.
      inkPixels[p]=rgba[0];inkPixels[p+1]=rgba[1];inkPixels[p+2]=rgba[2];
    }
  }
  // Read the broad colour field, not the print grain, when choosing text ink.
  probeContext.putImageData(inkFrame,0,0);
  inkContext.filter='blur(3px)';inkContext.drawImage(probeSurface,0,0);inkContext.filter='none';
  const broad=inkContext.getImageData(0,0,w,h).data;
  const at=(p,c,amount,target,mask,backdrop)=>Math.round((pixels[p+c]+(target[c]-pixels[p+c])*amount)*mask+backdrop[c]*(1-mask));
  for(let y=0,p=0;y<h;y++) {
    const t=y/h,mask=t<.08?t/.08:t>.72?(1-t)/.28:1;
    const backdrop=y/h*worldHeight<above?pale:deep;
    for(let x=0;x<w;x++,p+=4) {
      const averaged=linear[broad[p]]*.2126+linear[broad[p+1]]*.7152+linear[broad[p+2]]*.0722;
      let black=averaged>inkThreshold;
      let actual=linear[inkPixels[p]]*.2126+linear[inkPixels[p+1]]*.7152+linear[inkPixels[p+2]]*.0722;
      if((black&&actual<.185)||(!black&&actual>.174)) {
        // A tiny global tone curve separates the two print inks. It applies
        // to the whole picture and never uses text positions or text boxes.
        const target=black?pale:deep;
        let low=0,high=1;
        for(let i=0;i<8;i++) {
          const amount=(low+high)/2;
          const l=linear[at(p,0,amount,target,mask,backdrop)]*.2126+linear[at(p,1,amount,target,mask,backdrop)]*.7152+linear[at(p,2,amount,target,mask,backdrop)]*.0722;
          if(black?l>=.185:l<=.174)high=amount;else low=amount;
        }
        for(let c=0;c<3;c++){pixels[p+c]+=(target[c]-pixels[p+c])*high;inkPixels[p+c]=Math.round(pixels[p+c]*mask+backdrop[c]*(1-mask));}
        actual=linear[inkPixels[p]]*.2126+linear[inkPixels[p+1]]*.7152+linear[inkPixels[p+2]]*.0722;
        if((black&&actual<.179)||(!black&&actual>.179))black=actual>inkThreshold;
      }
      minInkContrast=Math.min(minInkContrast,black?(actual+.05)/.05:1.05/(actual+.05));
      inkPixels[p]=inkPixels[p+1]=inkPixels[p+2]=black?0:255;
    }
  }
  context.putImageData(frame,0,0);
  inkContext.putImageData(inkFrame,0,0);
  const inkImage=`url("${inkSurface.toDataURL('image/png')}")`;
  for(const section of [halves[0].parentElement,halves[1].parentElement]) {
    section.style.setProperty('--coral-ink-image',inkImage);
    section.style.setProperty('--coral-ink-size',`${world.width}px ${world.height}px`);
  }
  const text=document.querySelectorAll('#weather h2,#weather p,#weather dt,#weather dd,#weather time,#weather li>span,#about .about-copy h2,#about .about-copy p,#about .about-copy dt,#about .about-copy dd,#about .about-copy a');
  for(const node of text) {
    const rect=node.getBoundingClientRect();
    if(!rect.width||!rect.height)continue;
    node.classList.add('coral-adaptive-ink');
    node.style.setProperty('--coral-ink-position',`${world.left-rect.left}px ${world.top-rect.top}px`);
    if(node.tagName==='A') {
      const ix=Math.max(0,Math.min(w-1,Math.floor(((rect.left+rect.right)/2-world.left)/world.width*w)));
      const iy=Math.max(0,Math.min(h-1,Math.floor(((rect.top+rect.bottom)/2-world.top)/world.height*h)));
      node.style.textDecorationColor=inkPixels[(iy*w+ix)*4]?'#fff':'#000';
    }
  }
  for(let i=0;i<canvases.length;i++) {
    targets[i].drawImage(buffer,0,0);
    canvases[i].dataset.frame=String(Math.floor(video.currentTime*12));
    canvases[i].dataset.paintMs=(performance.now()-started).toFixed(1);
    canvases[i].dataset.inkMinContrast=minInkContrast.toFixed(3);
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
