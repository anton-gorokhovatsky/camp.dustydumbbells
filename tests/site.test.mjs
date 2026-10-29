import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  placeClock,
  solarDay,
  environmentAt,
  normalizeWeather,
  weatherURL,
  SCENARIOS,
} from "../dist/environment.js";
import { season, schedule } from "../site/content.js";

import { typograph, bindMeasurements } from "../site/typography.js";

const read = (file) =>
  readFile(new URL(`../dist/${file}`, import.meta.url), "utf8");
const now = new Date("2026-10-07T10:00:00Z");
const fixture = {
  current: {
    time: "2026-10-07T13:00",
    temperature_2m: 25,
    relative_humidity_2m: 54,
    cloud_cover: 30,
    wind_speed_10m: 4.2,
    wind_direction_10m: 215,
    precipitation: 0,
    weather_code: 2,
  },
  hourly: { time: ["2026-10-07T12:00", "2026-10-07T13:00"], uv_index: [4, 5] },
};

test("Antalya date follows its own zone, including across UTC midnight", () => {
  assert.deepEqual(placeClock(new Date("2027-10-11T22:15:00Z")), {
    day: "2027-10-12",
    minutes: 75,
  });
  assert.deepEqual(placeClock(new Date("2027-10-12T00:05:00Z")), {
    day: "2027-10-12",
    minutes: 185,
  });
});

test("solar day remains plausible for Antalya in winter and summer; local midnight keeps the correct day", () => {
  const winter = solarDay(new Date("2027-12-21T10:00:00Z"));
  const summer = solarDay(new Date("2027-06-21T10:00:00Z"));
  assert(winter.sunrise > 7 * 60 && winter.sunrise < 9 * 60);
  assert(
    winter.sunset - winter.sunrise > 9 * 60 &&
      winter.sunset - winter.sunrise < 11 * 60,
  );
  assert(
    summer.sunset - summer.sunrise > 14 * 60 &&
      summer.sunset - summer.sunrise < 15 * 60,
  );
  assert.equal(solarDay(new Date("2027-10-11T21:01:00Z")).day, "2027-10-12");
});

test("all day and weather states have finite values, distinct palettes and bounded effects", () => {
  const solar = solarDay(now);
  const values = [
    solar.sunrise + 35,
    solar.noon,
    solar.sunset - 12,
    solar.sunset + 150,
  ];
  assert.deepEqual(
    values.map((minutes) => environmentAt({ date: now, minutes }).phase),
    ["morning", "day", "evening", "night"],
  );
  assert.equal(
    new Set(
      values.map(
        (minutes) => environmentAt({ date: now, minutes }).css["--paper"],
      ),
    ).size,
    4,
  );
  for (const scenario of ["actual", ...Object.keys(SCENARIOS)]) {
    for (let minutes = 0; minutes < 1440; minutes += 7) {
      const state = environmentAt({ date: now, minutes, scenario });
      assert(state.daylight >= 0 && state.daylight <= 1);
      assert(state.rain >= 0 && state.rain <= 1);
      assert(!JSON.stringify(state).includes("NaN"));
      assert(Number(state.css["--photo-brightness"]) > 0.35);
    }
  }
});

test("opaque environment palette tokens retain 4.5:1 contrast in every phase", () => {
  const luminance = (hex) => {
    const rgb = hex
      .match(/[a-f0-9]{2}/gi)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const minutes of [0, 460, 780, 1090]) {
    const { css, phase } = environmentAt({ date: now, minutes });
    for (const foreground of ["--ink", "--muted", "--accent"])
      for (const background of ["--paper", "--panel"]) {
        const light = luminance(css[foreground]),
          dark = luminance(css[background]);
        const ratio =
          (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
        assert(ratio >= 4.5, `${phase} ${foreground}/${background}: ${ratio}`);
      }
  }
});

test("weather validates timestamp and metrics; missing, future, stale or malformed data is never presented as live", () => {
  assert.equal(normalizeWeather(fixture, now).wind, 4.2);
  assert.equal(normalizeWeather(fixture, now).uv, 5);
  assert.equal(normalizeWeather(fixture, now).stamp, now.toISOString());
  for (const payload of [
    null,
    {},
    { current: null },
    { ...fixture, current: { ...fixture.current, wind_speed_10m: null } },
    { ...fixture, current: { ...fixture.current, cloud_cover: 999 } },
  ])
    assert.equal(normalizeWeather(payload, now), null);
  assert.equal(
    normalizeWeather(fixture, new Date("2026-10-07T13:01:00Z")),
    null,
  );
  assert.equal(
    normalizeWeather(fixture, new Date("2026-10-07T08:00:00Z")),
    null,
  );
  const { hourly, ...withoutUV } = fixture;
  assert.equal(normalizeWeather(withoutUV, now).uv, null);
  const url = new URL(weatherURL());
  assert.equal(url.searchParams.get("wind_speed_unit"), "ms");
  assert.equal(url.searchParams.get("timezone"), "Europe/Istanbul");
});

test("environment signal tokens retain text contrast across time and weather", () => {
  const luminance = (hex) =>
    hex
      .match(/[a-f0-9]{2}/gi)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (const scenario of ["actual", ...Object.keys(SCENARIOS)])
    for (let minutes = 0; minutes < 1440; minutes += 20) {
      const { css } = environmentAt({ date: now, minutes, scenario });
      const ink = luminance(css["--signal-ink"]);
      const background = luminance(css["--signal"]);
      assert(
        (Math.max(ink, background) + 0.05) / (Math.min(ink, background) + 0.05) >= 4.5,
        `${scenario} ${minutes} action contrast`,
      );
    }
});

test("time and weather exploration never mutate the 2027 provisional programme", () => {
  const before = JSON.stringify({ season, schedule });
  for (const minutes of [0, 480, 720, 1120, 1439])
    environmentAt({ date: now, minutes, scenario: "rain" });
  assert.equal(JSON.stringify({ season, schedule }), before);
  assert.equal(season.status, "preliminary");
  assert.equal(season.registration, "unannounced");
  assert.equal(schedule.length, 15);
  assert.deepEqual(
    schedule.map((item) => item.date),
    Array.from({ length: 15 }, (_, index) => `2027-10-${index + 11}`),
  );
});

test("the main page keeps the user's complete original layout with the agreed 2027 season", async () => {
  const html = await read("index.html");
  const release = JSON.parse(await read("release.json"));
  assert.equal(release.layout, "original-tilda");
  assert.equal(release.season.year, 2027);
  assert.equal(release.season.registration, "unannounced");
  assert.equal(html, await read("direction/index.html"));
  assert.equal((html.match(/class="t547__item t-item"/g) || []).length, 15);
  for (const day of schedule) {
    const date = new Date(day.date + 'T12:00:00Z');
    const weekday = new Intl.DateTimeFormat('ru', {weekday:'long',timeZone:'UTC'}).format(date);
    assert(html.includes(`${weekday[0].toUpperCase()}${weekday.slice(1)}, ${date.getUTCDate()} октября`), day.date);
  }
  assert(html.includes('третий год подряд'));
  assert(/<h1\b[^>]*id="dd-title"/.test(html));
  assert(html.includes('12–25&nbsp;октября 2027'));
  assert(!html.includes('Прием заявок завершен'));
  assert(!html.includes('DDLong в&nbsp;воскресенье'));
  assert(html.includes(`<link rel="canonical" href="${release.site}"`));
  assert(html.includes(`<meta property="og:url" content="${release.site}"`));
  assert(html.includes(`<meta property="og:image" content="${new URL('media/dd-camp-social-2027.png',release.site).href}"`));
  assert(html.includes('<meta property="og:image:width" content="1200">'));
  assert(html.includes('<meta property="og:image:height" content="630">'));
  assert(html.includes('<meta name="twitter:card" content="summary_large_image">'));
  assert(html.includes('<title>DD Camp — Анталья, 12–25 октября 2027</title>'));
  assert.equal((html.match(/<link rel="canonical"/g)||[]).length,1);
  for(const file of ['branding/favicon.svg','branding/favicon-32.png','branding/favicon.ico','branding/apple-touch-icon.png','media/dd-camp-social-2027.png'])assert(release.siteFiles[file],file);
  const share=await readFile(new URL('../dist/media/dd-camp-social-2027.png',import.meta.url));
  assert.equal(share.readUInt32BE(16),1200);assert.equal(share.readUInt32BE(20),630);
  assert(html.includes('data-dd-map'));
  assert(html.includes('data-lat="36.863249" data-lng="30.63773"'));
  assert(!html.includes('api.mapbox.com'));
  assert(!html.includes('/map-widget/'));
  assert(!html.includes('t_appendYandexMap('));
  assert(html.includes(`href="${release.base}privacy/"`));
  for (const id of ['rec1016322141','rec2078762951','rec1017020466','rec2078794451']) {
    assert(html.includes(`id="${id}"`) && html.includes(`href="#${id}"`), id);
  }
  assert(!html.includes('data-memory-style="zine"') && !html.includes('data-travel-style="ticket"'));
  for (const [file, expected] of Object.entries(release.siteFiles)) {
    const bytes = await readFile(new URL(`../dist/${file}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
});

test("the original Tilda runtime uses local assets and retained modules keep their publication revision", async () => {
  const release = JSON.parse(await read("release.json"));
  for (const parent of ["index.html", "direction/index.html"]) {
    const html = await read(parent);
    const entries = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+\.(?:css|js)(?:\?[^"]*)?)"/g)];
    assert(entries.some(match => match[1].split('?')[0].endsWith('.css')));
    assert(entries.some(match => match[1].split('?')[0].endsWith('.js')));
    const signature='https://gorokhovatsky.tech/signature/v1/signature.js';
    assert.equal(entries.filter(match=>match[1]===signature).length,1);
    for (const entry of entries) {
      const reference=entry[1];
      if(reference===signature) {
        const tag=html.slice(entry.index,html.indexOf('>',entry.index)+1);
        assert(tag.startsWith('<script')&&tag.includes('type="module"')&&tag.includes('data-dd-signature'));
        continue;
      }
      assert(reference.startsWith(release.base), reference);
      const local = reference.slice(release.base.length).split('?')[0];
      assert(local.startsWith('assets/') || local.startsWith('media/hotels/') || ['application.css', 'application.js', 'navigation.css', 'navigation.js', 'camp-map.css', 'camp-map.js', 'refinement.css', 'cover-film.js', 'climate.css', 'camp-environment.js', 'accessibility.css', 'accessibility.js', 'phone-flags.css', 'body-type.css', 'photo-weather.css', 'track.css', 'track.js', 'photo-stacks.css', 'photo-stacks.js', 'hotel-previews.css', 'hotel-previews.js', 'poster.css', 'menu.css', 'menu-poster.js', 'poster-navigation.js'].includes(local), reference);
      assert((await stat(new URL(`../dist/${local}`,import.meta.url))).isFile());
    }
  }
  for (const file of Object.keys(release.siteFiles).filter(file => file.endsWith('.js'))) {
    const imports = [...(await read(file)).matchAll(/\bfrom (["'])(\.{1,2}\/[^"']+)\1/g)];
    for (const [,,reference] of imports) {
      const url = new URL(reference,new URL(file,release.site));
      assert.equal(url.searchParams.get('v'),release.commit);
      assert((await stat(new URL(reference,new URL(`../dist/${file}`,import.meta.url)))).isFile());
    }
  }
  assert((await read('privacy/index.html')).includes(`privacy.css?v=${release.commit}`));
});

test("the original and new archives keep every full-size source while stacks turn without zoom", async () => {
  const html = await read('index.html');
  const release = JSON.parse(await read('release.json'));
  const images = [...html.matchAll(/<img\b[^>]*class="t-img t1148__img"[^>]*>/g)].map(m=>m[0]);
  assert.equal(images.length,32);
  const sources=[...html.matchAll(/<img\b[^>]*data-(?:dd-photo-source|img-zoom-url)="([^"]+)"/g)].map(m=>m[1]);
  for(const image of images){
    assert(image.includes('role="button"') && image.includes('tabindex="0"'));
    assert(image.includes(image.includes('/media/camp-antalya-2026/')?'Кэмп в Анталье, 2026.':'Кэмп в Фетхие, 2025.'));
    assert(image.includes('data-dd-photo-source') || image.includes('data-dd-memory-photo'));
  }
  assert.equal((html.match(/data-zoomable="yes"/g)||[]).length,1,'Only the independent sunset retains full viewing.');
  assert.equal(new Set(sources).size,32);
  for(const source of new Set(sources)){
    assert(source.startsWith(release.base+'assets/')||source.startsWith(release.base+'media/camp-antalya-2026/'));
    assert((await stat(new URL(`../dist/${source.slice(release.base.length)}`,import.meta.url))).size>100_000);
  }
  for(const id of ['1016322141','1017020466']){
    assert(html.includes(`id="carousel_${id}"`));
    assert(html.includes(`aria-controls="carousel_${id}"`));
  }
});

test("original accommodation, navigation, weather copy and privacy destination remain intact", async () => {
  const html=await read('index.html');
  const release=JSON.parse(await read('release.json'));
  const hotels=JSON.parse(await readFile(new URL('../site/data/hotels.json',import.meta.url),'utf8'));
  for(const hotel of hotels)assert.equal(html.split(`href="${hotel.booking}"`).length-1,1,hotel.name);
  assert(html.includes('Погода в Анталье'));
  assert(html.includes('Коньяалты'));
  assert(html.includes('https://t.me/dusty_dumbbells'));
  assert(html.includes(`href="${release.base}privacy/"`));
  // The restored named anchor is a valid destination for every application link.
  assert(html.includes('href="#form"'));
  assert(html.includes('<a name="form"'));
  assert(html.includes('id="form1016216116"'));
  const privacy = await read('privacy/index.html');
  assert(privacy.includes(`href="${release.base}#form"`));
  assert(!privacy.includes('href="#form"'));
  assert(!html.includes('js-form-proccess') && !html.includes('name="formservices[]"'));
});

test("prose typography binds meaningful groups and is idempotent", () => {
  const samples = [
    ["И на море, и в горах", "И\u00a0на\u00a0море, и\u00a0в\u00a0горах"],
    ["12–25 октября; 15–20 км; 3,5 м/с", "12–25\u00a0октября; 15–20\u00a0км; 3,5\u00a0м/с"],
    ["DDLong — наша длительная пробежка...", "DDLong\u00a0— наша длительная пробежка…"],
    ["It costs 0.00 to be a nice camp 21+", "It costs 0.00 to be a nice camp 21+"],
  ];
  for (const [input, output] of samples) {
    assert.equal(typograph(input), output);
    assert.equal(typograph(output), output);
  }
  const ranges = [
    ["Днём 22-25 °C; 15-20 км", "Днём 22\u2060-\u206025\u00a0°C; 15\u2060-\u206020\u00a0км"],
    ["14–19°C, 3,5–5 м/с", "14\u2060–\u206019\u00a0°C, 3,5\u2060–\u20605\u00a0м/с"],
    ["22-25&nbsp;&deg;C", "22\u2060-\u206025\u00a0&deg;C"],
    ["12–25 октября 2027; 9:00; +7 (900) 000-00-00", "12–25 октября 2027; 9:00; +7 (900) 000-00-00"],
  ];
  for (const [input, output] of ranges) {
    assert.equal(bindMeasurements(input), output);
    assert.equal(bindMeasurements(output), output);
  }
});
