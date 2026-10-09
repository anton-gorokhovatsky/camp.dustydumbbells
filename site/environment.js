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
    paper: "#1b2420",
    ink: "#f3f1e5",
    muted: "#c0c9b9",
    accent: "#dbe59b",
    signal: "#dbe59b",
    water: "#294943",
    panel: "#26322b",
    light: "#a7bfa2",
    tint: [12, 34, 94],
    brightness: 0.78,
    saturation: 0.99,
  },
  morning: {
    paper: "#f5f0df",
    ink: "#232b22",
    muted: "#565d4c",
    accent: "#64542c",
    signal: "#efc487",
    water: "#718e91",
    panel: "#e9e4d3",
    light: "#ffbd82",
    tint: [232, 145, 82],
    brightness: 1.04,
    saturation: 1.05,
  },
  day: {
    paper: "#f3f2e9",
    ink: "#222a25",
    muted: "#51594c",
    accent: "#3d594a",
    signal: "#dbe59b",
    water: "#789ca2",
    panel: "#e7eadc",
    light: "#e6d58c",
    tint: [25, 114, 163],
    brightness: 1.06,
    saturation: 1.07,
  },
  evening: {
    paper: "#f4e5ce",
    ink: "#3b2924",
    muted: "#695042",
    accent: "#843e24",
    signal: "#f5bd86",
    water: "#946b67",
    panel: "#edd7bc",
    light: "#f2985c",
    tint: [211, 91, 37],
    brightness: 0.99,
    saturation: 1.08,
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

// WMO conditions describe the current phenomenon even when the precipitation
// interval is zero. Strengths below are bounded artistic responses, not mm/h.
export function weatherEffects(weather) {
  const code = weather?.code;
  const snowCodes = [71, 73, 75, 77, 85, 86];
  const rainfall = new Map([[51,.12],[53,.22],[55,.32],[56,.18],[57,.35],
    [61,.22],[63,.5],[65,.8],[66,.3],[67,.65],[80,.35],[81,.65],[82,.9],
    [95,.65],[96,.85],[99,.9]]);
  const precipitation = clamp((weather?.precipitation ?? 0) / 5);
  const snowing = snowCodes.includes(code);
  const rain = snowing ? 0 : Math.max(precipitation, rainfall.get(code) ?? 0);
  const snow = snowing ? Math.max(precipitation, [75,86].includes(code) ? .8 : .3) : 0;
  const fog = code === 45 ? .65 : code === 48 ? .9 : 0;
  const clouds = Math.max(clamp((weather?.clouds ?? 0) / 100), code === 3 ? .8 : 0);
  const wind = Math.min(24, weather?.wind ?? 1.5);
  const gust = Math.max(wind, Math.min(30, weather?.gust ?? wind));
  const direction = weather?.direction ?? 230;
  // The meteorological bearing says where the wind comes from.
  const drift = -Math.sin(direction * Math.PI / 180);
  return { rain, snow, fog, clouds, wind, gust, direction, drift };
}

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
  const effects = weatherEffects(selected);
  const clouds = effects.clouds;
  const humidity = (selected?.humidity ?? 40) / 100;
  const rain = effects.rain;
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
  return {
    solar,
    minute,
    phase,
    daylight,
    altitude,
    scenario,
    weather: selected,
    effects,
    wind: effects.wind,
    direction: effects.direction,
    rain,
    css: {
      "--paper": surface.paper,
      "--ink": surface.ink,
      "--muted": surface.muted,
      "--accent": surface.accent,
      "--signal": surface.signal,
      "--signal-ink": "#222a25",
      "--panel": surface.panel,
      "--water": mixColor(left.water, right.water, smooth),
      "--line":
        phase === "night" ? "rgba(224,238,231,.27)" : "rgba(30,53,50,.28)",
      "--light-color": `rgb(${light.join(" ")})`,
      "--light-x": `${Math.round(12 + daylight * 76)}%`,
      "--light-y": `${Math.round(70 - sun * 65)}%`,
      "--photo-saturation": (
        mix(left.saturation, right.saturation, smooth) -
        clouds * 0.2 +
        uv * 0.04
      ).toFixed(3),
      "--photo-brightness": (
        mix(left.brightness, right.brightness, smooth) -
        clouds * 0.12 -
        rain * 0.045
      ).toFixed(3),
      "--haze": (0.015 + humidity * 0.025 + clouds * 0.035 + effects.fog * .07).toFixed(3),
      "--sun-opacity": (phase === 'night' ? 0 : .5 * (1 - clouds * .88) * (1 - effects.fog * .8)).toFixed(3),
      "--cloud-veil": (clouds * .16 * (phase === 'night' ? .45 : 1)).toFixed(3),
      "--fog-veil": (effects.fog * .3).toFixed(3),
      "--rain": rain.toFixed(3),
      "--grain-opacity": (0.015 + humidity * 0.012).toFixed(3),
      "--sun-fill": `${((minute / 1439) * 100).toFixed(1)}%`,
      "--photo-overlay": `rgba(${tint.join(",")},${(0.03 + darkness * 0.12 + clouds * 0.03).toFixed(3)})`,
      "--scene-tint": `rgba(${tint.join(",")},${(0.04 + darkness * 0.15 + rain * 0.035).toFixed(3)})`,
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
    gust: number(current.wind_gusts_10m, 0, 120),
  };
}
export function weatherLabel(weather) {
  if (!weather) return "Свет Антальи";
  if (weather.code >= 95) return "Гроза";
  if ([71,73,75,77,85,86].includes(weather.code)) return "Снег";
  if ([51,53,55,56,57].includes(weather.code)) return "Морось";
  if (weather.precipitation > 0 || [61,63,65,66,67,80,81,82].includes(weather.code))
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
