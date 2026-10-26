import {smoothCorners} from './smooth-corners.js';

// Equal linear speed, independent of phrase length, photo width and viewport.
for(const track of document.querySelectorAll('.dd-track')){
  const motion=track.querySelector('.dd-track__motion');
  const lap=motion?.firstElementChild;
  if(!lap)continue;
  const measure=()=>{
    const width=lap.getBoundingClientRect().width;
    if(!width)return;
    const copies=Math.max(2,Math.ceil(track.clientWidth/width)+1);
    while(motion.children.length<copies){
      const clone=lap.cloneNode(true);clone.setAttribute('aria-hidden','true');
      clone.querySelectorAll('a').forEach(link=>link.tabIndex=-1);
      motion.append(clone);
      clone.querySelectorAll('[data-dd-smooth="photo"]').forEach(smoothCorners);
    }
    motion.style.setProperty('--track-duration',`${width/64}s`);
    motion.style.setProperty('--track-distance',`${-width}px`);
  };
  const observer=new ResizeObserver(measure);observer.observe(lap);observer.observe(track);
  document.fonts.ready.then(measure);
  measure();
}
