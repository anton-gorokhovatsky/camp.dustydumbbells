// Local interpretation of Coral's branching sea fans. Only the two existing
// weather/about pigments are used; this does not copy the reference renderer.
const round = value => Math.round(value * 10) / 10;
function ribbon(root, tip, depth, branch, phase) {
  const bend = phase ? (branch % 2 ? -26 : 30) : 0;
  const rise = phase ? (branch % 2 ? 22 : -18) : 0;
  const base = 40;
  const end = 9 + branch * 2;
  const x = tip + bend;
  const y = depth + rise;
  const drift = phase ? 32 : -18;
  return `M${root-base} -48 C${root-base+drift} 70 ${round(x-end-44)} ${round(y-76)} ${round(x-end)} ${round(y)} Q${round(x)} ${round(y+18)} ${round(x+end)} ${round(y)} C${round(x+end-44)} ${round(y-76)} ${root+base+drift} 70 ${root+base} -48 Z`;
}

const tips = [-140,-45,50,145];
const depths = [200,265,245,188];
function fan(root, kind, group) {
  return tips.map((offset, index) => {
    const a = ribbon(root, root+offset, depths[index], index, false);
    const b = ribbon(root, root+offset, depths[index], index, true);
    return `<path class="sea-coral-ribbon sea-coral-ribbon--${kind}" d="${a}" style="--ribbon-a:path('${a}');--ribbon-b:path('${b}');--ribbon-duration:24s;--ribbon-phase:${-(index*2+group*4)}s"/>`;
  }).join('');
}

export function renderCoralCurrent(half) {
  const id = `coral-weather-about-${half.toLowerCase()}`;
  return `<div class="sea-current sea-current--${half.toLowerCase()} sea-current--coral" data-current="weather-about" aria-hidden="true" style="--current-from:color-mix(in srgb,#fff 68%,var(--environment-reading,#365a66) 32%);--current-to:var(--environment-reading,#365a66);--current-phase:0s">
    <svg viewBox="0 0 1000 320" preserveAspectRatio="none" focusable="false">
      <defs>
        <linearGradient id="${id}-colour" x2="0" y2="100%"><stop offset=".05" style="stop-color:var(--current-from)"/><stop offset=".95" style="stop-color:var(--current-to)"/></linearGradient>
        <linearGradient id="${id}-fade" x2="0" y2="100%"><stop stop-color="white" stop-opacity="0"/><stop offset=".18" stop-color="white"/><stop offset=".82" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
        <mask id="${id}-mask"><rect width="1000" height="320" fill="url(#${id}-fade)"/></mask>
        <filter id="${id}-soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <g mask="url(#${id}-mask)">
        <rect width="1000" height="320" fill="url(#${id}-colour)"/>
        <g filter="url(#${id}-soft)" opacity=".76">${fan(230,'from',0)}${fan(770,'from',1)}</g>
        <g filter="url(#${id}-soft)" opacity=".8" transform="translate(0 320) scale(1 -1)">${fan(55,'to',2)}${fan(540,'to',3)}</g>
      </g>
    </svg>
  </div>`;
}

export function replaceAboutCurrent(html) {
  return html.replace(/<div class="sea-current sea-current--(out|in)" data-current="weather-about"[\s\S]*?<\/svg>\s*<\/div>/g,(_,half)=>renderCoralCurrent(half));
}
