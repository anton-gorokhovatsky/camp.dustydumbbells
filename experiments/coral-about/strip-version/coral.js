// Coral's own exported field, variation 88364; no substitute geometry.
export function renderCoralCurrent(half) {
  const id = `coral-weather-about-${half}`;
  return `<div class="sea-current sea-current--${half} sea-current--coral" data-current="weather-about" aria-hidden="true" style="--current-from:color-mix(in srgb,#fff 68%,var(--environment-reading,#365a66) 32%);--current-to:var(--environment-reading,#365a66);--current-phase:0s">
    <svg viewBox="0 0 1000 320" preserveAspectRatio="none" focusable="false"><defs><linearGradient id="${id}" x2="0" y2="100%"><stop offset="0" style="stop-color:var(--current-from)"/><stop offset="1" style="stop-color:var(--current-to)"/></linearGradient><linearGradient id="${id}-fade" x2="0" y2="100%"><stop stop-color="white" stop-opacity="0"/><stop offset=".18" stop-color="white"/><stop offset=".82" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="${id}-mask"><rect width="1000" height="320" fill="url(#${id}-fade)"/></mask></defs><rect width="1000" height="320" fill="url(#${id})" mask="url(#${id}-mask)"/></svg>
    <canvas class="sea-coral-print"></canvas><i class="sea-coral-pigment" style="color:var(--current-from)"></i><i class="sea-coral-pigment" style="color:var(--current-to)"></i>
  </div>`;
}

export function replaceAboutCurrent(html) {
  return html.replace(/<div class="sea-current sea-current--(out|in)" data-current="weather-about"[\s\S]*?<\/svg>\s*<\/div>/g,(_,half)=>renderCoralCurrent(half));
}
