import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { schedule, photos, season } from "../site/content.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
const site = new URL(
  process.env.SITE_URL ||
    "https://anton-gorokhovatsky.github.io/camp.dustydumbbells/",
);
const base = site.pathname.replace(/\/?$/, "/");
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
      `<link rel="stylesheet" href="${base}privacy.css" data-policy-title-wrap></head>`,
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
const program = schedule
  .map(({ date, events }) => {
    const day = Number(date.slice(-2));
    const rest = events.some(([, title]) => title.startsWith("День отдыха"));
    const rows = events
      .map(
        ([time, title]) =>
          `<li>${time ? `<time datetime="${date}T${time}:00+03:00">${time}</time>` : "<time></time>"}<span>${escapeHTML(title)}</span></li>`,
      )
      .join("");
    return `<article class="program-day" data-date="${date}" data-rest="${rest}"><h3 class="program-date"><time datetime="${date}"><b>${day}</b><span>октября</span></time></h3><p class="program-weekday">${weekday.format(new Date(`${date}T12:00:00+03:00`))}</p><ul class="program-events">${rows}</ul></article>`;
  })
  .join("\n");
const gallery = [9, 3, 5]
  .map((index, order) => {
    const photo = photos[index];
    return `<figure class="photo"><a href="${base}assets/${photo.file}" data-photo="${index}" aria-label="Увеличить: ${escapeHTML(photo.alt)}"><img src="${base}assets/${photo.file}" alt="${escapeHTML(photo.alt)}" width="${index === 5 ? 893 : 1680}" height="${index === 5 ? 1339 : 2520}" loading="lazy"><span class="photo-zoom" aria-hidden="true">↗</span></a><figcaption>${String(order + 2).padStart(2, "0")} — ${["Выше моря", "По пути", "До темноты"][order]}</figcaption></figure>`;
  })
  .join("\n");

const siteFiles = {};
const originalHTML = await readFile(
  path.join(root, "source/pages/index.html"),
  "utf8",
);
const footerSocials = [
  ["website", "https://dustydumbbells.com/", "Сайт Пыльных Гантелей"],
  ["telegram", "https://t.me/dusty_dumbbells", "Сообщество DD в Telegram"],
]
  .map(([kind, url, label]) => {
    const fragment = originalHTML.match(
      new RegExp(
        `<li class="t-sociallinks__item t-sociallinks__item_${kind}">([\\s\\S]*?)</li>`,
      ),
    )?.[1];
    const svg = fragment?.match(/<svg[\s\S]*?<\/svg>/)?.[0];
    if (!svg) throw new Error(`Missing original ${kind} footer icon`);
    return `<a href="${url}" target="_blank" rel="noreferrer" aria-label="${label}">${svg}</a>`;
  })
  .join("");
for (const file of [
  "index.html",
  "styles.css",
  "privacy.css",
  "app.js",
  "environment.js",
  "content.js",
]) {
  let content = await readFile(path.join(root, "site", file), "utf8");
  content = content
    .replaceAll("{{BASE}}", base)
    .replaceAll("{{SITE}}", site.href)
    .replace("{{SCHEDULE}}", program)
    .replace("{{GALLERY}}", gallery)
    .replace("{{FOOTER_SOCIALS}}", footerSocials);
  await writeFile(path.join(output, file), content);
  siteFiles[file] = createHash("sha256").update(content).digest("hex");
}
for (const [source, file] of [
  ["index.js", "suncalc.js"],
  ["LICENSE", "suncalc-LICENSE.txt"],
]) {
  const bytes = await readFile(path.join(root, "node_modules/suncalc", source));
  await writeFile(path.join(output, file), bytes);
  siteFiles[file] = createHash("sha256").update(bytes).digest("hex");
}

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
