import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'source/manifest.json'), 'utf8'));
const release = JSON.parse(await readFile(path.join(root, 'dist/release.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let localReferences = 0;

for (const asset of manifest.assets) {
  const source = await readFile(path.join(root, 'source/assets', asset.file));
  assert.equal(hash(source), asset.sha256, `Original asset changed: ${asset.file}`);
  assert.equal(source.length, asset.bytes);
  const built = await readFile(path.join(root, 'dist/assets', asset.file));
  assert(built.length > 0, `Empty output: ${asset.file}`);
  assert(!(built[0] === 0x1f && built[1] === 0x8b), `Unexpected gzip: ${asset.file}`);
  if (!/\.(css|js)$/.test(asset.file)) assert.equal(hash(built), asset.sha256);
  if (asset.file.endsWith('.css')) {
    for (const match of built.toString().matchAll(/url\(['"]?\.\/([^)'"\s]+)['"]?\)/g)) {
      assert((await stat(path.join(root, 'dist/assets', match[1]))).isFile());
      localReferences++;
    }
  }
}

for (const [sourceName, builtName] of [['index.html', 'index.html'], ['privacy.html', 'privacy/index.html']]) {
  const source = await readFile(path.join(root, 'source/pages', sourceName), 'utf8');
  const built = await readFile(path.join(root, 'dist', builtName), 'utf8');
  assert.equal(hash(source), release.pageHashes[sourceName]);
  assert(built.includes(`href="${release.base}privacy/"`), 'Privacy must work under the Pages project path');
  assert(!/href=['"]\/privacy['"]/.test(built));
  assert(!/<(?:script|img)[^>]*src=['"]https:\/\/[^'"]*tildacdn/.test(built), 'Render assets should be local');
  for (const asset of manifest.assets) {
    assert(!built.includes(asset.url), `Unlocalized resource: ${asset.url}`);
    if (built.includes(`${release.base}assets/${asset.file}`)) {
      assert((await stat(path.join(root, 'dist/assets', asset.file))).isFile());
      localReferences++;
    }
  }
  // Reversing the URL-only migration must reproduce the entire source document.
  // This catches accidental changes to copy, layout, inline styles, or behavior.
  let restored = built;
  for (const asset of manifest.assets) restored = restored.replaceAll(`${release.base}assets/${asset.file}`, asset.url);
  restored = restored.replaceAll(`href="${release.base}privacy/"`, 'href="/privacy"');
  const escapedBase = release.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  restored = restored.replace(new RegExp(`href=(["'])${escapedBase}(#.*?)?\\1`, 'g'), (_, quote, anchor = '') => `href=${quote}/${anchor}${quote}`);
  assert.equal(hash(restored), hash(source), `Source fidelity failed for ${sourceName}`);
}

const main = await readFile(path.join(root, 'dist/index.html'), 'utf8');
assert.equal((main.match(/class="t547__item t-item"/g) || []).length, 15, 'All 15 schedule days must remain');
assert.equal((main.match(/class="t-img t1148__img"/g) || []).length, 11, 'Both galleries must retain all 11 images');
assert(main.includes('Прием заявок завершен'));
assert(main.includes('arMapMarkers2083039171'));
console.log(`Verified 2 source-identical pages, ${manifest.assets.length} asset checksums and ${localReferences} local references.`);
