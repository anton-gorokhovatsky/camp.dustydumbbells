/** The author's menu, with the requested social links and the existing matte material. */
export function adaptInterface(html, base, version) {
  const start = html.indexOf('<div id="rec1017771976"');
  const next = /<div id="rec\d+"/.exec(html.slice(start + 10));
  const end = next ? start + 10 + next.index : -1;
  if (start < 0 || end < start) throw new Error('The original mobile menu changed.');
  let menu = html.slice(start, end);
  menu = menu.replace(/<li class="t-sociallinks__item t-sociallinks__item_instagram">[\s\S]*?<\/li>(?:&nbsp;)?/, '')
    .replace('class="t-menu-popover__burgermenu__close-button" aria-label=""',
      'class="t-menu-popover__burgermenu__close-button" aria-label="Закрыть меню"')
    .replace('aria-label="Social media links"', 'aria-label="Ссылки DD"');
  for (const [name, label] of [['telegram', 'Telegram'], ['website', 'Сайт DD']]) {
    const pattern = new RegExp(`(<li class="t-sociallinks__item t-sociallinks__item_${name}">[\\s\\S]*?<a[^>]*)(>[\\s\\S]*?<\\/svg>)(<\\/a>)`);
    menu = menu.replace(pattern, (_, anchor, icon, close) =>
      anchor.replace(`aria-label="${name}"`, `aria-label="${label}"`) + icon + `<span class="dd-social-label">${label}</span>` + close);
  }
  html = html.slice(0, start) + menu + html.slice(end);
  return html.replace('</head>', `<link rel="stylesheet" href="${base}navigation.css?v=${version}" data-dd-navigation></head>`)
    .replace('</body>', `<script type="module" src="${base}navigation.js?v=${version}" data-dd-navigation></script></body>`);
}
