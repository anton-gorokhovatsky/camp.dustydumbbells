import { getPosition } from './suncalc.js';
import { PLACE, solarDay, placeClock, weatherEffects, clamp } from './environment.js';
import { channels, mix, luminance, contrast } from './palette-colours.js';
export { mix, contrast } from './palette-colours.js';
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

// Antalya's stone, sea, foliage, citrus and bougainvillea are colour references,
// not measured atmospheric colours. Solar geometry is real; pigments interpret it.
// Blue/red remain API role names, not restrictions on the colours of DD.
const pigments = {
  night: { page:'#242e36', blue:'#b6d7d2', red:'#efb18f', band:'#245251', deep:'#49304f', middle:'#374150', light:'#344852', shade:'#222b35' },
  predawn: { page:'#494258', blue:'#d5c9e8', red:'#f0bda2', band:'#65465d', deep:'#30485d', middle:'#4b475d', light:'#6b5c7d', shade:'#343e51' },
  dawn: { page:'#ddb9a0', blue:'#49405f', red:'#913c28', band:'#a34b25', deep:'#66445d', middle:'#854841', light:'#f9d9ac', shade:'#afa4b8' },
  morning: { page:'#e9e8d7', blue:'#185963', red:'#99412d', band:'#a04b27', deep:'#2d6364', middle:'#82475e', light:'#fff0c5', shade:'#b5d1ca' },
  day: { page:'#f4efdf', blue:'#0b5564', red:'#a13c29', band:'#ac4b21', deep:'#176673', middle:'#85475e', light:'#fff9df', shade:'#c5d6c9' },
  afternoon: { page:'#eed9bc', blue:'#245b61', red:'#984429', band:'#a64d25', deep:'#3c6654', middle:'#7b504d', light:'#ffe4a8', shade:'#c3cbbc' },
  evening: { page:'#ebc7ac', blue:'#443b61', red:'#8e3542', band:'#ae4b30', deep:'#704365', middle:'#8f474b', light:'#ffd39b', shade:'#b9aec4' },
  sunset: { page:'#bd959f', blue:'#393756', red:'#792d47', band:'#914258', deep:'#4a426e', middle:'#6e4263', light:'#ebc0a3', shade:'#8b96ae' },
  twilight: { page:'#424f6a', blue:'#bfd3e3', red:'#edbaaa', band:'#654665', deep:'#245768', middle:'#454f66', light:'#667194', shade:'#2b3b50' },
};
const labels = { night:'ночь',predawn:'предрассветный свет',dawn:'рассвет',morning:'утренний свет',day:'день',afternoon:'послеполуденный свет',evening:'закатный свет',sunset:'заход солнца',twilight:'сумерки' };
const blend = (left,right,amount) => Object.fromEntries(Object.keys(left).map(role=>[role,mix(left[role],right[role],amount)]));

export function solarPigments(date, sun = getPosition(date,PLACE.latitude,PLACE.longitude), solar = solarDay(date)) {
  const minute=placeClock(date).minutes;
  // The rise, transit and set of this day supply the anchors, not fixed hours.
  const anchors=[
    [0,'night'],[solar.sunrise-90,'night'],[solar.sunrise-45,'predawn'],
    [solar.sunrise-10,'dawn'],[solar.sunrise+65,'morning'],[solar.noon,'day'],
    [solar.noon+(solar.sunset-solar.noon)*.52,'afternoon'],
    [solar.sunset-50,'evening'],[solar.sunset,'sunset'],
    [solar.sunset+35,'twilight'],[solar.sunset+85,'night'],[1440,'night'],
  ];
  const upper=anchors.findIndex(([time])=>time>minute);
  const [fromTime,from]=anchors[Math.max(0,upper-1)];
  const [toTime,to]=anchors[upper<0?anchors.length-1:upper];
  const amount=ease((minute-fromTime)/Math.max(1,toTime-fromTime));
  const name=amount<.5?from:to;
  return {values:blend(pigments[from],pigments[to],amount),name,label:labels[name],
    daylight:ease((sun.altitude+12)/16),
    // Page-space interpretation facing the Mediterranean: east is left, west
    // is right, and the meridian sun illuminates from above.
    angle:((sun.azimuth%360)+360)%360,
    progress:clamp((minute-solar.sunrise)/(solar.sunset-solar.sunrise))};
}
function readable(pigment,surfaces,lightInk,minimum=4.5) {
  const limit=lightInk?'#ffffff':'#000000';
  for(let step=0;step<=100;step++){
    const colour=mix(pigment,limit,step/100);
    if(surfaces.every(surface=>contrast(colour,surface)>=minimum))return colour;
  }
  return null;
}
function textFamily(surfaces,blue,red) {
  const darkRatio=Math.min(...surfaces.map(s=>contrast('#000000',s)));
  const lightRatio=Math.min(...surfaces.map(s=>contrast('#ffffff',s)));
  const lightInk=lightRatio>darkRatio;
  // Reading ink takes a restrained cast from the same deep pigment. Night
  // retains its accepted warm light ink rather than colouring all the prose.
  const inkPigment=lightInk?'#f6ebdc':mix('#29322f',blue,.20);
  const ink=readable(inkPigment,surfaces,lightInk);
  if(!ink)return null;
  return {ink,muted:readable(mix(ink,surfaces[0],.25),surfaces,lightInk),
    blue:readable(blue,surfaces,lightInk),red:readable(red,surfaces,lightInk),lightInk};
}
const roleSeparation = text => Math.hypot(...channels(text.blue).map((value,i)=>value-channels(text.red)[i]));
const weatherPigments={
  cloud:{page:'#e7dfd3',blue:'#334b63',red:'#97453f',band:'#963e43',deep:'#30456b',middle:'#634256'},
  rain:{page:'#c6bdb0',blue:'#214b52',red:'#7d3144',band:'#7b2c43',deep:'#24474e',middle:'#574852'},
  storm:{page:'#423a47',blue:'#b9d6d3',red:'#f1ab97',band:'#6d2941',deep:'#253340',middle:'#493344'},
  fog:{page:'#e2ddd1',blue:'#405567',red:'#8b4b4f',band:'#8c4a51',deep:'#4b5a68',middle:'#6b5261'},
  snow:{page:'#ede9df',blue:'#315a67',red:'#894b57',band:'#83505b',deep:'#315567',middle:'#5a5368'},
};
const nightWeather={page:'#252a32',blue:'#bdcdd7',red:'#e1b4a9',band:'#513746',deep:'#223c48',middle:'#3a3a47'};

export function campPalette({date=new Date(),weather=null}={}) {
  const sun=getPosition(date,PLACE.latitude,PLACE.longitude),solar=solarDay(date);
  const light=solarPigments(date,sun,solar),effects=weatherEffects(weather);
  const overcast=clamp(effects.clouds*.46+effects.rain*.24+effects.storm*.3+effects.fog*.2+effects.snow*.12);
  let values={...light.values};
  // Weather retains part of this moment's solar pigment: a daytime storm and
  // a night storm belong to one atmosphere rather than one fixed preset.
  for(const [name,weight] of [['cloud',effects.clouds*.74],['rain',effects.rain*.88],
    ['storm',clamp(effects.storm/.75)*.90],['fog',effects.fog*.88],['snow',effects.snow*.88]]){
    const target=blend(nightWeather,weatherPigments[name],light.daylight);
    for(const role of Object.keys(target))values[role]=mix(values[role],target[role],weight);
  }
  const direct=light.daylight*(1-effects.clouds*.85)*(1-effects.rain*.6)*(1-clamp(effects.storm/.75)*.8)*(1-effects.fog*.9);
  let lit=mix(values.page,light.values.light,direct*.72);
  let shaded=mix(values.page,light.values.shade,direct*.66);
  const isDark=luminance(values.page)<.19;
  let surface=values.page;
  const fieldSurfaces=()=>[surface,...Array.from({length:11},(_,i)=>mix(lit,values.page,i/10)),...Array.from({length:11},(_,i)=>mix(values.page,shaded,i/10))];
  let surfaces=fieldSurfaces();
  let text=textFamily(surfaces,values.blue,values.red);
  // In the narrow middle-light interval reduce the directional range before
  // sacrificing readable ink. Foreground/background update as a single state.
  for(let attempt=0;(!text||roleSeparation(text)<16)&&attempt<8;attempt++){
    lit=mix(values.page,lit,.5);shaded=mix(values.page,shaded,.5);
    surfaces=fieldSurfaces();text=textFamily(surfaces,values.blue,values.red);
  }
  if(!text||roleSeparation(text)<16){
    surface=lit=shaded=values.page;surfaces=[values.page];
    text=textFamily(surfaces,values.blue,values.red);
  }
  // The matte plane has its own tonal headroom. Feeding it already-corrected
  // page ink would make dusk's nearly neutral crossover erase its colour roles.
  const matteColour=mix(surface,isDark?'#101c27':'#fff6ec',isDark?.35:.42);
  let matteAlpha=isDark?.92:.76,matteSurfaces,matte;
  for(;matteAlpha<=1.001;matteAlpha+=.04){
    matteSurfaces=['#000000','#ffffff'].map(backdrop=>mix(backdrop,matteColour,matteAlpha));
    matte=textFamily(matteSurfaces,values.blue,values.red);
    if(matte&&matte.blue&&matte.red&&matte.muted)break;
  }
  const onBand='#fff6ec',band=readable(values.band,[onBand],false),deep=readable(values.deep,[onBand],false);
  // A shared floral pigment keeps the daylight crossing from terracotta
  // to sea coloured. Lanes and the ending consume the same three stops.
  const middle=readable(values.middle,[onBand],false);
  const gradient=Array.from({length:21},(_,i)=>i<=10?mix(band,middle,i/10):mix(middle,deep,(i-10)/10));
  const rising=placeClock(date).minutes<solar.noon;
  const phase=sun.altitude<-6?'night':sun.altitude<12?(rising?'morning':'evening'):'day';
  const condition=!weather?'unknown':effects.storm?'storm':effects.snow?'snow':effects.fog?'fog':effects.rain?'rain':effects.clouds>.7?'cloud':'clear';
  // The film keeps its documentary light; the new solar field paints surfaces.
  const coverCast=mix('#10294e',rising?'#f1bb8e':'#eea574',light.daylight*(1-ease((sun.altitude-2)/22)));
  const coverOpacity=(.08+(1-light.daylight)*.1+overcast*.025).toFixed(3);
  return {sun,solar,phase,condition,effects,overcast,light:{...light,lit,shaded,direct},
    page:values.page,surface,surfaces,text,band,onBand,deep,middle,
    matte:{...matte,colour:matteColour,alpha:Number(matteAlpha.toFixed(2)),surfaces:matteSurfaces},
    css:{
      '--dd-page':values.page,'--dd-surface':surface,'--dd-ink':text.ink,'--dd-muted':text.muted,
      '--dd-blue':text.blue,'--dd-red':text.red,'--dd-band':band,'--dd-on-band':onBand,
      '--dd-paint-middle':middle,
      '--dd-action-hover':readable(values.blue,[onBand],false),'--dd-footer-blue':deep,
      '--dd-footer-muted':readable('#ded8d5',gradient,true),
      '--dd-footer-angle':`${light.angle.toFixed(2)}deg`,
      '--dd-line':readable(mix(text.ink,values.page,.40),surfaces,text.lightInk,3.1),
      '--dd-sunlit':lit,'--dd-shaded':shaded,'--dd-solar-angle':`${light.angle.toFixed(2)}deg`,
      '--dd-matte-fill':`rgba(${channels(matteColour).join(',')},${matteAlpha.toFixed(2)})`,
      '--dd-matte-solid':matteColour,'--dd-matte-edge':matte.lightInk?'rgba(255,246,236,.16)':'rgba(32,43,53,.10)',
      '--dd-matte-ink':matte.ink,'--dd-matte-blue':matte.blue,'--dd-matte-red':matte.red,
      '--dd-matte-hover-fill':matte.lightInk?'rgba(0,0,0,.14)':'rgba(255,255,255,.24)',
      '--dd-matte-pressed-fill':matte.lightInk?'rgba(0,0,0,.24)':'rgba(255,255,255,.38)',
      '--dd-cover-cast':`rgba(${channels(coverCast).join(',')},${coverOpacity})`,
      '--dd-scheme':text.lightInk?'dark':'light',
    }};
}
