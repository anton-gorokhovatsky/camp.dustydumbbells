import { getTimes, getPosition } from "./suncalc.js";

export const PLACE = Object.freeze({
  latitude: 36.864936,
  longitude: 30.642226,
  zone: "Europe/Istanbul",
  offset: 3,
});
export const clamp = (value, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));
const clockFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: PLACE.zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function placeClock(date = new Date()) {
  const parts = Object.fromEntries(
    clockFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
export function clockText(minutes) {
  const value = clamp(Math.round(minutes), 0, 1439);
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function localDate(day, minutes = 720) {
  return new Date(`${day}T${clockText(minutes)}:00+03:00`);
}
export function solarDay(date = new Date()) {
  const { day } = placeClock(date);
  const times = getTimes(
    localDate(day),
    PLACE.latitude,
    PLACE.longitude,
    0,
    PLACE.offset,
  );
  return {
    day,
    sunrise: placeClock(times.sunrise).minutes,
    sunset: placeClock(times.sunset).minutes,
    noon: placeClock(times.solarNoon).minutes,
  };
}

const palettes = {
  night: {
    footerTop: "#283752",
    footerBottom: "#102b3c",
    paper: "#152e3b",
    ink: "#f2eedf",
    muted: "#bed0d3",
    accent: "#ffb293",
    water: "#18394a",
    panel: "#1c3947",
    light: "#7796b3",
    tint: [9, 24, 55],
    brightness: 0.59,
    saturation: 0.74,
  },
  morning: {
    footerTop: "#884b43",
    footerBottom: "#2f586b",
    paper: "#efe6d4",
    ink: "#25434c",
    muted: "#4d6263",
    accent: "#a93625",
    water: "#718e91",
    panel: "#e3dac6",
    light: "#ffbd82",
    tint: [187, 105, 59],
    brightness: 1.04,
    saturation: 0.92,
  },
  day: {
    footerTop: "#b21818",
    footerBottom: "#1a4297",
    paper: "#e9e9d9",
    ink: "#183b41",
    muted: "#405953",
    accent: "#ad3424",
    water: "#477f81",
    panel: "#dde3d6",
    light: "#e6d58c",
    tint: [29, 90, 82],
    brightness: 1.06,
    saturation: 1.07,
  },
  evening: {
    footerTop: "#92432d",
    footerBottom: "#29365a",
    paper: "#ead4b9",
    ink: "#402d35",
    muted: "#684942",
    accent: "#932a23",
    water: "#946b67",
    panel: "#ddc3a7",
    light: "#f2985c",
    tint: [145, 54, 28],
    brightness: 0.89,
    saturation: 0.91,
  },
};
const rgb = (hex) =>
  hex.match(/[0-9a-f]{2}/gi).map((value) => parseInt(value, 16));
const mix = (left, right, amount) => left + (right - left) * amount;
const mixColor = (left, right, amount) =>
  `rgb(${rgb(left)
    .map((v, i) => Math.round(mix(v, rgb(right)[i], amount)))
    .join(" ")})`;
export const SCENARIOS = Object.freeze({
  clear: {
    clouds: 5,
    humidity: 35,
    precipitation: 0,
    wind: 1.8,
    direction: 230,
    temperature: 25,
    uv: 5,
    label: "Ясное небо · эскиз",
  },
  clouds: {
    clouds: 100,
    humidity: 78,
    precipitation: 0,
    wind: 3,
    direction: 180,
    temperature: 19,
    uv: 1,
    label: "Пасмурно · эскиз",
  },
  rain: {
    clouds: 100,
    humidity: 94,
    precipitation: 4,
    wind: 5,
    direction: 210,
    temperature: 17,
    uv: 0.3,
    label: "Дождь · эскиз",
  },
  wind: {
    clouds: 40,
    humidity: 65,
    precipitation: 0,
    wind: 13,
    direction: 285,
    temperature: 21,
    uv: 3,
    label: "Сильный ветер · эскиз",
  },
});
export function phaseFor(minutes, solar) {
  if (minutes < solar.sunrise - 25 || minutes > solar.sunset + 45)
    return "night";
  if (minutes < solar.sunrise + 110) return "morning";
  if (minutes > solar.sunset - 85) return "evening";
  return "day";
}
export const phaseLabels = {
  morning: "Свежее утро",
  day: "Солнце над морем",
  evening: "Золотой час",
  night: "Тихая ночь",
};

export function environmentAt({
  date = new Date(),
  minutes = null,
  weather = null,
  scenario = "actual",
} = {}) {
  const solar = solarDay(date);
  const minute =
    minutes === null ? placeClock(date).minutes : clamp(minutes, 0, 1439);
  const phase = phaseFor(minute, solar);
  const anchors = [
    [0, "night"],
    [solar.sunrise - 45, "night"],
    [solar.sunrise + 25, "morning"],
    [solar.sunrise + 150, "day"],
    [solar.sunset - 110, "day"],
    [solar.sunset - 12, "evening"],
    [solar.sunset + 65, "night"],
    [1440, "night"],
  ];
  const upper = anchors.findIndex(([time]) => time > minute);
  const [fromTime, fromPhase] = anchors[Math.max(0, upper - 1)];
  const [toTime, toPhase] = anchors[upper < 0 ? anchors.length - 1 : upper];
  const amount = clamp((minute - fromTime) / Math.max(1, toTime - fromTime));
  const smooth = amount * amount * (3 - 2 * amount);
  const left = palettes[fromPhase],
    right = palettes[toPhase];
  const selected = SCENARIOS[scenario] || weather;
  const clouds = (selected?.clouds ?? 0) / 100;
  const humidity = (selected?.humidity ?? 40) / 100;
  const rain = clamp((selected?.precipitation ?? 0) / 5);
  const altitude = getPosition(
    localDate(solar.day, minute),
    PLACE.latitude,
    PLACE.longitude,
  ).altitude;
  const sun = clamp(Math.sin((altitude * Math.PI) / 180));
  const uv =
    selected?.uv === null || selected?.uv === undefined
      ? sun
      : clamp(selected.uv / 7) * (minutes === null ? 1 : sun);
  const daylight = clamp(
    (minute - solar.sunrise) / (solar.sunset - solar.sunrise),
  );
  const darkness = 1 - clamp((altitude + 9) / 18);
  // Text surfaces switch as a pair. Continuous interpolation between light
  // and dark foregrounds/backgrounds would pass through unreadable mid-tones.
  const surface =
    phase === "night"
      ? palettes.night
      : phase === "evening"
        ? palettes.evening
        : phase === "morning"
          ? palettes.morning
          : palettes.day;
  const tint = left.tint.map((v, i) =>
    Math.round(mix(v, right.tint[i], smooth)),
  );
  const temperature = selected?.temperature ?? 22;
  const thermalStrength = clamp(Math.abs(temperature - 22) / 15) * 0.18;
  const thermalTint = temperature < 22 ? [170, 209, 226] : [255, 187, 126];
  const light = rgb(left.light).map((value, i) =>
    Math.round(
      mix(
        mix(value, rgb(right.light)[i], smooth),
        thermalTint[i],
        thermalStrength,
      ),
    ),
  );
  const footerColor = (key) =>
    "#" +
    rgb(left[key])
      .map((value, i) =>
        Math.round(
          mix(
            mix(value, rgb(right[key])[i], smooth),
            [57, 74, 85][i],
            clouds * 0.28 + rain * 0.1,
          ),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  return {
    solar,
    minute,
    phase,
    daylight,
    altitude,
    scenario,
    weather: selected,
    wind: selected?.wind ?? 1.5,
    direction: selected?.direction ?? 230,
    rain,
    css: {
      "--paper": surface.paper,
      "--ink": surface.ink,
      "--muted": surface.muted,
      "--accent": surface.accent,
      "--panel": surface.panel,
      "--footer-top": footerColor("footerTop"),
      "--footer-bottom": footerColor("footerBottom"),
      "--marquee-duration": `${Math.round(80 - clamp((selected?.wind ?? 1.5) / 15) * 40)}s`,
      "--water": mixColor(left.water, right.water, smooth),
      "--line":
        phase === "night" ? "rgba(224,238,231,.27)" : "rgba(30,53,50,.28)",
      "--light-color": `rgb(${light.join(" ")})`,
      "--light-x": `${Math.round(12 + daylight * 76)}%`,
      "--light-y": `${Math.round(70 - sun * 65)}%`,
      "--photo-saturation": (
        mix(left.saturation, right.saturation, smooth) -
        clouds * 0.24 +
        uv * 0.08
      ).toFixed(3),
      "--photo-brightness": (
        mix(left.brightness, right.brightness, smooth) -
        clouds * 0.12 -
        rain * 0.04
      ).toFixed(3),
      "--haze": (0.02 + humidity * 0.1 + clouds * 0.12).toFixed(3),
      "--rain": rain.toFixed(3),
      "--grain-opacity": (0.03 + humidity * 0.025).toFixed(3),
      "--sun-fill": `${((minute / 1439) * 100).toFixed(1)}%`,
      "--photo-overlay": `rgba(${tint.join(",")},${(0.08 + darkness * 0.19 + clouds * 0.12).toFixed(3)})`,
      "--scene-tint": `rgba(${tint.join(",")},${(0.08 + darkness * 0.2 + rain * 0.09).toFixed(3)})`,
    },
  };
}

const number = (value, min, max) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max
    ? value
    : null;
export function normalizeWeather(payload, now = new Date()) {
  const current = payload?.current;
  // This endpoint is requested in Europe/Istanbul; its ISO times are local.
  const stamp =
    typeof current?.time === "string"
      ? new Date(`${current.time}+03:00`)
      : new Date(NaN);
  const age = now.getTime() - stamp.getTime();
  if (
    !Number.isFinite(age) ||
    age > 2 * 60 * 60 * 1000 ||
    age < -30 * 60 * 1000
  )
    return null;
  const temperature = number(current.temperature_2m, -40, 55);
  const clouds = number(current.cloud_cover, 0, 100);
  const humidity = number(current.relative_humidity_2m, 0, 100);
  const wind = number(current.wind_speed_10m, 0, 80);
  const direction = number(current.wind_direction_10m, 0, 360);
  const precipitation = number(current.precipitation, 0, 300);
  if (
    [temperature, clouds, humidity, wind, direction, precipitation].some(
      (value) => value === null,
    )
  )
    return null;
  const hour = current.time.slice(0, 13) + ":00";
  const index = payload.hourly?.time?.indexOf(hour) ?? -1;
  const uv =
    index >= 0 ? number(payload.hourly?.uv_index?.[index], 0, 25) : null;
  return {
    temperature,
    clouds,
    humidity,
    wind,
    direction,
    precipitation,
    uv,
    stamp: stamp.toISOString(),
    time: current.time.slice(11, 16),
    code: number(current.weather_code, 0, 99),
  };
}
export function weatherLabel(weather) {
  if (!weather) return "Свет Антальи";
  if (weather.code >= 95) return "Гроза";
  if (weather.precipitation > 0 || (weather.code >= 51 && weather.code <= 82))
    return "Дождь";
  if (weather.code === 45 || weather.code === 48) return "Туман";
  return weather.clouds > 75
    ? "Пасмурно"
    : weather.clouds > 25
      ? "Переменная облачность"
      : "Ясно";
}
export function windDirection(degrees) {
  return ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"][
    Math.round(degrees / 45) % 8
  ];
}
export function weatherURL() {
  const query = new URLSearchParams({
    latitude: String(PLACE.latitude),
    longitude: String(PLACE.longitude),
    current:
      "temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m",
    hourly: "uv_index",
    timezone: PLACE.zone,
    wind_speed_unit: "ms",
    forecast_days: "1",
  });
  return `https://api.open-meteo.com/v1/forecast?${query}`;
}
