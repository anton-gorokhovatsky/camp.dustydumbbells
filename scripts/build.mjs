import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { schedule, photos, season } from "../site/content.js";
import { typograph } from "../site/typography.js";

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
const manifest = JSON.parse(
  await readFile(path.join(root, "source/manifest.json"), "utf8"),
);
const assets = new Map(manifest.assets.map((asset) => [asset.url, asset.file]));

function localize(text, css = false) {
  for (const [url, filename] of assets) {
    text = text.replaceAll(
      url,
      css ? `./${filename}` : `${base}assets/${filename}`,
    );
  }
  return text;
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
    html = html.replace(
      "</head>",
      `<link rel="stylesheet" href="${base}privacy.css?v=${assetVersion}" data-policy-title-wrap></head>`,
    );
  }
  await writeFile(path.join(output, target), html);
}

const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const weekday = new Intl.DateTimeFormat("ru", {
  weekday: "long",
  timeZone: "Europe/Istanbul",
});
const programDays = schedule
  .map(({ date, events }) => {
    const day = Number(date.slice(-2));
    const dateHeading = day === 11 ? "h3" : "h4";
    const rest = events.some(([, title]) => title.startsWith("День отдыха"));
    const rows = events
      .map(
        ([time, title]) =>
          `<li>${time ? `<time datetime="${date}T${time}:00+03:00">${time}</time>` : "<time></time>"}<span>${escapeHTML(title)}</span></li>`,
      )
      .join("");
    return `<article class="program-day" data-date="${date}" data-rest="${rest}"><div class="program-date-group"><${dateHeading} class="program-date"><time datetime="${date}"><b>${day}</b><span>октября</span></time></${dateHeading}><p class="program-weekday">${weekday.format(new Date(`${date}T12:00:00+03:00`))}</p></div><ul class="program-events">${rows}</ul></article>`;
  });
const program = `<div class="program-arrival">${programDays[0]}</div><div class="program-weeks"><section class="program-week" aria-labelledby="week-one"><h3 class="week-heading" id="week-one"><span class="week-label">Первая неделя</span><span class="week-period"><span class="date-range">12–18</span> октября</span></h3><div class="week-days">${programDays.slice(1, 8).join("\n")}</div></section><section class="program-week" aria-labelledby="week-two"><h3 class="week-heading" id="week-two"><span class="week-label">Вторая неделя</span><span class="week-period"><span class="date-range">19–25</span> октября</span></h3><div class="week-days">${programDays.slice(8).join("\n")}</div></section></div>`;
const gallery = [9, 4, 10, 3, 5]
  .map((index, order) => {
    const photo = photos[index];
    return `<figure class="photo"><a href="${base}assets/${photo.file}" data-photo="${index}" aria-label="Увеличить: ${escapeHTML(photo.alt)}"><img src="${base}assets/${photo.file}" alt="${escapeHTML(photo.alt)}" width="${index === 5 ? 893 : 1680}" height="${index === 5 ? 1339 : 2520}" loading="lazy"><span class="photo-zoom" aria-hidden="true">↗</span></a><figcaption>${String(order + 3).padStart(2, "0")} — ${["Горы над побережьем", "Свои люди у воды", "Мачты, лодки, море", "Обратно по набережной", "До темноты"][order]}</figcaption></figure>`;
  })
  .join("\n");

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
  "styles.css",
  "privacy.css",
  "app.js",
  "environment.js",
  "content.js",
  "typography.js",
  "direction/index.html",
  "direction/screen.css",
  "direction/program-poster.css",
  "direction/screen.js",
  "direction/forecast.js",
]) {
  // Both local review routes use the same page, so the accepted cover cannot drift.
  const input = file === "direction/index.html" ? "index.html" : file;
  let content = await readFile(path.join(root, "site", input), "utf8");
  if (file === "direction/index.html") content = content.replaceAll('./direction/', './');
  content = content
    .replaceAll("{{BASE}}", base)
    .replaceAll("{{SITE}}", site.href)
    .replace("{{SCHEDULE}}", program)
    .replace("{{GALLERY}}", gallery);
  // Only text nodes in the authored page; preserved original and attributes stay intact.
  if (file === 'index.html' || file === 'direction/index.html') {
    content = content.split(/(<[^>]+>)/g).map(part => part.startsWith('<') ? part : typograph(part)).join('');
  }
  // A new publication must also refresh cached styles and module dependencies.
  if (file.endsWith(".html")) {
    content = content.replace(
      /((?:src|href)="\.\/[^"?]+\.(?:css|js))"/g,
      `$1?v=${assetVersion}"`,
    );
  } else if (file.endsWith(".js")) {
    content = content.replace(
      /\bfrom "(\.{1,2}\/[^"?]+\.js)"/g,
      `from "$1?v=${assetVersion}"`,
    );
  }
  await mkdir(path.dirname(path.join(output, file)), { recursive: true });
  await writeFile(path.join(output, file), content);
  siteFiles[file] = createHash("sha256").update(content).digest("hex");
}
await mkdir(path.join(output, "direction/media"), { recursive: true });
for (const file of await readdir(path.join(root, "site/direction/media"))) {
  const bytes = await readFile(path.join(root, "site/direction/media", file));
  await writeFile(path.join(output, "direction/media", file), bytes);
  siteFiles[`direction/media/${file}`] = createHash("sha256").update(bytes).digest("hex");
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
      source: manifest.source,
      captured: manifest.captured,
      assets: manifest.assets.length,
      pageHashes,
      season,
      original: `${base}original/`,
      siteFiles,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Built the 2027 site, original, privacy and ${manifest.assets.length} original assets at ${base}`,
);
