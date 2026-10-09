import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { typograph } from '../../site/typography.js';
import { readBaseline } from '../baseline.mjs';
import { renderHotelDirectory } from '../../site/hotel-directory.js';
import { renderRunningGuide } from './guide.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const release = JSON.parse(await readFile(path.join(root, 'dist/release.json'), 'utf8'));
const source = await readBaseline(root, release);
const start = source.indexOf('<section id="travel"');
const end = source.indexOf('</section>', start) + '</section>'.length;
assert(start > 0 && end > start, 'Find the complete travel section');
const original = source.slice(start, end);
const title = original.match(/<h2 id="travel-title">([^<]+)<\/h2>/)[1];
const lead = original.match(/<p class="chapter-lead">([^<]+)<\/p>/)[1];
const articles = [...original.matchAll(/<article>([\s\S]*?)<\/article>/g)].map(match => match[1]);
assert.equal(articles.length, 3);
const photoMatch = original.match(/<figure[^>]*><a([^>]*)>(<img[^>]*>)<\/a><figcaption>([^<]+)<\/figcaption><\/figure>/);
assert(photoMatch, 'Use the existing harbour photograph');
const photoFile = photoMatch[2].match(/src="([^"]+)"/)[1];
const photoAttributes = photoMatch[1].replace(/ aria-label="[^"]*"/, '');
const photo = `<figure class="journey-photo" aria-labelledby="journey-photo-name"><a${photoAttributes} aria-labelledby="journey-photo-name" aria-describedby="journey-photo-help"><span class="journey-photo-frame">${photoMatch[2].replace('loading="lazy"', 'loading="eager"')}</span><span id="journey-photo-name" class="journey-photo-caption">${photoMatch[3]}</span></a></figure>`;
const photoHelp = '<p class="sr-only" id="journey-photo-help">Открыть фотографию.</p>';
const base = `${release.base}experiments/travel/`;
const output = path.join(root, 'dist/experiments/travel');
const hotels = JSON.parse(await readFile(path.join(root, 'site/data/hotels.json'), 'utf8'));
const currency = JSON.parse(await readFile(path.join(root, 'site/data/currency.json'), 'utf8'));
const concepts = [
  { slug: 'ticket', name: 'Билет к морю', number: '1', description: 'Матовый билет с датами поездки, фотографиями отелей и путеводителем по беговой Анталье.' },
  { slug: 'route', name: 'Маршрут', number: '2', description: 'Извилистая линия связывает три шага: выбрать даты, найти жильё и познакомиться с Пыльными гантелями.' },
  { slug: 'neighbourhood', name: 'На районе', number: '3', description: 'Коньяалты и крупный указатель вариантов жилья. Район становится главным акцентом раздела.' },
];
const prose = html => html.replace(/>([^<>]+)</g, (_, text) => `>${typograph(text)}<`);
await mkdir(output, { recursive: true });
await copyFile(path.join(root, 'experiments/travel/lab.css'), path.join(output, 'lab.css'));
await copyFile(path.join(root, 'experiments/travel/lab.js'), path.join(output, 'lab.js'));
await mkdir(path.join(output, 'media'), { recursive: true });
for (const hotel of hotels) {
  for (const photograph of hotel.photos) {
    await copyFile(path.join(root, 'site/direction/media/hotels', photograph.file), path.join(output, 'media', photograph.file));
  }
}

function heading(slug) {
  return `<header class="journey-heading"><div class="journey-meta"><p class="section-label">Как добраться · Анталья, Турция</p><nav class="journey-review" aria-label="Сравнение экспериментов"><a href="${base}">Все варианты</a></nav></div><h2 id="travel-title">${title}</h2><p class="journey-lead">${lead}</p></header>`;
}
const article = (index, className = '') => `<article${className ? ` class="${className}"` : ''}>${articles[index]}</article>`;
const stayIntro = articles[1].replace(/<ul class="stay-options"[^>]*>[\s\S]*?<\/ul>/, '');
assert(!stayIntro.includes('stay-options'), 'Relocate the hotel directory without keeping a duplicate list');
const hotelDirectory = renderHotelDirectory(hotels, `${base}media/`);
const dates = `<dl class="ticket-dates" aria-label="Даты поездки"><div><dt>Приезд</dt><dd><time datetime="2027-10-11"><strong>11</strong><span>октября 2027</span></time></dd></div><div><dt>Отъезд</dt><dd><time datetime="2027-10-25"><strong>25</strong><span>октября 2027</span></time></dd></div></dl>`;
const line = `<svg class="route-line" viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0 C50 110 12 115 12 200 S50 300 50 400"/></svg>`;
const contents = {
  ticket: `${heading('ticket')}<div class="travel-ticket"><div class="ticket-top"><p class="ticket-destination">Анталья</p>${dates}</div><div class="ticket-body">${photo}<div class="ticket-information">${article(0)}<article>${stayIntro}<p class="stay-jump"><a href="#hotels-title">Отели и апартаменты</a></p></article>${article(2)}</div></div>${hotelDirectory}</div>${photoHelp}<p class="guide-invitation"><a href="#running-guide">Где бегать, пить кофе и жить в Анталье</a></p>`,
  route: `${heading('route')}<div class="route-layout">${photo}<ol class="route-stops" aria-label="Подготовка к поездке">${articles.map((body, i) => `<li><span class="route-number" aria-hidden="true">${i + 1}</span>${i < 2 ? line : ''}<article>${body}</article></li>`).join('')}</ol></div>${photoHelp}`,
  neighbourhood: `${heading('neighbourhood')}<p class="district-name" aria-hidden="true">Коньяалты</p><div class="district-layout">${article(1, 'district-stays')}${photo}</div><div class="district-notes">${article(0)}${article(2)}</div>${photoHelp}`,
};

for (const concept of concepts) {
  const section = `<section id="travel" class="chapter travel" data-travel-style="${concept.slug}" aria-labelledby="travel-title">${contents[concept.slug]}</section>${concept.slug === 'ticket' ? renderRunningGuide(currency) : ''}`;
  const html = source.replace(original, prose(section))
    .replaceAll('./direction/', `${release.base}direction/`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${concept.name} — Как добраться — Пыльные гантели</title>`)
    .replace('</head>', `<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="${base}lab.css">${concept.slug === 'ticket' ? `<script type="module" src="${base}lab.js"></script>` : ''}</head>`);
  // Each local alternative changes only this section; preserve copy and destinations.
  for (let index = 0; index < articles.length; index++) {
    const body = concept.slug === 'ticket' && index === 1 ? stayIntro.trim() : articles[index];
    assert(html.includes(body), `${concept.slug}: preserve the authored article; Ticket relocates only the hotel list`);
  }
  const originalLinks = [...original.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  for (const url of originalLinks) assert(html.includes(`href="${url}"`), `${concept.slug}: preserve ${url}`);
  assert.equal(html.split(`src="${photoFile}"`).length - 1, 1, `${concept.slug}: one placement of the harbour photograph`);
  assert.equal(html.slice(html.indexOf('<section id="program"'), html.indexOf('<section id="travel"')), source.slice(source.indexOf('<section id="program"'), source.indexOf('<section id="travel"')), 'Preserve the released calendar exactly');
  assert.equal(html.slice(html.indexOf('<footer class="camp-footer"')), source.slice(source.indexOf('<footer class="camp-footer"')), 'Preserve footer, gallery and existing behaviour');
  if (concept.slug === 'ticket') {
    assert.equal(hotels.length, 5, 'Preserve the five original accommodation options');
    for (const hotel of hotels) {
      assert.equal(html.split(`href="${hotel.booking}"`).length - 1, 1, 'Each hotel has one booking destination in Ticket');
    }
    for (const hotel of hotels) for (const photograph of hotel.photos) {
      assert.equal(html.split(`src="${base}media/${photograph.file}"`).length - 1, 1, 'Place each hotel image once');
    }
    assert(html.includes(currency.effectiveDate), 'Show the CBR effective date');
    assert(html.includes('https://t.me/begmonrun/304') && html.includes('https://t.me/Slk425/847'), 'Credit both supplied sources');
  }
  const directory = path.join(output, concept.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), html);
}

const cards = concepts.map(concept => `<article class="travel-concept"><a class="concept-preview" href="${base}${concept.slug}/#travel" aria-label="Посмотреть вариант ${concept.name}"><img src="${base}previews/${concept.slug}.png" width="1440" height="900" alt="${concept.name}: рендер раздела Как добраться"></a><div class="concept-copy"><p class="concept-number">${concept.number} / 3</p><h2><a href="${base}${concept.slug}/#travel">${concept.name}</a></h2><p>${concept.description}</p></div></article>`).join('');
await writeFile(path.join(output, 'index.html'), prose(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Как добраться — три эксперимента</title><link rel="stylesheet" href="${release.base}direction/screen.css?v=${release.commit}"><link rel="stylesheet" href="${base}lab.css"></head><body class="travel-lab"><header class="travel-lab-header"><img src="${release.base}assets/bd7e17e9090f-Group_1486.svg" alt="DUSTY" width="468" height="101"><a href="${release.base}#travel">Текущая версия</a></header><main class="travel-lab-home"><p class="lab-kicker">Как добраться · три локальных варианта</p><h1>До встречи<br>у моря.</h1><p class="lab-description">Место, даты и жильё. Три способа собрать поездку в Анталью.</p><div class="travel-concepts">${cards}</div></main></body></html>`));
await mkdir(path.join(output, 'previews'), { recursive: true });
for (const concept of concepts) {
  await copyFile(path.join(root, 'experiments/travel/previews', `${concept.slug}.png`), path.join(output, 'previews', `${concept.slug}.png`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
console.log(`Three local travel concepts: http://127.0.0.1:4173${base}`);
