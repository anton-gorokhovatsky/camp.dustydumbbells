import { smoothCorners } from './smooth-corners.js';
import { enhanceAction } from './action-wordmark.js';

document.querySelectorAll('.dd-join-link,button.t-submit').forEach(enhanceAction);

// Every owned rounded surface uses the same contour; actual circles stay circles.
for (const surface of document.querySelectorAll('.t-submit,.dd-map-intro button,.dd-skip-link,.dd-join-link')) {
  surface.dataset.ddSmooth=surface.matches('.dd-skip-link')?'glass':'paint';
  smoothCorners(surface);
}

/** Nonmodal navigation: the page and its reading position remain available. */
const navigation = document.querySelector('#nav1017771976');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let closeMenu = () => {};
const controls = root => [...root.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')]
  .filter(el => !el.disabled && !el.closest('[hidden],[inert]') && el.getBoundingClientRect().height && getComputedStyle(el).visibility !== 'hidden');

if (navigation) {
  const toggle = navigation.querySelector('.t-menu-burger');
  const panel = navigation.querySelector('.t-menu-popover__burgermenu__sidebar');
  if (document.querySelector('[data-dd-menu-clarity]')) {
    panel.querySelectorAll('a.t-menu__link-item').forEach(link => {
      link.dataset.ddSmooth='paint';
      smoothCorners(link);
    });
  }
  const movieTools = document.querySelector('.dd-cover-tools');
  navigation.querySelector('.t-menu-popover__overlay')?.remove();
  document.body.classList.remove('t1362__body_menushowed');
  panel.id = 'dd-menu-panel';
  panel.setAttribute('role','navigation'); panel.setAttribute('aria-label','Разделы сайта');
  toggle.setAttribute('aria-controls',panel.id);
  const updateMediaAvailability = () => {
    if (!movieTools) return;
    const menu=panel.getBoundingClientRect(), tools=movieTools.getBoundingClientRect();
    const overlaps=toggle.getAttribute('aria-expanded')==='true' && menu.left<tools.right && menu.right>tools.left && menu.top<tools.bottom && menu.bottom>tools.top;
    if(overlaps) {
      if(movieTools.contains(document.activeElement))toggle.focus({preventScroll:true});
      movieTools.dataset.menuOccluded='true';
    } else delete movieTools.dataset.menuOccluded;
  };
  let layersScheduled=false;
  const scheduleLayers=()=>{if(!layersScheduled){layersScheduled=true;requestAnimationFrame(()=>{layersScheduled=false;updateMediaAvailability();});}};
  window.addEventListener('scroll',scheduleLayers,{passive:true});

  const preview = document.createElement('figure'); preview.className = 'dd-menu-preview';
  preview.setAttribute('aria-hidden','true'); preview.dataset.ddSmooth = 'photo';
  const picture = document.createElement('img'); picture.alt = ''; picture.decoding = 'async'; preview.append(picture); panel.append(preview);
  const archive = id => {const image=document.querySelector(`#rec${id} .t1148__img`);return image?.getAttribute('data-dd-photo-source')||image?.getAttribute('data-img-zoom-url');};
  const scenes = {
    '#rec1016322141': archive('1016322141'),
    '#rec2078762951': archive('2080000001'),
    '#rec1017020466': new URL('{{BASE}}media/menu-sea.webp',location.origin).href,
    '#rec2078794451': new URL('{{BASE}}media/menu-stay.webp',location.origin).href,
  };
  let previewLink = null;
  const roomForPreview = () => {
    panel.dataset.previewRoom = String(panel.getBoundingClientRect().left >= 204 && matchMedia('(hover: hover)').matches);
  };
  const positionPreview = () => {
    if (!previewLink) return;
    const bounds = panel.getBoundingClientRect(), target = previewLink.getBoundingClientRect();
    preview.style.top = Math.max(12-bounds.top,Math.min(target.top-bounds.top-12,innerHeight-bounds.top-preview.offsetHeight-12))+'px';
  };
  picture.addEventListener('load', () => {
    const ratio = picture.naturalWidth / picture.naturalHeight;
    const width = Math.min(180,260*ratio);
    preview.style.width = width+'px'; preview.style.height = width/ratio+'px';
    positionPreview(); preview.classList.add('dd-menu-preview_ready');
  });
  const showPreview = (link, keyboard) => {
    if (!link || !scenes[link.hash]) return;
    panel.dataset.input = keyboard ? 'keyboard' : 'pointer';
    toggle.dataset.input = keyboard ? 'keyboard' : 'pointer';
    previewLink = link; roomForPreview();
    if(panel.dataset.previewRoom!=='true'){delete panel.dataset.preview;previewLink=null;return;}
    const url = new URL(scenes[link.hash],location.href).href;
    if (picture.src !== url) { preview.classList.remove('dd-menu-preview_ready'); picture.src = url; }
    panel.dataset.preview = 'show'; positionPreview();
  };
  panel.addEventListener('pointerover',event => {
    const link=event.target.closest('.t-menu__link-item');
    if(link)showPreview(link,false); else if(event.target.closest('a,button'))delete panel.dataset.preview;
  });
  panel.addEventListener('focusin',event => {
    const link=event.target.closest('.t-menu__link-item');
    if(link)showPreview(link,true); else delete panel.dataset.preview;
  });
  panel.addEventListener('pointerleave',() => {
    const link=document.activeElement.closest('.t-menu__link-item');
    if(link&&panel.contains(link))showPreview(link,true); else delete panel.dataset.preview;
  });
  panel.querySelector('.t-menu-popover__container').addEventListener('scroll',positionPreview,{passive:true});
  window.addEventListener('resize',()=>{roomForPreview();positionPreview();updateMediaAvailability();},{passive:true});
  document.fonts.ready.then(()=>{roomForPreview();updateMediaAvailability();});
  for (const surface of [panel,document.querySelector('.dd-cover-tools')]) {
    if(surface) { surface.dataset.ddSmooth = 'glass'; smoothCorners(surface); }
  }
  smoothCorners(preview);

  function setOpen(open, returnFocus = false, keyboard = false) {
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open ? 'Закрыть меню' : 'Открыть меню');
    toggle.dataset.input = keyboard ? 'keyboard' : 'pointer';
    toggle.classList.toggle('t-menu-burger_open',open);
    panel.dataset.input = keyboard ? 'keyboard' : 'pointer';
    panel.classList.toggle('t-menu-popover__burgermenu_opened',open);
    panel.setAttribute('aria-hidden',String(!open)); panel.inert = !open;
    updateMediaAvailability();
    if(open) {
      roomForPreview();
      if(keyboard)controls(panel)[0]?.focus({preventScroll:true});
    } else {
      delete panel.dataset.preview; previewLink = null;
      if(returnFocus)toggle.focus({preventScroll:true});
    }
  }
  closeMenu = (restore = false) => {if(toggle.getAttribute('aria-expanded')==='true')setOpen(false,restore,panel.dataset.input==='keyboard');};
  setOpen(false);
  toggle.addEventListener('click',event => setOpen(toggle.getAttribute('aria-expanded')!=='true',true,event.detail===0));
  document.addEventListener('pointerdown',event => {if(!navigation.contains(event.target))closeMenu();});
  document.addEventListener('focusin',event => {if(event.target!==document.body&&!navigation.contains(event.target))closeMenu();});
  // Leave the floating disclosure at the visible reading context, rather than
  // following its early source position back to the off-screen movie controls.
  const resumeReading = () => {
    closeMenu();
    const visible = element => {
      const r=element.getBoundingClientRect();
      return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth
        && !element.disabled&&!element.closest('[hidden],[inert]')&&getComputedStyle(element).visibility!=='hidden';
    };
    const roots=[document.querySelector('#dd-main'),document.querySelector('#t-footer')].filter(Boolean);
    const candidates=roots.flatMap(root=>[...root.querySelectorAll('h1,h2,h3,button,a[href],input,select,textarea,img[role="button"]')]).filter(visible);
    const fallback=roots.flatMap(root=>[...root.querySelectorAll('p,.t-title,.t-text')]).find(visible);
    const fullyVisible=element=>{const r=element.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;};
    const target=candidates.find(element=>/^H[123]$/.test(element.tagName)&&fullyVisible(element))||candidates.find(fullyVisible)||candidates[0]||fallback;
    if(target){if(!target.matches('a[href],button,input,select,textarea,[tabindex]'))target.tabIndex=-1;target.classList.add('dd-navigation-return');target.focus({preventScroll:true});}
  };
  navigation.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||toggle.getAttribute('aria-expanded')!=='true')return;
    const list=controls(panel),active=document.activeElement;
    if(!event.shiftKey&&active===list.at(-1)||event.shiftKey&&active===toggle){event.preventDefault();resumeReading();}
    else if(event.shiftKey&&active===list[0]){event.preventDefault();toggle.focus({preventScroll:true});}
    else if(!event.shiftKey&&active===toggle){event.preventDefault();list[0]?.focus({preventScroll:true});}
  });
  document.addEventListener('keydown',event => {
    if(event.key==='Escape'&&!event.defaultPrevented&&toggle.getAttribute('aria-expanded')==='true') {
      event.preventDefault(); setOpen(false,navigation.contains(document.activeElement),true);
    }
  });
  const record = navigation.closest('.t-rec');
  const desktopMenu = document.querySelector('#nav1016601036');
  const desktop = matchMedia('(min-width: 981px)');
  if(record && desktopMenu) {
    // A breakpoint may hide the focused control before the resize frame runs.
    // Keep its navigation context until focus deliberately moves elsewhere.
    let navigationFocus = null;
    document.addEventListener('focusin',event=>{
      if(event.target===document.body)return;
      navigationFocus = record.contains(event.target) || desktopMenu.contains(event.target) ? event.target : null;
    });
    let scheduled=false;
    const update=()=>{
      scheduled=false;
      const show=desktop.matches&&desktopMenu.getBoundingClientRect().bottom<=0;
      const active=document.activeElement;
      const focused=record.contains(active)||desktopMenu.contains(active) ? active : active===document.body ? navigationFocus : null;
      record.classList.toggle('dd-nav-scrolled',show);
      if(desktop.matches&&!show) {
        const transfer=focused&&record.contains(focused);
        const hash=focused?.closest('a[href]')?.hash;
        closeMenu();
        if(transfer) {
          const destination=controls(desktopMenu).find(el=>hash&&el.hash===hash)||controls(desktopMenu)[0];
          destination?.focus({preventScroll:true});
        }
      } else if(!desktop.matches&&focused&&desktopMenu.contains(focused)) {
        toggle.focus({preventScroll:true});
      }
    };
    const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);desktop.addEventListener('change',schedule);
    // The desktop header can acquire its final size after the breakpoint frame
    // (font/layout completion). Transfer focus using its rendered geometry.
    new ResizeObserver(schedule).observe(desktopMenu);
    document.fonts.ready.then(schedule);update();
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
