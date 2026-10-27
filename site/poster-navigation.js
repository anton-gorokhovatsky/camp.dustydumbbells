import {smoothCorners} from './smooth-corners.js';

const nav=document.querySelector('[data-nav-treatment]');
if(nav){
  const wide=matchMedia('(min-width:981px)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
  const links=[...nav.querySelectorAll('.dd-nav-link')],picture=nav.querySelector('.dd-nav-image');
  nav.querySelectorAll('.dd-nav-window').forEach(smoothCorners);
  const hidden=()=>{if(picture)picture.hidden=true;delete nav.dataset.preview;links.forEach(link=>delete link.dataset.previewCurrent);};
  let ticket=0;
  async function show(link){
    if(!picture||!wide.matches)return;
    const current=++ticket,image=new Image();image.src=link.dataset.photo;
    try{await image.decode();}catch{return;}
    if(current!==ticket||!wide.matches)return;
    picture.querySelector('img').src=image.src;picture.hidden=false;
    nav.dataset.preview=link.dataset.scene;
    links.forEach(item=>item.toggleAttribute('data-preview-current',item===link));
  }
  if(picture){
    smoothCorners(picture);
    nav.addEventListener('pointerover',event=>{const link=event.target.closest('.dd-nav-link');if(link&&fine.matches)show(link);});
    nav.addEventListener('focusin',event=>{const link=event.target.closest('.dd-nav-link');if(link)show(link);});
    nav.addEventListener('pointerleave',()=>{const link=document.activeElement.closest('.dd-nav-link');if(link&&nav.contains(link))show(link);else{ticket++;hidden();}});
    nav.addEventListener('focusout',event=>{if(!nav.contains(event.relatedTarget)){ticket++;hidden();}});
  }
  let scheduled=false;
  function measure(){
    scheduled=false;
    if(!wide.matches){nav.removeAttribute('data-nav-wrap');document.documentElement.style.removeProperty('--dd-nav-clearance');ticket++;hidden();return;}
    nav.removeAttribute('data-nav-wrap');
    const frame=nav.getBoundingClientRect(),boxes=links.map(link=>link.getBoundingClientRect());
    const overflow=boxes.some(box=>box.left<frame.left-1||box.right>frame.right+1||box.height>frame.height+1);
    const collision=boxes.some((a,i)=>boxes.some((b,j)=>j>i&&a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1));
    if(overflow||collision)nav.dataset.navWrap='true';
    const settled=nav.getBoundingClientRect();
    document.documentElement.style.setProperty('--dd-nav-clearance',`${Math.max(0,settled.top+scrollY)+settled.height+32}px`);
  }
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(measure);}};
  new ResizeObserver(schedule).observe(document.documentElement);
  document.fonts.ready.then(schedule);wide.addEventListener('change',schedule);measure();
}
