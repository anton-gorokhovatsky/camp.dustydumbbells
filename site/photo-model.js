import {weatherEffects,clamp} from './environment.js';

// Light and inclination belong to the page's current atmosphere. The archive
// keeps its documentary content: no rain is drawn into a sunny photograph.
const neutral = () => ({x:0,y:0,tilt:0,sway:0,period:12000,saturation:1,brightness:1,contrast:1,blur:0});
export function photoWeather(weather) {
  if(!weather||![weather.wind,weather.direction,weather.humidity].every(Number.isFinite))return neutral();
  const effects=weatherEffects(weather);
  const wind=clamp(Number.isFinite(effects.wind)?effects.wind/14:0);
  const gust=clamp(Number.isFinite(effects.gust)?(effects.gust-effects.wind)/10:0);
  const damp=clamp((weather.humidity-70)/30);
  const direction=Number.isFinite(effects.direction)?effects.direction:0;
  // FIG and Hotline respond through diffuse light and media focus. DD's people
  // remain recognisable: ordinary cloud/rain has no blur; only heavy rain or
  // coded fog softens the photographic image, never copy or controls.
  const downpour=clamp((effects.rain-.65)/.35);
  return {
    x:effects.drift*wind*6,
    y:Math.cos(direction*Math.PI/180)*wind*1.2,
    tilt:effects.drift*Math.sqrt(wind)*2.8,
    sway:wind*1.2+gust*1.6,
    period:wind>.5?8000:12000,
    saturation:1-effects.clouds*.08-effects.rain*.12-effects.storm*.1-effects.fog*.12,
    brightness:1-effects.clouds*.025-effects.rain*.06-effects.storm*.045,
    contrast:1+effects.rain*.035+effects.storm*.025-effects.fog*.13,
    blur:Math.min(1.2,downpour*.55+effects.fog*.85+damp*effects.fog*.15),
  };
}
