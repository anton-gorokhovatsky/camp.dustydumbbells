import { PLACE, placeClock, weatherURL } from "../environment.js";

export function forecastURL() {
  const url = new URL(weatherURL());
  url.searchParams.set('current', `${url.searchParams.get('current')},apparent_temperature,wind_gusts_10m`);
  url.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max');
  return url.href;
}

const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
export function normalizeForecast(payload, now = new Date()) {
  const day = placeClock(now).day;
  const hourly = payload?.hourly;
  if (!Array.isArray(hourly?.time)) return null;
  const seen = new Set();
  const hours = hourly.time.flatMap((stamp, index) => {
    if (typeof stamp !== 'string' || !stamp.startsWith(`${day}T`) || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(stamp) || seen.has(stamp)) return [];
    seen.add(stamp);
    return [{
      time: stamp.slice(11),
      temperature: number(hourly.temperature_2m?.[index], -40, 55),
      feels: number(hourly.apparent_temperature?.[index], -60, 70),
      chance: number(hourly.precipitation_probability?.[index], 0, 100),
      precipitation: number(hourly.precipitation?.[index], 0, 300),
      wind: number(hourly.wind_speed_10m?.[index], 0, 80),
      direction: number(hourly.wind_direction_10m?.[index], 0, 360),
      gust: number(hourly.wind_gusts_10m?.[index], 0, 120),
      code: number(hourly.weather_code?.[index], 0, 99),
    }];
  }).sort((a, b) => a.time.localeCompare(b.time));
  if (!hours.some(hour => hour.temperature !== null)) return null;
  const daily = payload.daily;
  const index = daily?.time?.indexOf(day) ?? -1;
  return {
    day, hours,
    high: number(daily?.temperature_2m_max?.[index], -40, 55),
    low: number(daily?.temperature_2m_min?.[index], -40, 55),
    rain: number(daily?.precipitation_sum?.[index], 0, 1000),
    uv: number(daily?.uv_index_max?.[index], 0, 25),
    feels: number(payload.current?.apparent_temperature, -60, 70),
    gust: number(payload.current?.wind_gusts_10m, 0, 120),
  };
}

export function forecastCondition(code) {
  if (code === null) return 'Нет данных';
  if (code === 0) return 'Ясно';
  if (code <= 2) return 'Переменная облачность';
  if (code === 3) return 'Пасмурно';
  if ([45, 48].includes(code)) return 'Туман';
  if (code >= 51 && code <= 57) return 'Морось';
  if (code >= 61 && code <= 67) return 'Дождь';
  if (code >= 71 && code <= 77) return 'Снег';
  if (code >= 80 && code <= 82) return 'Ливень';
  if (code >= 85 && code <= 86) return 'Снег';
  if (code >= 95) return 'Гроза';
  return 'Нет данных';
}

export const dayText = date => new Intl.DateTimeFormat('ru', { day:'numeric', month:'long', timeZone:PLACE.zone }).format(date);
export const decimal = value => value === null ? '—' : new Intl.NumberFormat('ru', { maximumFractionDigits:1 }).format(value);
export const temperature = value => value === null ? '—' : `${Math.round(value) > 0 ? '+' : ''}${Math.round(value)}°`;
