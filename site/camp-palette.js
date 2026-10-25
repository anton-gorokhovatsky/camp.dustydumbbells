import { getPosition } from './suncalc.js';
import { PLACE, solarDay, placeClock, weatherEffects, clamp } from './environment.js';
import { channels, mix, luminance, contrast } from './palette-colours.js';
export { mix, contrast } from './palette-colours.js';
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Preserve DD's two pigment roles. The sun supplies the progression, while the
// colours themselves are an artistic interpretation of the coast, not readings.
const pigments = {
  morning: { page: '#f4dfc9', blue: '#23458d', red: '#ac2835', band: '#a32937', deep: '#253e75' },
  day: { page: '#e0ecea', blue: '#1a4297', red: '#b21818', band: '#b21818', deep: '#1a4297' },
  evening: { page: '#f0c6a5', blue: '#2c427d', red: '#9b2935', band: '#9b2935', deep: '#283658' },
  night: { page: '#14243e', blue: '#a5caff', red: '#f59b8d', band: '#642b41', deep: '#0d1d3b' },
};

// A pigment is corrected toward the same light/dark ink as its surface. Check
// every actual surface in the family, including the extremes behind the glass.
function readable(pigment, surfaces, lightInk, minimum = 4.5) {
  const limit = lightInk ? '#ffffff' : '#000000';
  for (let step = 0; step <= 100; step++) {
    const colour = mix(pigment, limit, step / 100);
    if (surfaces.every(surface => contrast(colour, surface) >= minimum)) return colour;
  }
  return null;
}
function textFamily(surfaces, blue, red) {
  const darkRatio = Math.min(...surfaces.map(surface => contrast('#000000', surface)));
  const lightRatio = Math.min(...surfaces.map(surface => contrast('#ffffff', surface)));
  const lightInk = lightRatio > darkRatio;
  const ink = readable(lightInk ? '#f5f0e5' : '#202b35', surfaces, lightInk);
  if (!ink) return null;
  return {
    ink,
    muted: readable(mix(ink, surfaces[0], .28), surfaces, lightInk),
    blue: readable(blue, surfaces, lightInk),
    red: readable(red, surfaces, lightInk),
    lightInk,
  };
}

export function campPalette({ date = new Date(), weather = null } = {}) {
  const sun = getPosition(date, PLACE.latitude, PLACE.longitude);
  const solar = solarDay(date);
  const { minutes } = placeClock(date);
  const rising = minutes < solar.noon;
  const horizon = pigments[rising ? 'morning' : 'evening'];
  const daylight = ease((sun.altitude + 8) / 10);
  const highSun = ease((sun.altitude - 2) / 22);
  const effects = weatherEffects(weather);
  const overcast = clamp(effects.clouds * .46 + effects.rain * .16 + effects.fog * .2 + effects.snow * .12, 0, .72);
  const values = Object.fromEntries(Object.keys(pigments.day).map(role => [role,
    mix(pigments.night[role], mix(horizon[role], pigments.day[role], highSun), daylight),
  ]));
  const isDark = luminance(values.page) < .19;
  const weatherCast = isDark ? '#263b50' : '#c3d2da';
  values.page = mix(values.page, weatherCast, overcast);
  if (Number.isFinite(weather?.temperature)) {
    values.page = mix(values.page, weather.temperature > 22 ? '#f2c89f' : '#a8d3e4',
      clamp(Math.abs(weather.temperature - 22) / 25) * .05 * daylight);
  }
  values.blue = mix(values.blue, isDark ? '#b9cedd' : '#425a7b', overcast * .38);
  values.red = mix(values.red, isDark ? '#d9b8bb' : '#88404c', overcast * .28);
  values.band = mix(values.band, '#513345', overcast * .4);
  values.deep = mix(values.deep, '#293e55', overcast * .32);
  let surface = mix(values.page, isDark ? '#b0c6e1' : '#ffffff', .025);
  let text = textFamily([values.page, surface], values.blue, values.red);
  if (!text) {
    surface = values.page;
    text = textFamily([surface], values.blue, values.red);
  }

  // One raised matte plane for menu, burger and movie controls. A continuous
  // lift separates it from flat page fields as well as from moving footage.
  const matteColour = mix(surface, '#fff6ec', .04 + .12 * (1 - daylight));
  let matteAlpha = .76;
  let matteSurfaces;
  let matte;
  for (; matteAlpha <= 1.001; matteAlpha += .04) {
    matteSurfaces = ['#000000', '#ffffff'].map(backdrop => mix(backdrop, matteColour, matteAlpha));
    matte = textFamily(matteSurfaces, values.blue, values.red);
    if (matte && matte.blue && matte.red && matte.muted) break;
  }
  const onBand = '#fff6ec';
  const band = readable(values.band, [onBand], false);
  const deep = readable(values.deep, [onBand], false);
  const phase = sun.altitude < -6 ? 'night' : sun.altitude < 12 ? (rising ? 'morning' : 'evening') : 'day';
  const coverCast = mix('#10294e', rising ? '#f1bb8e' : '#eea574', daylight * (1 - highSun));
  const coverOpacity = (.08 + (1 - daylight) * .1 + overcast * .025).toFixed(3);
  return {
    sun, solar, phase, overcast, page: values.page, surface, text, band, onBand, deep,
    matte: { ...matte, colour: matteColour, alpha: Number(matteAlpha.toFixed(2)), surfaces: matteSurfaces },
    css: {
      '--dd-page': values.page,
      '--dd-surface': surface,
      '--dd-ink': text.ink,
      '--dd-muted': text.muted,
      '--dd-blue': text.blue,
      '--dd-red': text.red,
      '--dd-band': band,
      '--dd-on-band': onBand,
      '--dd-action-hover': readable(values.blue, [onBand], false),
      '--dd-footer-blue': deep,
      '--dd-footer-muted': readable('#d0ccdc', [band, deep], true),
      '--dd-footer-angle': `${Math.round(180 + (sun.azimuth - 180) * .16)}deg`,
      '--dd-line': readable(mix(text.ink, values.page, .45), [values.page, surface], text.lightInk, 3.1),
      '--dd-matte-fill': `rgba(${channels(matteColour).join(',')},${matteAlpha.toFixed(2)})`,
      '--dd-matte-solid': matteColour,
      '--dd-matte-edge': matte.lightInk ? 'rgba(255,246,236,.16)' : 'rgba(32,43,53,.10)',
      '--dd-matte-ink': matte.ink,
      '--dd-matte-blue': matte.blue,
      '--dd-matte-red': matte.red,
      '--dd-cover-cast': `rgba(${channels(coverCast).join(',')},${coverOpacity})`,
      '--dd-scheme': text.lightInk ? 'dark' : 'light',
    },
  };
}
