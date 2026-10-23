import { season, photos } from '../site/content.js';

// Keep the selected source intact; apply only the previously agreed next season.
export function adaptSeason(html) {
  const start = html.indexOf('<div id="rec1017570356"');
  const end = html.indexOf('<div id="rec1016601036"', start);
  if (start < 0 || end < start || !html.slice(start, end).includes('Прием заявок завершен')) {
    throw new Error('The source registration panel changed; review it before building.');
  }
  html = html.slice(0, start) + html.slice(end);
  if (!html.includes('второй год подряд')) throw new Error('The source season copy changed.');
  html = html.replace('второй год подряд', 'третий год подряд')
    .replaceAll('12-25&nbsp;октября', `12–25&nbsp;октября ${season.year}`)
    .replaceAll('12-25\u00a0октября', `12–25\u00a0октября ${season.year}`)
    .replace('скоростные работы по&nbsp;вторникам и&nbsp;пятницам, ', 'скоростные работы и&nbsp;')
    .replace('DDLong в&nbsp;воскресенье', 'DDLong');
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  let days = 0;
  html = html.replace(/(?:Воскресенье|Понедельник|Вторник|Среда|Четверг|Пятница|Суббота), (1[1-9]|2[0-5]) октября/g, (_, day) => {
    days++;
    const weekday = weekdays[new Date(Date.UTC(season.year, 9, Number(day))).getUTCDay()];
    return `${weekday}, ${day} октября`;
  });
  if (days !== 15) throw new Error(`Expected 15 source programme days; found ${days}.`);
  return html;
}

export function adaptPublication(html, site) {
  const url = new URL(site);
  html = adaptSeason(html)
    .replace(/(<meta property="og:url" content=")[^"]+/, `$1${url.href}`)
    .replace(/(<link rel="canonical" href=")[^"]+/, `$1${url.href}`)
    .replace(/(<meta property="og:image" content=")([^"]+)/, (_, prefix, image) => prefix + new URL(image, url).href)
    .replace('<meta property="og:description" content=""',
      `<meta property="og:description" content="«Пыльные гантели» на каникулах в Анталье. 12–25 октября ${season.year} года."`);
  html = html.replace(/(<div class="t997__title [^"]+"[^>]*)(>)/, '$1 role="heading" aria-level="1"$2');
  let described = 0;
  html = html.replace(/<img\b[^>]*class="t-img t1148__img"[^>]*>/g, image => {
    const photo = photos.find(photo => image.includes(photo.file));
    if (!photo) throw new Error('An archive photograph has no source description.');
    described++;
    const alt = `${photo.alt}. Кэмп в Фетхие, 2025.`.replaceAll('&','&amp;').replaceAll('"','&quot;');
    return image.replace('alt=""', `alt="${alt}" role="button" tabindex="0" aria-label="Увеличить фотографию: ${alt}"`);
  });
  if (described !== 11) throw new Error('Expected both original photo carousels.');
  return html;
}
