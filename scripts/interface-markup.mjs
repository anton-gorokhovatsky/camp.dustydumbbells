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
  menu = menu.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replaceAll('Расписание</a>', 'Распи&shy;сание</a>')
    .replaceAll('Анталье</a>', 'Ан&shy;талье</a>')
    .replaceAll('Перелет, трансфер и&nbsp;проживание</a>', 'Пере&shy;лет, транс&shy;фер и&nbsp;прожи&shy;вание</a>');
  menu = menu.replace(/(<a\b[^>]*class="[^"]*\bt-menu__link-item\b[^"]*"[^>]*>)([\s\S]*?)(<\/a>)/g,
    (_,open,text,close) => open + text.replaceAll('Расписание','Распи&shy;сание').replaceAll('Анталье','Ан&shy;талье').replaceAll('Перелет','Пере&shy;лет').replaceAll('трансфер','транс&shy;фер').replaceAll('проживание','прожи&shy;вание') + close);
  html = html.slice(0, start) + menu + html.slice(end);
  html = html.replace(/(<a\b(?=[^>]*href="[^"]*#rec2078794451")(?=[^>]*class="[^"]*\bt-menu__link-item\b[^"]*")[^>]*>)[\s\S]*?(<\/a>)/g,
    '$1Дорога и жильё$2');
  if ((html.match(/>Дорога и жильё<\/a>/g) || []).length !== 3) throw new Error('All captured navigation variants must keep the same meaning.');
  const footerStart = html.indexOf('<div id="rec1018079361"');
  if (footerStart < 0) throw new Error('The selected footer changed.');
  const footer = html.slice(footerStart).replace(/(<a\b[^>]*href="[^"]*\/privacy\/?"[^>]*>[\s\S]*?<\/a>)/,
    '$1<label class="dd-motion-preference" hidden><input type="checkbox" data-dd-marquee-toggle checked>Анимация строк</label>');
  if (!footer.includes('data-dd-marquee-toggle')) throw new Error('The footer preference destination changed.');
  html = html.slice(0, footerStart) + footer;
  return html.replace('</head>', `<link rel="stylesheet" href="${base}navigation.css?v=${version}" data-dd-navigation></head>`)
    .replace('</body>', `<script type="module" src="${base}navigation.js?v=${version}" data-dd-navigation></script></body>`);
}
