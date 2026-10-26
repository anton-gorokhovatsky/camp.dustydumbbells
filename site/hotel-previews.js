import {smoothCorners} from './smooth-corners.js';

const fine=matchMedia('(hover:hover) and (pointer:fine)');
const room=matchMedia('(min-width:960px)');
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
    const right=anchor.right+24;
    const left=right+bounds.width<innerWidth-20?right:Math.max(20,anchor.left-bounds.width-24);
    const top=Math.max(20,Math.min(innerHeight-bounds.height-20,anchor.top-bounds.height*.35));
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
