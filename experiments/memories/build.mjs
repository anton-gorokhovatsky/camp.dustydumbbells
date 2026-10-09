import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readBaseline } from '../baseline.mjs';
import assert from 'node:assert/strict';
import { typograph } from '../../site/typography.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const release = JSON.parse(await readFile(path.join(root, 'dist/release.json'), 'utf8'));
const source = await readBaseline(root, release);
const start = source.indexOf('<div id="memories"');
const end = source.indexOf('\n    </section>', start);
assert(start > 0 && end > start, 'Find the existing photo chapter');
const original = source.slice(start, end);
const photos = [...original.matchAll(/<figure[^>]*><a([^>]*)>(<img[^>]*>)<\/a><figcaption>([^<]+)<\/figcaption><\/figure>/g)]
  .map((match, index) => ({ attributes: match[1], image: match[2].replace('loading="lazy"', 'loading="eager"'), caption: match[3], index: index + 1 }));
assert.equal(photos.length, 3);
const description = original.match(/<div class="chapter-heading"><h2>[^<]+<\/h2><p>([^<]+)<\/p>/)[1];
const concepts = [
  { slug: 'film', name: 'Кинолента', number: '1', description: 'Большие кадры идут горизонтально: горы, море, побережье. Можно рассматривать снимки в собственном темпе.' },
  { slug: 'portholes', name: 'Иллюминаторы', number: '2', description: 'Мягкие округлые проёмы и матовая кромка. Фотографии становятся частью морской среды.' },
  { slug: 'zine', name: 'Фотозин', number: '3', description: 'Три свободных журнальных разворота: целый кадр, крупная подпись и смена композиции при прокрутке.' },
];
const base = `${release.base}experiments/memories/`;
const destination = path.join(root, 'dist/experiments/memories');
const writeHTML = (file, html) => writeFile(file, html.replace(/>([^<>]+)</g, (_, prose) => `>${typograph(prose)}<`));
await mkdir(destination, { recursive: true });
for (const file of ['lab.css', 'lab.js']) await copyFile(path.join(root, 'experiments/memories', file), path.join(destination, file));

const frame = photo => `<figure id="memory-${photo.index}" class="memory-frame" aria-labelledby="memory-caption-${photo.index}"><a${photo.attributes}><span class="memory-image">${photo.image}</span><span class="memory-caption" id="memory-caption-${photo.index}"><span class="memory-name">${photo.caption}</span><span class="memory-number" aria-hidden="true">${photo.index} / 3</span></span></a></figure>`;
const zineFrame = photo => {
  const attributes = photo.attributes.replace(/ aria-label="[^"]*"/, '');
  return `<figure id="memory-${photo.index}" class="memory-frame" aria-labelledby="memory-name-${photo.index}"><a${attributes} aria-labelledby="memory-name-${photo.index}" aria-describedby="memory-open"><span class="memory-image">${photo.image}</span><div class="memory-caption"><span class="memory-number" aria-hidden="true">${photo.index} / 3</span><h3 class="memory-name" id="memory-name-${photo.index}">${photo.caption}</h3></div></a></figure>`;
};
const intro = `<div class="memory-intro"><p class="memory-context">${typograph('Кэмп в Фетхие, 2025')}</p><h2 id="memory-title"><span>Между</span> <span>тренировками</span></h2><p class="memory-description">${description}</p></div>`;
for (const concept of concepts) {
  const navigation = `<nav class="memory-review" aria-label="Варианты раздела"><a href="${base}">Сравнить</a>${concepts.map(item => `<a href="${base}${item.slug}/#memories"${item.slug === concept.slug ? ' aria-current="page"' : ''}>${item.name}</a>`).join('')}</nav>`;
  const zineIntro = `<div class="memory-intro"><div class="memory-meta"><p class="memory-context">${typograph('Кэмп в Фетхие, 2025')}</p><nav class="memory-review" aria-label="Сравнение экспериментов"><a href="${base}">Все варианты</a></nav></div><h2 id="memory-title"><span>Между</span> <span>тренировками</span></h2><p class="memory-description">${description}</p></div>`;
  const content = concept.slug === 'film'
    ? `<div class="memory-strip" role="region" aria-labelledby="memory-title" tabindex="0">${intro}${photos.map(frame).join('')}</div><div class="film-controls" hidden><button type="button" data-film-step="-1">Назад</button><button type="button" data-film-step="1">Дальше</button></div>`
    : `${concept.slug === 'zine' ? zineIntro + '<p class="sr-only" id="memory-open">Открыть фотографию.</p>' : intro}<div class="memory-collection">${photos.map(concept.slug === 'zine' ? zineFrame : frame).join('')}</div>`;
  const section = `<section id="memories" class="memories" data-memory-style="${concept.slug}" aria-labelledby="memory-title">${concept.slug === 'zine' ? '' : navigation}${content}</section>`;
  // Give the zine its own chapter boundary so the preceding tilted print stays in About.
  const page = concept.slug === 'zine'
    ? `${source.slice(0, start)}</section>\n    ${section}${source.slice(end + '\n    </section>'.length)}`
    : source.replace(original, section);
  const html = page
    .replaceAll('./direction/', `${release.base}direction/`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${concept.name} — Между тренировками — Пыльные гантели</title>`)
    .replace('</head>', `<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="${base}lab.css"><script type="module" src="${base}lab.js"></script></head>`);
  // The same archive photographs retain exactly one placement in each full page.
  for (const photo of photos) {
    const file = photo.image.match(/src="([^"]+)"/)[1];
    assert.equal(html.split(`src="${file}"`).length - 1, 1, `${concept.slug}: unique ${file}`);
    for (const attribute of ['href', 'data-photo', 'data-gallery']) {
      const value = photo.attributes.match(new RegExp(`${attribute}="([^"]+)"`))[1];
      assert(html.includes(`${attribute}="${value}"`), `${concept.slug}: preserve ${attribute}`);
    }
    assert(html.includes(photo.caption), `${concept.slug}: preserve authored caption`);
  }
  assert.equal(html.slice(html.indexOf('<section id="program"'), html.indexOf('<section id="travel"')), source.slice(source.indexOf('<section id="program"'), source.indexOf('<section id="travel"')), 'Preserve the released calendar');
  await mkdir(path.join(destination, concept.slug), { recursive: true });
  await writeHTML(path.join(destination, concept.slug, 'index.html'), html);
}

const cards = concepts.map(concept => `<article class="memory-concept"><a class="concept-preview" href="${base}${concept.slug}/#memories" aria-label="Посмотреть вариант ${concept.name}"><img src="${base}previews/${concept.slug}.png" width="1440" height="900" alt="${concept.name}: рендер раздела Между тренировками"></a><div class="concept-copy"><p class="concept-number">${concept.number} / 3</p><h2><a href="${base}${concept.slug}/#memories">${concept.name}</a></h2><p>${typograph(concept.description)}</p></div></article>`).join('');
await writeHTML(path.join(destination, 'index.html'), `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Между тренировками — три эксперимента</title><link rel="stylesheet" href="${release.base}direction/screen.css?v=${release.commit}"><link rel="stylesheet" href="${base}lab.css"></head><body class="memories-lab"><header class="memories-lab-header"><img src="${release.base}assets/bd7e17e9090f-Group_1486.svg" width="468" height="101" alt="DUSTY"><a href="${release.base}#memories">Текущая версия</a></header><main class="memories-lab-home"><p class="lab-kicker">Между тренировками · три локальных варианта</p><h1>Уйти<br>с дорожки.</h1><p class="lab-description">Те же фотографии и тексты. Три способа почувствовать жизнь между тренировками.</p><div class="memory-concepts">${cards}</div></main></body></html>`);
await mkdir(path.join(destination, 'previews'), { recursive: true });
for (const concept of concepts) {
  const file = path.join(root, 'experiments/memories/previews', `${concept.slug}.png`);
  await copyFile(file, path.join(destination, 'previews', `${concept.slug}.png`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
console.log(`Three local photo concepts: http://127.0.0.1:4173${base}`);
