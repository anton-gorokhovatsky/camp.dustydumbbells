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
    .replace('<div class="t1362__additional">', '<button type="button" class="dd-marquee-toggle" data-dd-marquee-toggle>Остановить бегущие строки</button><div class="t1362__additional">')
    .replaceAll('Расписание</a>', 'Распи&shy;сание</a>')
    .replaceAll('Анталье</a>', 'Ан&shy;талье</a>')
    .replaceAll('Перелет, трансфер и&nbsp;проживание</a>', 'Пере&shy;лет, транс&shy;фер и&nbsp;прожи&shy;вание</a>');
  if (!menu.includes('data-dd-marquee-toggle')) throw new Error('The menu secondary group changed.');
  menu = menu.replace(/(<a\b[^>]*class="[^"]*\bt-menu__link-item\b[^"]*"[^>]*>)([\s\S]*?)(<\/a>)/g,
    (_,open,text,close) => open + text.replaceAll('Расписание','Распи&shy;сание').replaceAll('Анталье','Ан&shy;талье').replaceAll('Перелет','Пере&shy;лет').replaceAll('трансфер','транс&shy;фер').replaceAll('проживание','прожи&shy;вание') + close);
  html = html.slice(0, start) + menu + html.slice(end);
  return html.replace('</head>', `<link rel="stylesheet" href="${base}navigation.css?v=${version}" data-dd-navigation></head>`)
    .replace('</body>', `<script type="module" src="${base}navigation.js?v=${version}" data-dd-navigation></script></body>`);
}
