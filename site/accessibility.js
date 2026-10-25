const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const control = document.querySelector('[data-dd-marquee-toggle]');
let preference = null;
try { const value = localStorage.getItem('dd-marquee-pause'); if (value === 'yes' || value === 'no') preference = value === 'yes'; } catch {}
function syncMotion() {
  const paused = preference ?? reduce.matches;
  root.dataset.ddMarquees = paused ? 'paused' : 'running';
  if (control) control.textContent = paused ? 'Продолжить бегущие строки' : 'Остановить бегущие строки';
}
control?.addEventListener('click', () => {
  preference = root.dataset.ddMarquees !== 'paused';
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
