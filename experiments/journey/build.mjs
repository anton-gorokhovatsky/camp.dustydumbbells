// A retained local comparison. The ordinary Pages build does not invoke it.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const output = new URL('../../dist/experiments/journey/', import.meta.url);
const release = JSON.parse(await readFile(new URL('../../dist/release.json', import.meta.url), 'utf8'));
const html = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
await mkdir(output, { recursive: true });
await copyFile(new URL('./light.css', import.meta.url), new URL('./light.css', output));
const page = html.replaceAll('./direction/', `${release.base}direction/`)
  .replace('class="running-guide" data-guide-style="ticket"', 'class="running-guide" data-guide-style="ticket" data-guide-mode="topics"')
  .replace('</head>', '<meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="./light.css"></head>')
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Светлый вариант продолжения — локальное сравнение</title>');
await writeFile(new URL('./index.html', output), page);
console.log(`Local comparison: http://127.0.0.1:4173${release.base}experiments/journey/#memories`);
