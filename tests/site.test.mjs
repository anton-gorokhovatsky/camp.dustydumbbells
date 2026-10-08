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
import { season, schedule, photos, photoUse } from "../site/content.js";

import { typograph } from "../site/typography.js";

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

test("complete programme, correct 2027 weekdays, meaningful links and local images exist without JavaScript", async () => {
  const html = await read("index.html");
  const release = JSON.parse(await read("release.json"));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.equal((html.match(/class="program-day"/g) || []).length, 15);
  assert(html.includes("Программа · 2027"));
  assert(!html.includes("#form"));
  assert(!html.includes("{{"));
  assert(html.includes('<p class="program-weekday">вторник</p>'));
  assert(html.includes(`href="${release.base}privacy/"`));
  for (const { date, events } of schedule) {
    assert(html.includes(`data-date="${date}"`));
    for (const [, title] of events) assert(html.replaceAll("\u00a0", " ").includes(title));
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, "IDs must be unique");
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
    assert(ids.includes(id), `Missing anchor ${id}`);
  for (const [, file] of html.matchAll(/(?:src|href)="\.\/([^"]+)"/g))
    assert((await stat(new URL(`../dist/${file}`, import.meta.url))).isFile());
  for (const photo of photos)
    assert(
      (await stat(new URL(`../dist/assets/${photo.file}`, import.meta.url)))
        .size > 100_000,
    );
  for (const [file, expected] of Object.entries(release.siteFiles)) {
    const bytes = await readFile(new URL(`../dist/${file}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
});

test("browser styles and the entire module graph use the publication revision", async () => {
  const release = JSON.parse(await read("release.json"));
  const references = [];
  for (const parent of ["index.html", "direction/index.html"]) {
    const html = await read(parent);
    const entries = [...html.matchAll(/(?:src|href)="(\.\/[^\"]+\.(?:css|js)\?[^\"]+)"/g)];
    assert.equal(entries.length, 2, `${parent}: styles and the entry module must be versioned`);
    references.push(...entries.map((match) => ({ reference: match[1], parent })));
  }
  for (const file of ["app.js", "environment.js", "direction/screen.js", "direction/forecast.js"]) {
    const imports = [...(await read(file)).matchAll(/\bfrom "(\.{1,2}\/[^\"]+)"/g)];
    assert(imports.length > 0);
    references.push(...imports.map((match) => ({ reference: match[1], parent: file })));
  }
  for (const { reference, parent } of references) {
    const url = new URL(reference, new URL(parent, release.site));
    assert.equal(url.searchParams.get("v"), release.commit, reference);
    assert((await stat(new URL(reference, new URL(`../dist/${parent}`, import.meta.url)))).isFile());
  }
  assert((await read("privacy/index.html")).includes(`privacy.css?v=${release.commit}`));
});


test("each archive photo has one placement on the authored page", async () => {
  const assigned = Object.values(photoUse).flat();
  assert.deepEqual([...assigned].sort((a, b) => a - b), photos.map((_, index) => index));
  const html = await read("index.html");
  const placed = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  // The first deck card is in HTML; the remaining cards are added by the module.
  placed.push(...photoUse.cover.slice(1).map(index => photos[index].file));
  for (const photo of photos) {
    assert.equal(placed.filter(src => src.endsWith(photo.file)).length, 1, photo.file);
  }
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
});
