import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { adaptApplication } from './application-markup.mjs';
import { adaptPublication } from './season-markup.mjs';
import { adaptMap } from './map-markup.mjs';
import { adaptInterface } from './interface-markup.mjs';
import { adaptRefinement, adaptPrivacyRefinement } from './refinement-markup.mjs';
import { season } from '../site/content.js';
import {composeHotelPreviews,hotelPreviewFiles} from './hotel-markup.mjs';
import {composePhotoCredits} from './photo-credits-markup.mjs';
import {composePoster} from './poster-markup.mjs';
import {composeMenuClarity} from './menu-markup.mjs';
import {composeMetadata} from './metadata-markup.mjs';
import {composeActivitySymbols} from './activity-markup.mjs';

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const site = new URL(
  process.env.SITE_URL ||
    "https://anton-gorokhovatsky.github.io/camp.dustydumbbells/",
);
const base = site.pathname.replace(/\/?$/, "/");
let commit = process.env.GITHUB_SHA || "uncommitted";
if (commit === "uncommitted") {
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {}
}
const assetVersion = encodeURIComponent(commit);
const mapboxPublicToken = process.env.DD_CAMP_MAPBOX_PUBLIC_TOKEN || '';
if (mapboxPublicToken && !/^pk\.[A-Za-z0-9._-]+$/.test(mapboxPublicToken)) {
  throw new Error('The production Mapbox public token has an invalid format.');
}
if (process.env.GITHUB_ACTIONS === 'true' && !mapboxPublicToken) {
  throw new Error('The production build needs DD_CAMP_MAPBOX_PUBLIC_TOKEN.');
}
const manifest = JSON.parse(
  await readFile(path.join(root, "source/manifest.json"), "utf8"),
);
const hotels = JSON.parse(await readFile(path.join(root, "site/data/hotels.json"), "utf8"));
const assets = new Map(manifest.assets.map((asset) => [asset.url, asset.file]));
const currentCapture = JSON.parse(await readFile(path.join(root, 'source/captures/2026-10-23/manifest.json'), 'utf8'));
const currentAssets = new Map(currentCapture.assets.map(asset => [asset.url, asset.file]));

function localize(text, css = false, registry = assets) {
  for (const [url, filename] of registry) {
    text = text.replaceAll(
      url,
      css ? `./${filename}` : `${base}assets/${filename}`,
    );
  }
  return text;
}

function localizeCaptureScript(text) {
  const mask = currentAssets.get('https://static.tildacdn.com/js/tilda-forms-custommask-1.0.min.js');
  const flags = currentAssets.get('https://static.tildacdn.com/lib/flags/flags7.png');
  return localize(text, false, currentAssets)
    .replace('"https://static.tildacdn."+t_forms__getRootZone()+"/js/tilda-forms-custommask-1.0.min.js"', JSON.stringify(`${base}assets/${mask}`))
    .replace(/https:\/\/static\.tildacdn\."\+t_form_phonemask_getRootZone\(\)\+'\/lib\/flags\/flags7\.png/g, `${base}assets/${flags}"+'`);
}

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "assets"), { recursive: true });
await mkdir(path.join(output, "privacy"), { recursive: true });
await mkdir(path.join(output, "original"), { recursive: true });
for (const asset of manifest.assets) {
  let data = await readFile(path.join(root, "source/assets", asset.file));
  if (/\.(css|js)$/.test(asset.file)) {
    data = localize(data.toString(), asset.file.endsWith(".css"));
  }
  await writeFile(path.join(output, "assets", asset.file), data);
}
for (const asset of currentCapture.assets.filter(asset => asset.origin === 'capture')) {
  let data = await readFile(path.join(root, 'source/captures/2026-10-23/assets', asset.file));
  if (asset.file.endsWith('.css')) data = localize(data.toString(), true, currentAssets);
  if (asset.file.endsWith('.js')) data = localizeCaptureScript(data.toString());
  await writeFile(path.join(output, 'assets', asset.file), data);
}

const pageHashes = {};
for (const [input, target] of [
  ["index.html", "original/index.html"],
  ["privacy.html", "privacy/index.html"],
]) {
  const original = await readFile(
    path.join(root, "source/pages", input),
    "utf8",
  );
  pageHashes[input] = createHash("sha256").update(original).digest("hex");
  let html = localize(original);
  // Root-relative links need the project path on GitHub Pages.
  html = html.replace(/href=(['"])\/privacy\1/g, `href="${base}privacy/"`);
  const pageBase = input === "index.html" ? `${base}original/` : base;
  html = html.replace(
    /href=(['"])\/(#.*?)?\1/g,
    (_, quote, anchor = "") => `href=${quote}${pageBase}${anchor}${quote}`,
  );
  if (input === "privacy.html") {
    html = html.replace(/href=(['"])#form\1/g,
      (_, quote) => `href=${quote}${base}#form${quote}`);
    html = html.replace(
      "</head>",
      `<link rel="stylesheet" href="${base}privacy.css?v=${assetVersion}" data-policy-title-wrap></head>`,
    );
    html = adaptPrivacyRefinement(html, base, assetVersion);
    html = composeMetadata(html,site,{path:'privacy/',title:'Политика конфиденциальности — DD Camp',description:'Обработка персональных данных при отправке заявки на кэмп «Пыльных гантелей».'});
  }
  await writeFile(path.join(output, target), html);
}

const siteFiles = {};
await mkdir(path.join(output, "fonts"), { recursive: true });
for (const file of await readdir(path.join(root, "site/fonts"))) {
  if (!/\.(woff2|txt)$/.test(file)) continue;
  const bytes = await readFile(path.join(root, "site/fonts", file));
  await writeFile(path.join(output, "fonts", file), bytes);
  siteFiles[`fonts/${file}`] = createHash("sha256").update(bytes).digest("hex");
}
for (const file of [
  "index.html",
  "privacy.css",
  "environment.js",
  "content.js",
  "typography.js",
  "application.js",
  "application-status.js",
  "application.css",
  "application-config.js",
  "application-validation.js",
  "form-widgets.js",
  "form-values.js",
  "phone-countries.js",
  "phone-flags.css",
  "accessibility.js",
  "accessibility.css",
  "navigation.css",
  "navigation.js",
  "action-wordmark.js",
  "poster.css",
  "menu-poster.js",
  "poster-navigation.js",
  "smooth-corners.js",
  "body-type.css",
  "photo-model.js",
  "photo-weather.js",
  "photo-weather.css",
  "photo-credits.css",
  "photo-stacks.css",
  "photo-stacks.js",
  "track.css",
  "track.js",
  "hotel-previews.css",
  "menu.css",
  "hotel-previews.js",
  "refinement.css",
  "cover-film.js",
  "camp-palette.js",
  "palette-colours.js",
  "camp-environment.js",
  "iconography.js",
  "climate.css",
  "camp-map.css",
  "camp-map.js",
  "map-policy.js",
  "map-palette.js",
  "mapbox-config.js",
  "mapbox-frame.js",
  "map.html",
  "data/currency.json",
  "direction/index.html",
  // Retained pure weather utilities have independent model tests; old UI is excluded.
  "direction/atmosphere.js",
  "direction/forecast.js",
]) {
  // The user's original page is the canonical layout on both local entry routes.
  const input = file === "direction/index.html" ? "index.html" : file;
  let content = await readFile(path.join(root, "site", input), "utf8");
  content = content
    .replaceAll("{{BASE}}", base)
    .replaceAll("{{SITE}}", site.href)
    .replaceAll("{{MAPBOX_PUBLIC_TOKEN}}", mapboxPublicToken);
  // Preserve the selected layout and apply the agreed season and independent form.
  if (file === 'index.html' || file === 'direction/index.html') {
    content = adaptApplication(adaptMap(adaptPublication(localize(content, false, currentAssets), site), base, assetVersion), base, assetVersion)
      .replace(/href=(['"])\/privacy\1/g, `href="${base}privacy/"`)
      .replace(/href=(['"])\/(#.*?)?\1/g,
        (_, quote, anchor = "") => `href=${quote}${base}${anchor}${quote}`);
    content = adaptInterface(content, base, assetVersion);
    content = adaptRefinement(content, base, assetVersion);
    content = composeHotelPreviews(content,base,hotels,assetVersion);
    content = composePoster(content,base,assetVersion);
    content = composeMenuClarity(content,base,assetVersion);
    content = composeActivitySymbols(content);
    content = composeMetadata(content,site);
  }
  if(file==='map.html')content=composeMetadata(content,site,{path:'map.html',title:'Карта Антальи — Коньяалты · DD Camp',description:'Район Коньяалты в Анталье — место кэмпа «Пыльных гантелей».'});
  // A new publication must also refresh cached styles and module dependencies.
  if (file.endsWith(".html")) {
    content = content.replace(
      /((?:src|href)="\.\/[^"?]+\.(?:css|js))"/g,
      `$1?v=${assetVersion}"`,
    );
  } else if (file.endsWith(".js")) {
    content = content.replace(
      /\bfrom (["'])(\.{1,2}\/[^"'?]+\.js)\1/g,
      (_, quote, source) => `from ${quote}${source}?v=${assetVersion}${quote}`,
    );
  }
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await writeFile(path.join(output, file), content);
  siteFiles[file] = createHash("sha256").update(content).digest("hex");
}
await mkdir(path.join(output, 'media'), {recursive: true});
await mkdir(path.join(output, 'icons'), {recursive: true});
for(const file of await readdir(path.join(root,'site/icons'))){
  if(!/^[a-z-]+\.(?:svg|txt|json)$/i.test(file))throw Error('Unexpected icon asset.');
  const bytes=await readFile(path.join(root,'site/icons',file));
  await writeFile(path.join(output,'icons',file),bytes);
  siteFiles[`icons/${file}`]=createHash('sha256').update(bytes).digest('hex');
}
await mkdir(path.join(output, 'branding'), {recursive: true});
for (const file of ['branding/favicon.svg','branding/favicon-32.png','branding/favicon.ico','branding/apple-touch-icon.png','media/dd-camp-social-2027.png']) {
  const bytes=await readFile(path.join(root,'site',file));
  await writeFile(path.join(output,file),bytes);
  siteFiles[file]=createHash('sha256').update(bytes).digest('hex');
}
for (const file of ['camp-2026.mp4', 'camp-2026-poster.jpg', 'menu-sea.webp', 'menu-stay.webp', 'antalya-after-storm.jpg', 'antalya-evening.jpg', 'antalya-sources.json', 'dd-menu-people.webp', 'dd-menu-training.webp', 'dd-menu-coast-run.webp']) {
  const bytes = await readFile(path.join(root, 'site/media', file));
  await writeFile(path.join(output, 'media', file), bytes);
  siteFiles[`media/${file}`] = createHash('sha256').update(bytes).digest('hex');
}
const trackSources=JSON.parse(await readFile(path.join(root,'site/media/antalya-sources.json'),'utf8'));
const campArchive=JSON.parse(await readFile(path.join(root,'site/data/camp-antalya-2026.json'),'utf8'));
await mkdir(path.join(output,'media/camp-antalya-2026'),{recursive:true});
for(const photo of campArchive.photos){
  if(!/^media\/camp-antalya-2026\/camp-antalya-2026-\d{2}\.webp$/.test(photo.file))throw Error('Unexpected camp photograph path.');
  const bytes=await readFile(path.join(root,'site',photo.file));
  const hash=createHash('sha256').update(bytes).digest('hex');
  if(hash!==photo.sha256)throw Error('A camp photograph no longer matches its recorded source export.');
  await writeFile(path.join(output,photo.file),bytes);
  siteFiles[photo.file]=hash;
}
await mkdir(path.join(output,'photographs'),{recursive:true});
const photoCredits=composeMetadata(composePhotoCredits(trackSources,base,assetVersion,campArchive),site,{path:'photographs/',title:'Фотографии — DD Camp',description:'Фотографы и источники снимков Антальи на сайте кэмпа «Пыльных гантелей».'});
await writeFile(path.join(output,'photographs/index.html'),photoCredits);
siteFiles['photographs/index.html']=createHash('sha256').update(photoCredits).digest('hex');
for(const source of trackSources){
  if(siteFiles[source.file])continue;
  if(!/^media\/antalya-[A-Za-z0-9_-]+\.webp$/.test(source.file))throw Error('Unexpected place photograph path.');
  const bytes=await readFile(path.join(root,'site',source.file));
  await writeFile(path.join(output,source.file),bytes);
  siteFiles[source.file]=createHash('sha256').update(bytes).digest('hex');
}
const hotelImages = hotels.flatMap(hotel => hotel.photos.map(photo => photo.file));
if (new Set(hotelImages).size !== hotelImages.length) throw new Error("Hotel photographs must have unique placements");
await mkdir(path.join(output,'media/hotels'),{recursive:true});
for(const file of hotelPreviewFiles){
  const bytes=await readFile(path.join(root,'site/direction/media/hotels',file));
  await writeFile(path.join(output,'media/hotels',file),bytes);
  siteFiles[`media/hotels/${file}`]=createHash('sha256').update(bytes).digest('hex');
}
for (const [source, file] of [
  ["index.js", "suncalc.js"],
  ["LICENSE", "suncalc-LICENSE.txt"],
]) {
  const bytes = await readFile(path.join(root, "node_modules/suncalc", source));
  await writeFile(path.join(output, file), bytes);
  siteFiles[file] = createHash("sha256").update(bytes).digest("hex");
}

await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(
  path.join(output, "release.json"),
  JSON.stringify(
    {
      commit,
      site: site.href,
      base,
      source: currentCapture.source,
      captured: currentCapture.captured,
      assets: new Set([...manifest.assets, ...currentCapture.assets].map(asset => asset.file)).size,
      pageHashes,
      currentPageHash: currentCapture.pageSha256,
      layout: "original-tilda",
      season,
      original: `${base}original/`,
      siteFiles,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Built the original DD Camp layout with the restored application form at ${base}`,
);
