/** Owned disclosure and anchor navigation; the selected menu markup/material stay. */
const navigation = document.querySelector('#nav1017771976');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let closeMenu = () => {};
const controls = root => [...root.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')]
  .filter(el => !el.disabled && !el.closest('[hidden],[inert]') && el.getBoundingClientRect().height && getComputedStyle(el).visibility !== 'hidden');

if (navigation) {
  const toggle = navigation.querySelector('.t-menu-burger');
  const panel = navigation.querySelector('.t-menu-popover__burgermenu__sidebar');
  const overlay = navigation.querySelector('.t-menu-popover__overlay');
  const isolated = new Map();
  panel.id = 'dd-menu-panel';
  panel.setAttribute('role','navigation'); panel.setAttribute('aria-label','Разделы сайта');
  toggle.setAttribute('aria-controls',panel.id);
  function setOpen(open, returnFocus = false) {
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню');
    toggle.classList.toggle('t-menu-burger_open',open);
    panel.classList.toggle('t-menu-popover__burgermenu_opened',open);
    overlay.classList.toggle('t-menu-popover__burgermenu_opened',open);
    panel.setAttribute('aria-hidden',String(!open)); panel.inert = !open;
    document.body.classList.toggle('t1362__body_menushowed',open);
    if (open) {
      navigation.setAttribute('role','dialog'); navigation.setAttribute('aria-modal','true'); navigation.setAttribute('aria-label','Меню кэмпа');
      for (const el of document.querySelectorAll('#dd-main,#t-footer,#rec1016601036')) { isolated.set(el,el.inert); el.inert = true; }
      controls(panel)[0]?.focus({preventScroll:true});
    } else {
      navigation.removeAttribute('role'); navigation.removeAttribute('aria-modal'); navigation.removeAttribute('aria-label');
      for (const [el,inert] of isolated) el.inert = inert;
      isolated.clear();
      if (returnFocus) toggle.focus({preventScroll:true});
    }
  }
  closeMenu = (restore = false) => { if (toggle.getAttribute('aria-expanded') === 'true') setOpen(false,restore); };
  setOpen(false);
  toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded') !== 'true',true));
  overlay.addEventListener('click',()=>closeMenu(true));
  navigation.addEventListener('keydown',event=>{
    if(toggle.getAttribute('aria-expanded') !== 'true') return;
    if(event.key === 'Escape') { event.preventDefault();event.stopPropagation();closeMenu(true); }
    if(event.key === 'Tab') {
      const list=[toggle,...controls(panel)],index=list.indexOf(document.activeElement);
      if(event.shiftKey && index<=0) {event.preventDefault();list.at(-1)?.focus();}
      else if(!event.shiftKey && index===list.length-1) {event.preventDefault();toggle.focus();}
    }
  });
  const record = navigation.closest('.t-rec');
  const desktopMenu = document.querySelector('#nav1016601036');
  const desktop = matchMedia('(min-width: 981px)');
  if(record && desktopMenu) {
    let scheduled=false;
    const update=()=>{scheduled=false;const show=desktop.matches&&desktopMenu.getBoundingClientRect().bottom<=0;record.classList.toggle('dd-nav-scrolled',show);if(desktop.matches&&!show)closeMenu();};
    const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);desktop.addEventListener('change',schedule);update();
  }
}

function anchorTarget(hash) {
  if (hash === '#form') return document.getElementById('dd-heading-form');
  let id; try {id=decodeURIComponent(hash.slice(1));} catch {return null;}
  const el=document.getElementById(id) || [...document.querySelectorAll('a[name]')].find(a=>a.name===id);
  return el?.querySelector('h1,h2,h3') || el;
}
function goTo(hash, smooth = false) {
  const target=anchorTarget(hash);
  if(!target)return;
  closeMenu();
  if(!target.hasAttribute('tabindex'))target.tabIndex=-1;
  target.focus({preventScroll:true});
  target.scrollIntoView({behavior:smooth&&!reduce.matches?'smooth':'instant',block:'start'});
}
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href]');
  if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||url.pathname!==location.pathname||!url.hash||!anchorTarget(url.hash))return;
  event.preventDefault();
  if(location.hash!==url.hash)history.pushState(null,'',url.hash);
  goTo(url.hash,true);
});
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('popstate',()=>{if(location.hash)goTo(location.hash);else{closeMenu();window.scrollTo({top:0,behavior:'instant'});document.getElementById('dd-title')?.focus({preventScroll:true});}});
window.addEventListener('hashchange',()=>goTo(location.hash));
// Native fragment scrolling can run after an early fonts.ready callback and
// take both scroll position and focus back to the empty named anchor.
function restoreInitialAnchor() {
  const hash=location.hash;
  if(hash)document.fonts.ready.then(()=>requestAnimationFrame(()=>{
    if(location.hash===hash)goTo(hash);
  }));
}
if(document.readyState==='complete')restoreInitialAnchor();
else window.addEventListener('load',restoreInitialAnchor,{once:true});

let currentScheduled=false;
function updateCurrent() {
  currentScheduled=false;
  const line=Math.min(240,Math.max(96,innerHeight*.25));
  const current=[...document.querySelectorAll('#dd-main h2')].filter(el=>el.getBoundingClientRect().top<=line).at(-1);
  for(const link of document.querySelectorAll('#nav1017771976 a[href^="#"],#nav1016601036 a[href^="#"]')) {
    const selected=!!current&&anchorTarget(new URL(link.href).hash)===current;
    link.classList.toggle('t-active',selected);
    if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
  }
}
const scheduleCurrent=()=>{if(!currentScheduled){currentScheduled=true;requestAnimationFrame(updateCurrent);}};
window.addEventListener('scroll',scheduleCurrent,{passive:true});
window.addEventListener('resize',scheduleCurrent);
updateCurrent();
