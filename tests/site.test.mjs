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
import { season, schedule, photos } from "../site/content.js";

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

test("reading surfaces maintain at least 4.5:1 contrast for body, secondary text and accent in every phase", () => {
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

test("footer palettes keep readable white text across time and weather", () => {
  const luminance = (hex) =>
    hex
      .match(/[a-f0-9]{2}/gi)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const white = luminance("#f7f7f7");
  for (const scenario of ["actual", ...Object.keys(SCENARIOS)])
    for (let minutes = 0; minutes < 1440; minutes += 20) {
      const { css } = environmentAt({ date: now, minutes, scenario });
      for (const key of ["--footer-top", "--footer-bottom"])
        assert(
          (white + 0.05) / (luminance(css[key]) + 0.05) >= 4.5,
          `${scenario} ${minutes} ${key}`,
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
  assert(html.includes("Предварительная программа · 2027"));
  assert(html.includes("Набор на следующий сезон ещё не объявлен"));
  assert(!html.includes("#form"));
  assert(!html.includes("{{"));
  assert(html.includes('<p class="program-weekday">вторник</p>'));
  assert(html.includes(`href="${release.base}privacy/"`));
  for (const { date, events } of schedule) {
    assert(html.includes(`data-date="${date}"`));
    for (const [, title] of events) assert(html.includes(title));
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
