import {smoothCorners} from './smooth-corners.js';

const fine=matchMedia('(hover:hover) and (pointer:fine)');
const room=matchMedia('(min-width:960px)');
document.querySelectorAll('.dd-stay-photo').forEach(smoothCorners);
let current=null,timer=null,suppressed=null;
const hide=()=>{clearTimeout(timer);if(current)current.photo.hidden=true;current=null;};
const scheduleHide=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(current&&!current.photo.matches(':hover')&&!current.link.matches(':hover,:focus-visible'))hide();},120);};
for(const link of document.querySelectorAll('[data-dd-hotel]')){
  const photo=document.querySelector(`[data-dd-hotel-photo="${link.dataset.ddHotel}"]`);
  if(!photo)continue;
  smoothCorners(photo.querySelector('.dd-hotel-preview__frame'));
  const show=()=>{
    clearTimeout(timer);
    if(!room.matches||suppressed===link)return;
    if(current?.link!==link)hide();
    photo.hidden=false;current={link,photo};
    const anchor=link.getBoundingClientRect(),bounds=photo.getBoundingClientRect();
    const list=link.closest('.dd-stays');
    // Text owns the preview's position, not the unused width of the linked row.
    const edges=[...list.querySelectorAll('.dd-stay-name,.dd-stay-kind')].flatMap(label=>{
      const range=document.createRange();range.selectNodeContents(label);
      return [...range.getClientRects()].map(rect=>rect.right);
    });
    const right=Math.max(anchor.left,...edges)+20;
    const left=right+bounds.width<=innerWidth-20?right:anchor.left-bounds.width-20;
    if(left<20){hide();return;}
    const floor=Math.max(20,list.getBoundingClientRect().top);
    const ceiling=innerHeight-bounds.height-20;
    // A preview belongs beside the stays, below their introduction. If that
    // area cannot fit the full frame, the linked thumbnail remains available.
    if(floor>ceiling){hide();return;}
    const top=Math.max(floor,Math.min(ceiling,anchor.top+anchor.height/2-bounds.height/2));
    photo.style.left=`${left}px`;photo.style.top=`${top}px`;
  };
  link.addEventListener('pointerenter',()=>{suppressed=null;if(fine.matches)show();});
  link.addEventListener('pointerleave',scheduleHide);
  link.addEventListener('focus',()=>{suppressed=null;show();});
  link.addEventListener('blur',scheduleHide);
  photo.addEventListener('pointerenter',()=>clearTimeout(timer));
  photo.addEventListener('pointerleave',scheduleHide);
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current){suppressed=current.link;hide();}});
document.addEventListener('scroll',hide,{passive:true,capture:true});
window.addEventListener('resize',hide,{passive:true});
room.addEventListener('change',hide);fine.addEventListener('change',hide);
