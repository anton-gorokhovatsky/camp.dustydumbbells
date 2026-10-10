// One clock per join: its two clipped halves always pause and resume together.
// Keep the drawing available without JavaScript; only visible currents move.
export function setupSeaMotion(reduced) {
  const joins = new Map();
  const visible = new Set();
  for (const half of document.querySelectorAll('[data-current]')) {
    const name = half.dataset.current;
    if (!joins.has(name)) joins.set(name, []);
    joins.get(name).push(half);
  }
  const update = () => {
    const enabled = !reduced.matches && !document.hidden && !document.querySelector('dialog[open]');
    for (const halves of joins.values()) {
      const play = enabled && halves.some(half => visible.has(half)) ? 'running' : 'paused';
      for (const half of halves) half.style.setProperty('--current-play', play);
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    update();
  });
  for (const halves of joins.values()) for (const half of halves) observer.observe(half);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  // Opening an image pauses decorative movement until the reader closes it.
  for (const dialog of document.querySelectorAll('dialog')) {
    new MutationObserver(update).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }
}
