// A colour adapter for the accepted original. Numeric record IDs are confined
// here; the palette model knows only the roles of the published composition.
export function adaptClimate(html, base, version) {
  html = html.replace('<body', '<body data-dd-environment');
  // Replace only CSS declarations, never scripts, copy, images or brand SVGs.
  const roleColours = css => css
    .replace(/((?:^|[;{\s])(?:color|border-color|background-color|fill|stroke)\s*:\s*)#232323\b/gi, '$1var(--dd-ink)')
    .replace(/((?:^|[;{\s])(?:color|border-color|background-color|fill|stroke)\s*:\s*)(?:#1a4297|rgb\(26,\s*66,\s*151\))(?=[;\s!}]|$)/gi, '$1var(--dd-blue)')
    .replace(/((?:^|[;{\s])(?:color|border-color|background-color|fill|stroke)\s*:\s*)(?:#b21818|rgb\(178,\s*24,\s*24\))(?=[;\s!}]|$)/gi, '$1var(--dd-red)');
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attributes, css) => `<style${attributes}>${roleColours(css)}</style>`)
    .replace(/\bstyle="([^"]*)"/gi, (_, css) => `style="${roleColours(css)}"`);
  const weatherStart = html.indexOf('<div id="rec1017020466"');
  if (weatherStart >= 0) {
    const descriptionStart = html.indexOf('field="bdescr">', weatherStart);
    const descriptionEnd = html.indexOf('</div>', descriptionStart);
    const nextRecord = html.indexOf('<div id="rec', weatherStart + 10);
    if (descriptionStart < 0 || descriptionEnd < 0 || descriptionEnd > nextRecord) {
      throw new Error('Review the original weather copy before adding the climate reading.');
    }
    html = html.slice(0, descriptionEnd)
      + '<p class="dd-climate-reading"><span data-dd-weather-values>Цвета страницы следуют свету Антальи.</span> <span class="dd-climate-source"><span>Данные погоды:</span> <span><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.</span></span></p>'
      + html.slice(descriptionEnd);
  }
  return html.replace('</head>', `<link rel="stylesheet" href="${base}climate.css?v=${version}" data-dd-climate><script type="module" src="${base}camp-environment.js?v=${version}" data-dd-climate></script></head>`);
}
