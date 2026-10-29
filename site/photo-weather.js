import {smoothRectPath} from './smooth-corners.js';
import {photoWeather} from './photo-model.js';

// Photo frames retain their layout boxes; only their paint drifts. The same
// native contour uses untransformed dimensions, including during the zoom.
export function mountPhotoWeather(weather) {
  const root=document.documentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
  const frames=new Map(),contours=new WeakSet();
  let model=photoWeather(weather);
  let modelKey='';
  function contour(element) {
    if(contours.has(element))return;
    contours.add(element);
    const update=()=>{
      const s=getComputedStyle(element),w=Number.parseFloat(s.width)||element.offsetWidth,h=Number.parseFloat(s.height)||element.offsetHeight;
      if(!w||!h)return;
      const radius=Number.parseFloat(s.borderTopLeftRadius)||24;
      element.style.setProperty('--dd-smooth-path',`path("${smoothRectPath(w,h,radius)}")`);
      element.dataset.ddSmooth='photo'; element.classList.add('dd-smooth-ready');
    };
    new ResizeObserver(update).observe(element); document.fonts.ready.then(update); update();
  }
  const active=state=>!document.hidden&&!document.body.classList.contains('t-zoomer__show')&&!state.element.closest('[hidden],[inert]')&&!reduce.matches&&root.dataset.ddMarquees!=='paused'&&state.visible&&!state.focus&&!state.hover;
  const sync=state=>{for(const animation of state.animations){if(active(state))animation.play();else animation.pause();}};
  function motion(state,index) {
    state.animations.forEach(animation=>animation.cancel()); state.animations=[];
    const {x,y,tilt,sway,period}=model;
    // The still state keeps the wind's inclination and the weather material.
    // A pause stops time; it does not straighten or empty the composition.
    state.element.style.transform=`translate3d(${x}px,${y}px,0) rotate(${tilt}deg)`;
    if(reduce.matches)return;
    if(sway){
      const keyframes=[
        {transform:`translate3d(${x-sway}px,${y-sway*.3}px,0) rotate(${tilt-sway*.15}deg)`},
        {transform:`translate3d(${x+sway}px,${y+sway*.3}px,0) rotate(${tilt+sway*.15}deg)`},
        {transform:`translate3d(${x-sway}px,${y-sway*.3}px,0) rotate(${tilt-sway*.15}deg)`},
      ];
      const drift=state.element.animate(keyframes,{duration:period,iterations:Infinity,easing:'cubic-bezier(.77,0,.175,1)'});
      drift.currentTime=(index%5)*period/5; state.animations.push(drift);
    }
    sync(state);
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){const state=frames.get(entry.target);if(state){state.visible=entry.isIntersecting;sync(state);}}},{rootMargin:'80px'});
  function add(element) {
    if(frames.has(element))return;
    element.classList.add('dd-photo-surface'); contour(element);
    let layer=element.querySelector(':scope > .dd-photo-atmosphere');
    if(!layer){layer=document.createElement('span');layer.className='dd-photo-atmosphere';layer.setAttribute('aria-hidden','true');element.append(layer);}
    const state={element,visible:false,focus:false,hover:false,animations:[]};frames.set(element,state);observer.observe(element);
    if(element.matches('.dd-menu-preview'))new MutationObserver(()=>sync(state)).observe(element.parentElement,{attributes:true,attributeFilter:['inert','data-preview','data-preview-room']});
    element.addEventListener('focusin',()=>{state.focus=true;sync(state);});
    element.addEventListener('focusout',()=>{state.focus=false;sync(state);});
    const hoverSurface=element.closest('.dd-track')||element;
    hoverSurface.addEventListener('pointerenter',()=>{if(fine.matches){state.hover=true;sync(state);}});
    hoverSurface.addEventListener('pointerleave',()=>{state.hover=false;sync(state);});
    motion(state,frames.size-1);
  }
  const selector='.t1148__img-wrapper,.dd-form-memory:not(.dd-form-people),.dd-form-people__photo,.dd-menu-preview,.dd-track__photo';
  function collect(node) {
    if(node.nodeType!==1)return;
    if(node.matches(selector))add(node);
    node.querySelectorAll(selector).forEach(add);
    // Full-size viewing shares the contour while staying still and untinted.
    const full='.t-carousel__zoomer__img,.t_zoomer__animated-image';
    const images=[...node.querySelectorAll(full)];if(node.matches(full))images.push(node);
    for(const image of images){image.classList.add('dd-full-photo');contour(image);}
  }
  collect(document.body);
  new MutationObserver(records=>{for(const record of records)record.addedNodes.forEach(collect);}).observe(document.body,{childList:true,subtree:true});
  new MutationObserver(()=>frames.forEach(sync)).observe(root,{attributes:true,attributeFilter:['data-dd-marquees']});
  new MutationObserver(()=>frames.forEach(sync)).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(()=>frames.forEach(sync)).observe(document.body,{subtree:true,attributes:true,attributeFilter:['inert']});
  document.addEventListener('visibilitychange',()=>frames.forEach(sync));
  reduce.addEventListener('change',()=>{[...frames.values()].forEach(motion);});
  const update=weather=>{
    const next=photoWeather(weather),key=JSON.stringify(next);
    if(key===modelKey)return;
    modelKey=key;model=next;
    root.style.setProperty('--dd-photo-saturation',model.saturation);
    root.style.setProperty('--dd-photo-brightness',model.brightness);
    root.style.setProperty('--dd-photo-contrast',model.contrast);
    root.style.setProperty('--dd-photo-blur',`${model.blur}px`);
    [...frames.values()].forEach(motion);
  };
  update(weather);return update;
}
