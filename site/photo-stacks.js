const root=document.documentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)');
for(const gallery of document.querySelectorAll('[data-dd-stack]')){
  const cards=[...gallery.querySelectorAll('.t1148__item')],controls=gallery.querySelector('.t1148__controls');
  const previous=controls.querySelector('button[aria-label="Предыдущий слайд"]'),next=controls.querySelector('button[aria-label="Следующий слайд"]');
  previous.setAttribute('aria-label','Предыдущая фотография');next.setAttribute('aria-label','Следующая фотография');
  previous.disabled=next.disabled=false;controls.hidden=false;
  const count=document.createElement('output');count.className='dd-stack-count';count.setAttribute('aria-live','polite');next.before(count);
  const exits=new Map();let index=0,wanted=0,epoch=0,layer=cards.length;
  const still=()=>reduce.matches||root.dataset.ddMarquees==='paused';
  function pose(card,i){
    const rank=(i-index+cards.length)%cards.length,exit=exits.get(card),out=exit?.phase==='out';
    card.style.transitionDuration=out?'160ms':exit?'140ms':'160ms';
    card.style.transform=out?`translate3d(${exit.direction*120}%, -2%, 0) rotate(${exit.direction*6}deg)`:`translate3d(${Math.min(rank,2)*7}px,${Math.min(rank,2)*5}px,0) rotate(${rank===0?0:rank%2?2:-2}deg)`;
    card.style.zIndex=String(out?exit.layer:cards.length-rank);card.style.visibility=exit||rank<3?'visible':'hidden';
    card.inert=rank!==0;card.setAttribute('aria-hidden',String(rank!==0));card.setAttribute('aria-current',String(rank===0));card.setAttribute('aria-label',`${i+1} из ${cards.length}`);
    const image=card.querySelector('img');image.tabIndex=rank===0?0:-1;
    image.setAttribute('aria-label',`Следующая фотография. ${i+1} из ${cards.length}. ${image.alt}`);
  }
  function render(){cards.forEach(pose);count.textContent=`${index+1} / ${cards.length}`;gallery.toggleAttribute('data-stack-moving',exits.size>0);}
  for(const card of cards)card.addEventListener('transitionend',event=>{
    if(event.target!==card||event.propertyName!=='transform')return;
    const exit=exits.get(card);if(!exit)return;
    if(exit.phase==='out'){
      // The full photograph now clears the deck. Its layer can change without
      // covering the next image; the return remains visible all the way back.
      exit.phase='return';pose(card,cards.indexOf(card));
    }else{exits.delete(card);pose(card,cards.indexOf(card));gallery.toggleAttribute('data-stack-moving',exits.size>0);}
  });
  function commit(step,instant){
    gallery.removeAttribute('aria-busy');
    const old=cards[index],focused=old.contains(document.activeElement);
    index=wanted;gallery.dataset.stackInput=instant?'keyboard':'pointer';
    if(instant)exits.clear();
    else{
      // Reversing or selecting an in-flight card retargets its actual pose.
      exits.delete(cards[index]);
      if(old!==cards[index])exits.set(old,{direction:step,layer:++layer,phase:'out'});
    }
    render();if(focused)cards[index].querySelector('img').focus({preventScroll:true});
  }
  async function turn(step,keyboard=false){
    wanted=(wanted+step+cards.length)%cards.length;const ticket=++epoch;
    gallery.removeAttribute('aria-busy');
    const image=cards[wanted].querySelector('img');image.loading='eager';
    if(!image.complete||!image.naturalWidth){
      gallery.setAttribute('aria-busy','true');
      try{await image.decode();}catch{if(ticket===epoch){wanted=index;count.textContent='Не удалось загрузить фотографию';}return;}
      finally{if(ticket===epoch)gallery.removeAttribute('aria-busy');}
    }
    if(ticket!==epoch)return;commit(step,keyboard||still());
  }
  previous.addEventListener('click',event=>{event.preventDefault();turn(-1,event.detail===0);});
  next.addEventListener('click',event=>{event.preventDefault();turn(1,event.detail===0);});
  gallery.addEventListener('click',event=>{if(!event.target.closest('.t1148__item[aria-current="true"] img'))return;event.preventDefault();event.stopImmediatePropagation();turn(1,event.detail===0);},true);
  gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();turn(event.key==='ArrowRight'?1:-1,true);}else if((event.key==='Enter'||event.key===' ')&&event.target.matches('img[role="button"]')){event.preventDefault();turn(1,true);}});
  new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))cards.forEach(card=>{card.querySelector('img').loading='eager';});},{rootMargin:'600px'}).observe(gallery);
  new MutationObserver(()=>{if(still()){epoch++;wanted=index;commit(1,true);}}).observe(root,{attributes:true,attributeFilter:['data-dd-marquees']});
  reduce.addEventListener('change',()=>{if(still()){epoch++;wanted=index;commit(1,true);}});
  render();
}
