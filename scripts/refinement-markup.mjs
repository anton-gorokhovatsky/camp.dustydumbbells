/** Develop the accepted source; the captured HTML and media stay immutable. */
export function adaptRefinement(html, base, version) {
  if (!html.includes('id="recorddiv1016226926"')) throw new Error('The accepted cover is missing.');
  html = html.replace('id="allrecords"', 'id="allrecords" data-dd-refinement="camp"');
  html = html.replace(/<div id="rec1017771976"[^>]*>/, tag =>
    tag.replace(' t-screenmax-640px', '').replace(' data-screen-max="640px"', ''));
  // The fixed 70px header needs clearance after the 48px mobile section inset.
  // Apply it to Tilda's own click, initial-hash and history handlers together.
  const anchorStart = html.indexOf('<div id="rec1016289711"');
  const anchorEnd = html.indexOf('<!--footer-->', anchorStart);
  if (anchorStart < 0 || anchorEnd < anchorStart) throw new Error('The anchor controller changed.');
  const anchors = html.slice(anchorStart, anchorEnd)
    .replace(/t270_scroll\(hash,(?:-3|0)(?=[,)])/g, 't270_scroll(hash,24');
  html = html.slice(0, anchorStart) + anchors + html.slice(anchorEnd);
  const slidesStart = html.indexOf('<div id="rec2082111761"');
  const slidesEnd = html.indexOf('<div id="rec', slidesStart + 10);
  if (slidesStart < 0 || slidesEnd < slidesStart || !html.slice(slidesStart, slidesEnd).includes('data-coverslider-rec-ids="1016226926"')) {
    throw new Error('The former cover slideshow changed.');
  }
  html = html.slice(0, slidesStart) + html.slice(slidesEnd);
  const start = html.indexOf('<div id="rec1016226926"');
  const end = html.indexOf('<div id="rec', start + 10);
  let cover = html.slice(start, end);
  const poster = `${base}media/camp-2026-poster.jpg`;
  cover = cover.replace(/data-content-cover-parallax="dynamic"/, 'data-content-cover-parallax="fixed"')
    .replace(/data-content-cover-bg="[^"]+"/, `data-content-cover-bg="${poster}"`)
    .replace(/(<meta itemprop="image" content=")[^"]+/, '$1' + poster)
    .replace(/(<meta itemprop="image"[^>]+>)/, `$1<video class="dd-cover-video" id="dd-cover-video" controls muted loop playsinline preload="metadata" poster="${poster}" aria-label="Фильм с кэмпа DD в октябре 2026 года"><source src="${base}media/camp-2026.mp4" type="video/mp4"></video>`);
  cover = cover.replace(/<br\s*\/?>12–25&nbsp;октября 2027/, '<span class="dd-cover-date">12–25&nbsp;октября 2027</span>');
  const tools = `<div class="dd-cover-tools" hidden><button type="button" class="dd-cover-pause" aria-controls="dd-cover-video" aria-label="Пауза"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5H10V19H7ZM14 5H17V19H14Z"/></svg></button><button type="button" class="dd-cover-sound" aria-controls="dd-cover-video" aria-label="Включить звук" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9H7L12 5V19L7 15H3Z"/><path class="dd-sound-off" d="M16 9 22 15M22 9 16 15"/><path class="dd-sound-on" d="M16 8Q21 12 16 16M18 5Q26 12 18 19"/></svg></button></div>`;
  cover = cover.replace('<div class="t-cover__filter"', tools + '<div class="t-cover__filter"');
  if (!cover.includes('class="dd-cover-tools"')) throw new Error('The cover closing structure changed.');
  html = html.slice(0, start) + cover + html.slice(end);
  // Real paragraphs make spacing follow meaning instead of blank line-height.
  html = html.replace(/(<div\b[^>]*class="[^"]*\b(?:t-section__descr|t997__descr|t-text_md)\b[^"]*"[^>]*>)([\s\S]*?)(<\/div>)/g,
    (whole, open, content, close) => {
      const classes = open.match(/class="([^"]+)"/)?.[1] || '';
      if (!/\bt-section__descr\b|\bt997__descr\b/.test(classes) && !/^t-text t-text_md\s*$/.test(classes)) return whole;
      if (!content.trim() || /<div\b/.test(content)) return whole;
      const paragraphs = content.trim().split(/<br\s*\/?>(?:\s*)<br\s*\/?>/i).map(part => {
        const list = part.match(/^([\s\S]*?)(<ul\b[\s\S]*?<\/ul>)([\s\S]*)$/i);
        if (!list) return `<p>${part}</p>`;
        const before = list[1].replace(/<br\s*\/?>\s*$/i, '').trim();
        return (before ? `<p>${before}</p>` : '') + list[2] + (list[3].trim() ? `<p>${list[3]}</p>` : '');
      }).join('');
      return open + paragraphs + close;
    });
  return html.replace('</head>', `<link rel="stylesheet" href="${base}refinement.css?v=${version}" data-dd-refinement></head>`)
    .replace('</body>', `<script type="module" src="${base}cover-film.js?v=${version}" data-dd-cover-film></script></body>`);
}

export function adaptPrivacyRefinement(html, base, version) {
  return html.replace('id="allrecords"', 'id="allrecords" data-dd-refinement="policy"')
    .replace('</head>', `<link rel="stylesheet" href="${base}refinement.css?v=${version}" data-dd-refinement></head>`);
}
