const panel=document.querySelector('#nav1017771976 .t-menu-popover__burgermenu__sidebar');
const fine=matchMedia('(hover:hover) and (pointer:fine)');
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const data=document.querySelector('#dd-menu-scenes');
if(panel&&data){
  const scenes=JSON.parse(data.textContent),frames=[...panel.querySelectorAll('[data-menu-slot]')];
  const cache=new Map();let revision=0,desired='',shown='about';
  const still=()=>reduce.matches||document.documentElement.dataset.ddMarquees==='paused';
  const ready=url=>{
    if(!cache.has(url)){
      const image=new Image();image.decoding='async';image.src=url;
      const promise=image.decode().then(()=>url).catch(error=>{cache.delete(url);throw error;});
      cache.set(url,promise);
    }
    return cache.get(url);
  };
  function warm(){for(const scene of Object.values(scenes))for(const photo of Object.values(scene))ready(photo.src).catch(()=>{});}
  const current=()=>panel.querySelector('[data-menu-scene][aria-current="location"]')?.dataset.menuScene||'about';
  async function show(key,keyboard=false){
    if(!scenes[key]||desired===key&&shown===key)return;
    desired=key;const ticket=++revision;
    try{
      await Promise.all(Object.values(scenes[key]).map(photo=>ready(photo.src)));
      if(ticket!==revision||panel.inert)return;
      const changes=[];
      for(const frame of frames){
        const photo=scenes[key][frame.dataset.menuSlot];
        const front=frame.dataset.front||'a',back=front==='a'?'b':'a';
        const incoming=frame.querySelector(`[data-layer="${back}"]`);
        incoming.src=photo.src;incoming.style.objectPosition=photo.position||'50% 50%';
        frame.toggleAttribute('data-static',keyboard||still());
        changes.push({frame,incoming,back});
      }
      await Promise.all(changes.map(({incoming})=>incoming.decode()));
      if(ticket!==revision||panel.inert)return;
      for(const {frame,back} of changes)frame.dataset.front=back;
      panel.dataset.scene=key;shown=key;
    }catch{/* A missing decorative image leaves both the links and last frame intact. */}
  }
  panel.addEventListener('pointerover',event=>{
    if(!fine.matches)return;
    const link=event.target.closest('[data-menu-scene]');
    if(link)show(link.dataset.menuScene);
  });
  panel.addEventListener('focusin',event=>{
    const link=event.target.closest('[data-menu-scene]');
    if(link)show(link.dataset.menuScene,true);
  });
  panel.addEventListener('pointerleave',()=>{
    const focused=document.activeElement.closest('[data-menu-scene]');
    show(focused&&panel.contains(focused)?focused.dataset.menuScene:current(),!!focused);
  });
  const toggle=document.querySelector('#nav1017771976 .t-menu-burger');
  toggle?.addEventListener('pointerenter',()=>{if(fine.matches)warm();},{once:true});
  toggle?.addEventListener('focus',warm,{once:true});
  new MutationObserver(()=>{
    if(panel.inert){revision++;desired='';}
    else{warm();show(current(),panel.dataset.input==='keyboard');}
  }).observe(panel,{attributes:true,attributeFilter:['inert']});
}
