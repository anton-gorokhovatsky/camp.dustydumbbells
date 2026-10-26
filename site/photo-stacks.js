const reduce=matchMedia('(prefers-reduced-motion: reduce)');
for(const gallery of document.querySelectorAll('[data-dd-stack]')) {
  const cards=[...gallery.querySelectorAll('.t1148__item')];
  const controls=gallery.querySelector('.t1148__controls');
  const previous=controls?.querySelector('button[aria-label="Предыдущий слайд"]');
  const next=controls?.querySelector('button[aria-label="Следующий слайд"]');
  if(cards.length<2||!previous||!next)throw Error('The existing complete gallery and both controls are required.');
  let index=0,moving=null;
  controls.hidden=false;previous.disabled=false;next.disabled=false;
  previous.setAttribute('aria-label','Предыдущая фотография');next.setAttribute('aria-label','Следующая фотография');
  const count=document.createElement('output');count.className='dd-stack-count';count.setAttribute('aria-live','polite');
  next.before(count);
  const render=()=>{
    cards.forEach((card,i)=>{
      const rank=(i-index+cards.length)%cards.length;
      card.style.setProperty('--stack-depth',Math.min(rank,2));
      card.style.setProperty('--stack-angle',rank===0?'0deg':rank%2?'2deg':'-2deg');
      card.style.zIndex=String(cards.length-rank);
      card.style.visibility=rank<3?'visible':'hidden';
      card.inert=rank!==0;card.setAttribute('aria-hidden',String(rank!==0));card.setAttribute('aria-current',String(rank===0));
      const image=card.querySelector('img');image.tabIndex=rank===0?0:-1;
      image.classList.remove('t-zoomable');
      image.removeAttribute('data-zoomable');image.removeAttribute('data-img-zoom-url');
      image.setAttribute('aria-label',`Следующая фотография. ${i+1} из ${cards.length}. ${image.alt}`);
      // Rear cards occupy this gallery's viewport, so native lazy loading also
      // prepares the next turn without fetching every distant stack at startup.
      image.loading='lazy';
    });
    count.textContent=`${index+1} / ${cards.length}`;
  };
  function turn(step,keyboard=false) {
    moving?.cancel();moving=null;
    delete gallery.dataset.stackMoving;
    gallery.dataset.stackInput=keyboard?'keyboard':'pointer';
    const old=cards[index],hasPhotoFocus=old.contains(document.activeElement);index=(index+step+cards.length)%cards.length;render();
    if(hasPhotoFocus)cards[index].querySelector('img').focus({preventScroll:true});
    if(keyboard||reduce.matches||document.documentElement.dataset.ddMarquees==='paused')return;
    const target=getComputedStyle(old).transform;
    old.style.zIndex=String(cards.length+1);old.style.visibility='visible';
    const animation=old.animate([{transform:'translate3d(0,0,0) rotate(0deg)'},{transform:`translate3d(${step*22}%, -2%, 0) rotate(${step*5}deg)`,offset:.55},{transform:target}],{duration:280,easing:'cubic-bezier(.23,1,.32,1)'});
    moving=animation;
    gallery.dataset.stackMoving='true';
    animation.finished.catch(()=>{}).finally(()=>{if(moving===animation){moving=null;delete gallery.dataset.stackMoving;render();}});
  }
  previous.addEventListener('click',event=>{event.preventDefault();turn(-1,event.detail===0);});
  next.addEventListener('click',event=>{event.preventDefault();turn(1,event.detail===0);});
  gallery.addEventListener('click',event=>{
    if(!event.target.closest('.t1148__item[aria-current="true"] img'))return;
    event.preventDefault();event.stopImmediatePropagation();turn(1,event.detail===0);
  },true);
  gallery.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();turn(event.key==='ArrowRight'?1:-1,true);}
    else if((event.key==='Enter'||event.key===' ')&&event.target.matches('img[role="button"]')){event.preventDefault();event.target.click();}
  });
  render();
}
