// Authored colour flows inspired by Aura's diffusion and Vein's curved fields.
// Both halves render the same drawing, so a section boundary cannot cut it.
const reading = 'var(--environment-reading,#365a66)';
const fields = {
  weather: `color-mix(in srgb,#fff 68%,${reading} 32%)`,
  about: reading,
  memories: 'var(--environment-zine,#c7f2b7)',
  program: 'var(--environment-poster,#fc754f)',
  travel: 'var(--environment-ticket,#386b81)',
  guide: 'var(--environment-guide,#edf3f3)',
  closing: 'var(--environment-reading,#234858)',
};
const joins = [
  ['weather','about'], ['about','memories'], ['memories','program'],
  ['program','travel'], ['travel','guide'], ['guide','closing'],
];

export function renderSeaCurrent(join, half) {
  const index = joins.findIndex(pair => pair.join('_').toUpperCase() === join);
  if (index < 0 || !['IN','OUT'].includes(half)) throw new Error(`Unknown sea current: ${join} ${half}`);
  const [from,to] = joins[index];
  const id = `sea-${from}-${to}-${half.toLowerCase()}`;
  const mirror = index % 2 ? ' transform="translate(1000 0) scale(-1 1)"' : '';
  return `<div class="sea-current sea-current--${half.toLowerCase()}" data-current="${from}-${to}" aria-hidden="true" style="--current-from:${fields[from]};--current-to:${fields[to]};--current-phase:${-index * 3}s">
    <svg viewBox="0 0 1000 240" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id="${id}-colour" x2="0" y2="100%"><stop offset="0.08" style="stop-color:var(--current-from)"/><stop offset="0.92" style="stop-color:var(--current-to)"/></linearGradient>
        <linearGradient id="${id}-fade" x2="0" y2="100%"><stop stop-color="white" stop-opacity="0"/><stop offset=".18" stop-color="white"/><stop offset=".82" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
        <mask id="${id}-mask"><rect width="1000" height="240" fill="url(#${id}-fade)"/></mask>
        <filter id="${id}-soft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="20"/></filter>
      </defs>
      <g mask="url(#${id}-mask)">
        <rect width="1000" height="240" fill="url(#${id}-colour)"/>
        <g filter="url(#${id}-soft)" opacity=".84"${mirror}>
          <path class="sea-flow sea-flow--from" d="M-80 -60 H1080 V40 C870 270 720 20 510 165 S170 265 -80 65 Z" style="fill:var(--current-from)"/>
          <path class="sea-flow sea-flow--to" d="M-80 300 H1080 V185 C850 -30 690 215 490 75 S180 -20 -80 195 Z" style="fill:var(--current-to)"/>
        </g>
      </g>
    </svg>
  </div>`;
}

export const resolveSeaCurrents = html => html.replace(/\{\{SEA_([A-Z_]+)_(IN|OUT)\}\}/g,(_,join,half)=>renderSeaCurrent(join,half));
