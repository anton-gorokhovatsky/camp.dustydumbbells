const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const control = document.querySelector('[data-dd-marquee-toggle]');
let preference = null;
try { const value = localStorage.getItem('dd-marquee-pause'); if (value === 'yes' || value === 'no') preference = value === 'yes'; } catch {}
function syncMotion() {
  const paused = preference ?? reduce.matches;
  root.dataset.ddMarquees = paused ? 'paused' : 'running';
  for(const signature of document.querySelectorAll('ag-signature'))signature.toggleAttribute('paused',paused);
  if (control) {
    control.hidden = false;
    control.querySelector('span').textContent=paused?'Включить движение':'Отключить движение';
    control.querySelector('path').setAttribute('d',paused?'M0 0 12 8 0 16Z':'M0 0H4V16H0ZM8 0H12V16H8Z');
  }
}
control?.addEventListener('click', () => {
  preference = !(preference ?? reduce.matches);
  try { localStorage.setItem('dd-marquee-pause', preference ? 'yes' : 'no'); } catch {}
  syncMotion();
});
reduce.addEventListener('change', syncMotion);
syncMotion();

for (const strip of document.querySelectorAll('.t1003')) {
  const deduplicate = () => {
    const items = [...strip.querySelectorAll('.t1003__item')];
    items.forEach((item, index) => {
      if (index) item.setAttribute('aria-hidden', 'true'); else item.removeAttribute('aria-hidden');
      item.querySelectorAll('a').forEach(a => { if (index) a.tabIndex = -1; else a.removeAttribute('tabindex'); });
    });
  };
  deduplicate();
  new MutationObserver(deduplicate).observe(strip, {childList: true, subtree: true});
}

// The introduction now has one stable place after the film, including without JS.

// A photographic encounter needs scrolling controls only while it has an unseen part.
for (const gallery of document.querySelectorAll('.t1148:not([data-dd-stack])')) {
  const slider = gallery.querySelector('.t1148__slider');
  const controls = gallery.querySelector('.t1148__controls');
  if (!slider || !controls) continue;
  const buttons = [...controls.querySelectorAll('button')];
  const items = [...slider.querySelectorAll('.t1148__item')];
  const footer = gallery.querySelector('.dd-gallery-footer');
  let controlFocus = null;
  document.addEventListener('focusin', event => {
    if (event.target === document.body) return;
    controlFocus = controls.contains(event.target) ? event.target : null;
  });
  let scheduled = false;
  const sync = () => {
    scheduled = false;
    const viewport = slider.getBoundingClientRect();
    const fits = items.length > 0 && items.every(item => {
      const bounds = item.getBoundingClientRect();
      return bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1;
    });
    const active = document.activeElement;
    const losesControl = fits || !controls.getClientRects().length || getComputedStyle(controls).visibility === 'hidden';
    if (losesControl && (controls.contains(active) || active === document.body && controlFocus)) {
      const photo = slider.querySelector('[aria-current="true"] img[role="button"]') || slider.querySelector('img[role="button"]');
      photo?.focus({preventScroll: true});
    }
    buttons.forEach(button => { button.disabled = fits; });
    controls.hidden = fits;
    if (footer) footer.hidden = fits && !footer.querySelector('.dd-archive-caption');
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(sync); } };
  const observer = new ResizeObserver(schedule);
  observer.observe(slider);
  items.forEach(item => observer.observe(item));
  slider.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule, {passive: true});
  document.fonts.ready.then(schedule);
  schedule();
}
