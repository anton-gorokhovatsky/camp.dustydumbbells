const section = document.querySelector('#program[data-calendar-style="panorama"]');
if (section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  for (const week of section.querySelectorAll('.program-week')) {
    const strip = week.querySelector('.week-days');
    const days = [...strip.querySelectorAll('.program-day')];
    const controls = week.querySelector('.panorama-controls');
    const previous = controls.querySelector('[data-day-step="-1"]');
    const next = controls.querySelector('[data-day-step="1"]');
    const status = controls.querySelector('.panorama-position');
    let current = 0;
    function update() {
      const origin = strip.getBoundingClientRect().left;
      current = days.reduce((nearest, day, index) => Math.abs(day.getBoundingClientRect().left - origin) < Math.abs(days[nearest].getBoundingClientRect().left - origin) ? index : nearest, 0);
      previous.disabled = current === 0;
      next.disabled = current === days.length - 1;
      const label = `${Number(days[current].dataset.date.slice(-2))} октября · ${current + 1} / ${days.length}`;
      if (status.textContent !== label) status.textContent = label;
    }
    function moveTo(index) {
      const target = days[Math.max(0, Math.min(days.length - 1, index))];
      const left = strip.scrollLeft + target.getBoundingClientRect().left - strip.getBoundingClientRect().left;
      strip.scrollTo({ left, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
    previous.addEventListener('click', () => moveTo(current - 1));
    next.addEventListener('click', () => moveTo(current + 1));
    strip.addEventListener('keydown', event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') moveTo(0);
      else if (event.key === 'End') moveTo(days.length - 1);
      else moveTo(current + (event.key === 'ArrowRight' ? 1 : -1));
    });
    strip.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    controls.hidden = false;
    update();
  }
}
