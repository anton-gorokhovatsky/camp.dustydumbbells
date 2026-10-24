/** Develop the selected capture without mutating its archived HTML or media. */
export function adaptAccessibility(html, base, version) {
  const heading = (record, token, tag, id) => {
    const start = html.indexOf(`<div id="${record}"`);
    if (start < 0) throw new Error(`Missing heading record: ${record}`);
    const next = html.indexOf('<div id="rec', start + 10);
    const end = next < 0 ? html.length : next;
    let part = html.slice(start, end);
    const pattern = new RegExp(`<div\\b([^>]*class="[^"]*\\b${token}\\b[^"]*"[^>]*)>([\\s\\S]*?)<\\/div>`);
    if (!pattern.test(part)) throw new Error(`Missing heading: ${token}`);
    part = part.replace(pattern, (_, attrs, text) => {
      const shaped=text.replaceAll('Присоединяйтесь','При&shy;со&shy;еди&shy;няй&shy;тесь').replaceAll('приключению','при&shy;клю&shy;че&shy;нию').replaceAll('беговому','бе&shy;го&shy;во&shy;му').replaceAll('Расписание','Распи&shy;сание').replaceAll('проживание','про&shy;жи&shy;ва&shy;ние').replaceAll('трансфер','транс&shy;фер').replaceAll('Перелет','Пере&shy;лет').replaceAll('Пыльные','Пыль&shy;ные').replaceAll('Гантели','Ган&shy;те&shy;ли').replaceAll('каникулах','ка&shy;ни&shy;ку&shy;лах').replaceAll('Анталье','Ан&shy;талье');
      return `<${tag}${attrs.replace(/ role="heading"| aria-level="\d"/g, '')} id="${id}" tabindex="-1">${shaped}</${tag}>`;
    });
    html = html.slice(0, start) + part + html.slice(end);
  };
  heading('rec1016226926', 't997__title', 'h1', 'dd-title');
  for (const [record, token, name] of [
    ['rec1016322141', 't-section__title', 'about'],
    ['rec2078762951', 't225__title', 'programme'],
    ['rec1017020466', 't-section__title', 'weather'],
    ['rec2078794451', 't225__title', 'travel'],
    ['rec1016216116', 't-section__title', 'form'],
  ]) heading(record, token, 'h2', `dd-heading-${name}`);
  let day = 10;
  html = html.replace(/<div class="t547__title([^>]*)>([\s\S]*?)<\/div>/g,
    (_, attrs, text) => `<h3 class="t547__title${attrs} id="dd-day-${++day}" tabindex="-1">${text}</h3>`);
  if (day !== 25) throw new Error('The fifteen programme headings changed.');

  // Three intentional punctuation points replace nine repetitive strips.
  // Their source material remains available in the immutable capture.
  for (const id of ['rec1017562541', 'rec1017560216', 'rec1017536431', 'rec1017631591', 'rec1017633576', 'rec1017633991', 'rec1016289711']) {
    const start = html.indexOf(`<div id="${id}"`);
    const end = Math.min(...[html.indexOf('<div id="rec', start + 10), html.indexOf('<!--footer-->', start)].filter(index => index >= 0));
    if (start < 0 || end < start) throw new Error(`Missing retired record: ${id}`);
    html = html.slice(0, start) + html.slice(end);
  }
  html = html.replace('<div id="rec1016226926"', '<main id="dd-main" tabindex="-1"><div id="rec1016226926"')
    .replace('<!--footer-->', '</main><!--footer-->')
    .replace('<div id="rec1016358466"', '<div class="dd-cover-intro" data-dd-intro></div><div id="rec1016358466"');
  html = html.replace(/(<div id="rec1016216116"[^>]*>)/, '$1<a name="form" id="form" class="dd-form-anchor"></a>');
  if (!html.includes('</main><!--footer-->')) throw new Error('The main/footer boundary changed.');
  html = html.replace(/(<body\b[^>]*>)/, '$1<a class="dd-skip-link" href="#dd-main">К содержанию</a>');

  // The owned form keeps the original field markup and visual classes.
  // Captured mask/date/conditional initialisers no longer compete for its state.
  html = html.replace(/(<form\s+id="form1016216116"[\s\S]*?<\/form>)/, form => form
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/ data-phonemask-[\w-]+="[^"]*"| data-tilda-mask="[^"]*"/g, '')
    .replace(/\bjs-tilda-mask\b|\bjs-phonemask-input\b|\bjs-tilda-rule\b|\bt-conditional-form\b/g, '')
    .replace(/(<div\b[^>]*data-field-name="(?:[^"]*_2|[^" ]*-p)"[^>]*)(>)/g, '$1 hidden$2')
    .replace('role="form"', 'role="form" aria-labelledby="dd-heading-form" data-dd-widgets'));
  const formStart = html.indexOf('<div id="rec1016216116"');
  const formEnd = html.indexOf('<!--footer-->', formStart);
  html = html.slice(0, formStart) + html.slice(formStart, formEnd).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '') + html.slice(formEnd);
  // This captured analytics loader belongs to the retired Tilda publication.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, script => /tilda-stat(?:istics)?|tildastat|stat\.tildacdn/i.test(script) ? '' : script);
  html = html.replace(/<script\b[^>]*src="[^"]*(?:tilda-forms(?:-custommask)?-1\.0|tilda-date-picker-1\.0)[^"]*"[^>]*>\s*<\/script>/g, '');
  return html.replace('</head>', `<link rel="stylesheet" href="${base}phone-flags.css?v=${version}"><link rel="stylesheet" href="${base}accessibility.css?v=${version}" data-dd-accessibility></head>`)
    .replace('</body>', `<script type="module" src="${base}accessibility.js?v=${version}" data-dd-accessibility></script></body>`);
}

export function adaptPrivacyAccessibility(html, base, version) {
  html = html.replace('id="allrecords"', 'id="allrecords" role="main"');
  for (const [token,tag] of [['t050__title','h1'],['t120__title','h2']]) {
    const pattern=new RegExp(`<div\\b([^>]*class="[^"]*\\b${token}\\b[^"]*"[^>]*)>([\\s\\S]*?)<\\/div>`,'g');
    html=html.replace(pattern,(_,attrs,text)=>`<${tag}${attrs.replace(/ role="heading"| aria-level="\d"/g,'')}>${text}</${tag}>`);
  }
  return html.replace('</head>',`<link rel="stylesheet" href="${base}accessibility.css?v=${version}" data-dd-accessibility></head>`);
}
