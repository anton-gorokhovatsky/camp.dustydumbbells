import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readBaseline } from '../baseline.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const release = JSON.parse(await readFile(path.join(root, 'dist/release.json'), 'utf8'));
const source = (await readBaseline(root, release))
  .replace(' data-calendar-style="poster"', '');
const destination = path.join(root, 'dist/experiments/calendar');
const base = `${release.base}experiments/calendar/`;
const concepts = [
  { slug: 'tide', number: '01', title: 'Прилив', description: 'Дни следуют вдоль извилистой линии. Бег и отдых задают ритм всей поездке.' },
  { slug: 'poster', number: '02', title: 'Афиша', description: 'Программа как большой фестивальный плакат: цвет, крупные даты и занятия без мелкого шрифта.' },
  { slug: 'panorama', number: '03', title: 'Панорама', description: 'Один день занимает широкую сцену. Соседний уже виден; между ними можно двигаться жестом или с клавиатуры.' },
];

await mkdir(destination, { recursive: true });
for (const file of ['lab.css', 'lab.js']) await copyFile(path.join(root, 'experiments/calendar', file), path.join(destination, file));
await mkdir(path.join(destination, 'previews'), { recursive: true });
for (const concept of concepts) await copyFile(path.join(root, 'experiments/calendar/previews', `${concept.slug}.png`), path.join(destination, 'previews', `${concept.slug}.png`));

for (const concept of concepts) {
  const navigation = `<nav class="lab-review" aria-label="Варианты календаря"><a href="${base}">Все варианты</a>${concepts.map(item => `<a href="${base}${item.slug}/#week-one"${item.slug === concept.slug ? ' aria-current="page"' : ''}>${item.number} ${item.title}</a>`).join('')}</nav>`;
  let html = source
    .replaceAll('./direction/', `${release.base}direction/`)
    .replace('</head>', `<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="${base}lab.css"><script type="module" src="${base}lab.js"></script></head>`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${concept.title} — календарь Пыльных гантелей</title>`)
    .replace('<section id="program" class="chapter program"', `<section id="program" data-calendar-style="${concept.slug}" class="chapter program"`);
  html = html.replace(/(<section id="program"[^>]*>)/, `$1${navigation}`);
  if (concept.slug === 'poster') {
    // Let the display title wrap between whole words on narrow, enlarged-text views.
    html = html.replace('Две недели на\u00a0каникулах', 'Две недели на каникулах');
  }
  if (concept.slug === 'panorama') {
    for (const [id, label] of [['week-one', 'первой недели'], ['week-two', 'второй недели']]) {
      const expression = new RegExp(`(<section class="program-week" aria-labelledby="${id}">[\\s\\S]*?<div class="week-days">)([\\s\\S]*?)(</div></section>)`);
      html = html.replace(expression, (_, start, days, end) => {
        const controls = `<div class="panorama-controls" hidden><p class="panorama-position" aria-live="polite"></p><div><button type="button" data-day-step="-1" aria-label="Предыдущий день ${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" data-day-step="1" aria-label="Следующий день ${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div></div>`;
        return start.replace('<div class="week-days">', `${controls}<div class="week-days" role="region" tabindex="0" aria-label="Дни ${label}">`) + days + end;
      });
    }
  }
  const actualDates = [...html.matchAll(/data-date="([^"]+)"/g)].map(match => match[1]);
  if (actualDates.length !== 15 || new Set(actualDates).size !== 15) throw new Error(`${concept.slug}: incomplete programme`);
  await mkdir(path.join(destination, concept.slug), { recursive: true });
  await writeFile(path.join(destination, concept.slug, 'index.html'), html);
}

const cards = concepts.map(item => `<article class="concept"><a href="${base}${item.slug}/#week-one" class="concept-preview" aria-label="Посмотреть вариант ${item.title}"><img src="${base}previews/${item.slug}.png" width="1440" height="900" alt="Скриншот календаря ${item.title}"></a><div class="concept-caption"><p>${item.number} / 03</p><h2><a href="${base}${item.slug}/#week-one">${item.title}</a></h2><p>${item.description}</p></div></article>`).join('');
await writeFile(path.join(destination, 'index.html'), `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Три варианта календаря — Пыльные гантели</title><link rel="stylesheet" href="${release.base}direction/screen.css?v=${release.commit}"><link rel="stylesheet" href="${base}lab.css"></head><body class="calendar-lab"><header class="lab-header"><img src="${release.base}assets/bd7e17e9090f-Group_1486.svg" width="468" height="101" alt="DUSTY"><a href="${release.base}#program">Текущий календарь</a></header><main class="lab-home"><p class="lab-eyebrow">Программа · три локальных варианта</p><h1>Две недели.<br>Три настроения.</h1><p class="lab-lead">Один календарь, те же даты и занятия. Сравниваем масштаб, ритм и способ чтения.</p><div class="concepts">${cards}</div></main></body></html>`);
console.log(`Local calendar experiments: http://127.0.0.1:4173${base}`);
