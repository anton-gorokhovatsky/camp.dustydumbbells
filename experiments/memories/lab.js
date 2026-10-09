const section = document.querySelector('#memories[data-memory-style="film"]');
if (section) {
  const strip = section.querySelector('.memory-strip');
  const stops = [...strip.children];
  const controls = section.querySelector('.film-controls');
  const previous = controls.querySelector('[data-film-step="-1"]');
  const next = controls.querySelector('[data-film-step="1"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  function update() {
    const origin = strip.getBoundingClientRect().left;
    current = stops.reduce((nearest, item, index) => Math.abs(item.getBoundingClientRect().left - origin) < Math.abs(stops[nearest].getBoundingClientRect().left - origin) ? index : nearest, 0);
    previous.disabled = current === 0 || strip.scrollLeft < 2;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
  }
  function move(index) {
    const target = stops[Math.max(0, Math.min(stops.length - 1, index))];
    const left = strip.scrollLeft + target.getBoundingClientRect().left - strip.getBoundingClientRect().left;
    strip.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => move(current - 1));
  next.addEventListener('click', () => move(current + 1));
  strip.addEventListener('keydown', event => {
    if (event.target !== strip || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    move(event.key === 'Home' ? 0 : event.key === 'End' ? stops.length - 1 : current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  strip.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  controls.hidden = false;
  update();
}
