import {smoothCorners} from './smooth-corners.js';
for(const track of document.querySelectorAll('.dd-track')){
  const motion=track.querySelector('.dd-track__motion'),lap=motion.firstElementChild;
  // The first encounter already contains its photograph. A distant band
  // does not spend that composition before the visitor has reached it.
  motion.style.animationPlayState='paused';
  const entry=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){motion.style.animationPlayState='';entry.disconnect();}});
  entry.observe(track);
  const measure=()=>{
    if(document.documentElement.dataset.ddMarquees==='paused')return;
    const width=lap.getBoundingClientRect().width;if(!width)return;
    const count=Math.max(2,Math.ceil(track.clientWidth/width)+1);
    while(motion.children.length<count){const copy=lap.cloneNode(true);copy.setAttribute('aria-hidden','true');motion.append(copy);copy.querySelectorAll('[data-dd-smooth]').forEach(smoothCorners);}
    const photo=lap.querySelector('.dd-track__photo').getBoundingClientRect(),origin=lap.getBoundingClientRect();
    const phase=Math.max(0,photo.left+photo.width/2-origin.left-track.clientWidth*.67);
    motion.style.setProperty('--track-duration',`${width/36}s`);
    motion.style.setProperty('--track-distance',`${-width}px`);
    motion.style.animationDelay=`${-phase/36}s`;
  };
  new ResizeObserver(measure).observe(lap);new ResizeObserver(measure).observe(track);
  new MutationObserver(measure).observe(document.documentElement,{attributes:true,attributeFilter:['data-dd-marquees']});
  document.fonts.ready.then(measure);measure();
}
