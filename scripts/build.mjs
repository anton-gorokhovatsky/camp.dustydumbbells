import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const site = new URL(process.env.SITE_URL || 'https://anton-gorokhovatsky.github.io/camp.dustydumbbells/');
const base = site.pathname.replace(/\/?$/, '/');
const manifest = JSON.parse(await readFile(path.join(root, 'source/manifest.json'), 'utf8'));
const assets = new Map(manifest.assets.map(asset => [asset.url, asset.file]));

function localize(text, css = false) {
  for (const [url, filename] of assets) {
    text = text.replaceAll(url, css ? `./${filename}` : `${base}assets/${filename}`);
  }
  return text;
}

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'assets'), { recursive: true });
await mkdir(path.join(output, 'privacy'), { recursive: true });
for (const asset of manifest.assets) {
  let data = await readFile(path.join(root, 'source/assets', asset.file));
  if (/\.(css|js)$/.test(asset.file)) {
    data = localize(data.toString(), asset.file.endsWith('.css'));
  }
  await writeFile(path.join(output, 'assets', asset.file), data);
}

const pageHashes = {};
for (const [input, target] of [['index.html', 'index.html'], ['privacy.html', 'privacy/index.html']]) {
  const original = await readFile(path.join(root, 'source/pages', input), 'utf8');
  pageHashes[input] = createHash('sha256').update(original).digest('hex');
  let html = localize(original);
  // Root-relative links need the project path on GitHub Pages.
  html = html.replace(/href=(['"])\/privacy\1/g, `href="${base}privacy/"`);
  html = html.replace(/href=(['"])\/(#.*?)?\1/g, (_, quote, anchor = '') => `href=${quote}${base}${anchor}${quote}`);
  await writeFile(path.join(output, target), html);
}

let commit = process.env.GITHUB_SHA || 'uncommitted';
if (commit === 'uncommitted') {
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
}
await writeFile(path.join(output, '.nojekyll'), '');
await writeFile(path.join(output, 'release.json'), JSON.stringify({
  commit, site: site.href, base, source: manifest.source,
  captured: manifest.captured, assets: manifest.assets.length, pageHashes,
}, null, 2) + '\n');
console.log(`Built 2 pages and ${manifest.assets.length} assets at ${base}`);
