import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { adaptApplication } from './application-markup.mjs';
import { adaptPublication } from './season-markup.mjs';
import { adaptMap } from './map-markup.mjs';
import { adaptInterface } from './interface-markup.mjs';
import { adaptRefinement } from './refinement-markup.mjs';
import { adaptClimate } from './climate-markup.mjs';
import { adaptPrivacyAccessibility } from './accessibility-markup.mjs';

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(
  await readFile(path.join(root, "source/manifest.json"), "utf8"),
);
const release = JSON.parse(
  await readFile(path.join(root, "dist/release.json"), "utf8"),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const currentCapture = JSON.parse(await readFile(path.join(root, 'source/captures/2026-10-23/manifest.json'), 'utf8'));
let localReferences = 0;

for (const asset of manifest.assets) {
  const source = await readFile(path.join(root, "source/assets", asset.file));
  assert.equal(
    hash(source),
    asset.sha256,
    `Original asset changed: ${asset.file}`,
  );
  assert.equal(source.length, asset.bytes);
  const built = await readFile(path.join(root, "dist/assets", asset.file));
  assert(built.length > 0, `Empty output: ${asset.file}`);
  assert(
    !(built[0] === 0x1f && built[1] === 0x8b),
    `Unexpected gzip: ${asset.file}`,
  );
  if (!/\.(css|js)$/.test(asset.file)) assert.equal(hash(built), asset.sha256);
  if (asset.file.endsWith(".css")) {
    for (const match of built
      .toString()
      .matchAll(/url\(['"]?\.\/([^)'"\s]+)['"]?\)/g)) {
      assert((await stat(path.join(root, "dist/assets", match[1]))).isFile());
      localReferences++;
    }
  }
}

for (const asset of currentCapture.assets) {
  const folder = asset.origin === 'base' ? 'source/assets' : 'source/captures/2026-10-23/assets';
  const source = await readFile(path.join(root, folder, asset.file));
  assert.equal(hash(source), asset.sha256, `Capture asset changed: ${asset.file}`);
  assert.equal(source.length, asset.bytes);
  const built = await readFile(path.join(root, 'dist/assets', asset.file));
  assert(built.length > 0);
  if (!/\.(css|js)$/.test(asset.file)) assert.equal(hash(built), asset.sha256);
  if (asset.file.endsWith('.js')) new Function(built.toString());
}

const captureHtml = await readFile(path.join(root, 'source/captures/2026-10-23/index.html'), 'utf8');
assert.equal(hash(captureHtml), currentCapture.pageSha256);
for (const name of ['index.html', 'direction/index.html']) {
  assert.equal(await readFile(path.join(root, 'site', name), 'utf8'), captureHtml, `Selected original changed: ${name}`);
  let expected = captureHtml;
  for (const asset of currentCapture.assets) {
    expected = expected.replaceAll(asset.url, `${release.base}assets/${asset.file}`);
    if (captureHtml.includes(asset.url)) localReferences++;
  }
  expected = adaptApplication(adaptMap(adaptPublication(expected, release.site), release.base, encodeURIComponent(release.commit)), release.base, encodeURIComponent(release.commit))
    .replace(/href=(['"])\/privacy\1/g, `href="${release.base}privacy/"`)
    .replace(/href=(['"])\/(#.*?)?\1/g, (_, quote, anchor = '') => `href=${quote}${release.base}${anchor}${quote}`);
  expected = adaptInterface(expected, release.base, encodeURIComponent(release.commit));
  expected = adaptRefinement(expected, release.base, encodeURIComponent(release.commit));
  const built = await readFile(path.join(root, 'dist', name), 'utf8');
  assert.equal(built, expected, `Current source fidelity failed: ${name}`);
  assert(!built.includes('js-form-proccess'));
  assert(!built.includes('name="formservices[]"'));
  assert(built.includes('name="form"'));
  assert(built.includes('data-dd-application'));
  assert(built.includes('data-dd-map'));
  assert(!built.includes('t_appendYandexMap('), 'The public map must not call the keyless JS API');
}

for (const [sourceName, builtName] of [
  ["index.html", "original/index.html"],
  ["privacy.html", "privacy/index.html"],
]) {
  const source = await readFile(
    path.join(root, "source/pages", sourceName),
    "utf8",
  );
  const built = await readFile(path.join(root, "dist", builtName), "utf8");
  assert.equal(hash(source), release.pageHashes[sourceName]);
  assert(
    built.includes(`href="${release.base}privacy/"`),
    "Privacy must work under the Pages project path",
  );
  assert(!/href=['"]\/privacy['"]/.test(built));
  assert(
    !/<(?:script|img)[^>]*src=['"]https:\/\/[^'"]*tildacdn/.test(built),
    "Render assets should be local",
  );
  for (const asset of manifest.assets) {
    assert(!built.includes(asset.url), `Unlocalized resource: ${asset.url}`);
    if (built.includes(`${release.base}assets/${asset.file}`)) {
      assert((await stat(path.join(root, "dist/assets", asset.file))).isFile());
      localReferences++;
    }
  }
  // Reverse the URL migration and the documented narrow-screen title stylesheet.
  // This catches accidental changes to copy, layout, inline styles, or behavior.
  let restored = built;
  if (sourceName === "privacy.html") {
    const titleStyle = `<link rel="stylesheet" href="${release.base}privacy.css?v=${encodeURIComponent(release.commit)}" data-policy-title-wrap>`;
    assert(built.includes(titleStyle));
    restored = restored.replace(titleStyle, "");
    const refinementStyle = `<link rel="stylesheet" href="${release.base}refinement.css?v=${encodeURIComponent(release.commit)}" data-dd-refinement>`;
    assert(restored.includes(refinementStyle));
    restored = restored.replace(refinementStyle, '').replace(' data-dd-refinement="policy"', '');
    assert(built.includes(`href="${release.base}#form"`));
    assert(!/href=(['"])#form\1/.test(built), 'Privacy must link to the main-page form');
    restored = restored.replaceAll(`href="${release.base}#form"`, 'href="#form"');
  }
  for (const asset of manifest.assets)
    restored = restored.replaceAll(
      `${release.base}assets/${asset.file}`,
      asset.url,
    );
  restored = restored.replaceAll(
    `href="${release.base}privacy/"`,
    'href="/privacy"',
  );
  const pageBase =
    builtName === "original/index.html" ? `${release.base}original/` : release.base;
  const escapedBase = pageBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  restored = restored.replace(
    new RegExp(`href=(["'])${escapedBase}(#.*?)?\\1`, "g"),
    (_, quote, anchor = "") => `href=${quote}/${anchor}${quote}`,
  );
  assert.equal(
    hash(restored),
    hash(sourceName === 'privacy.html' ? adaptPrivacyAccessibility(adaptClimate(source, release.base, encodeURIComponent(release.commit)), release.base, encodeURIComponent(release.commit)) : source),
    `Source fidelity failed for ${sourceName}`,
  );
}

const main = await readFile(
  path.join(root, "dist/original/index.html"),
  "utf8",
);
assert.equal(
  (main.match(/class="t547__item t-item"/g) || []).length,
  15,
  "All 15 schedule days must remain",
);
assert.equal(
  (main.match(/class="t-img t1148__img"/g) || []).length,
  11,
  "Both galleries must retain all 11 images",
);
assert(main.includes("Прием заявок завершен"));
assert(main.includes("arMapMarkers2083039171"));
console.log(
  `Verified the restored form on both main routes, both frozen source pages, ${manifest.assets.length} base and ${currentCapture.assets.length} capture checksums, and ${localReferences} local references.`,
);
