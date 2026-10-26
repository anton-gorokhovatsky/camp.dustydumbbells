import {weatherEffects,clamp} from './environment.js';

// Artistic surface response. The archive is not represented as current weather.
export function photoWeather(weather) {
  if(!weather||![weather.wind,weather.direction,weather.humidity].every(Number.isFinite))return {x:0,y:0,sway:0,period:12000,veil:0,wet:0,angle:135};
  const effects=weatherEffects(weather);
  const wind=clamp(Number.isFinite(effects.wind)?effects.wind/14:0);
  const gust=clamp(Number.isFinite(effects.gust)?(effects.gust-effects.wind)/10:0);
  const humidity=clamp(((weather.humidity??40)-40)/60);
  const direction=Number.isFinite(effects.direction)?effects.direction:0;
  return {
    x:effects.drift*wind*6,
    y:Math.cos(direction*Math.PI/180)*wind*1.2,
    sway:wind*1.2+gust*1.6,
    period:wind>.5?8000:12000,
    veil:Math.min(.11,humidity*.025+effects.fog*.09),
    wet:Math.min(.18,humidity*.04+effects.rain*.14),
    angle:Math.round(90+direction*.25),
  };
}
