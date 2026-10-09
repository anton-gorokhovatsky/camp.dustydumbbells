// Local-only review routes; the Pages build never invokes this script.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const base = new URL('../dist/',import.meta.url);
const html = await readFile(new URL('index.html',base),'utf8');
const screen = await readFile(new URL('direction/screen.js',base),'utf8');
const states = [
  ['morning', '07:35',0,5,0,1.8,230],
  ['clear', '13:00',0,5,0,1.8,230],
  ['clouds', '13:00',3,100,0,3,180],
  ['rain', '13:00',63,100,0,5,90],
  ['wind', '13:00',2,40,0,13,270],
  ['fog', '13:00',45,100,0,2,180],
  ['snow', '13:00',73,100,1,4,90],
  ['evening', '18:10',0,5,0,1.8,230],
  ['night', '22:00',0,5,0,1.8,230],
  ['night-rain', '22:00',65,100,3,5,90],
  ['reduced', '13:00',63,100,0,5,90],
  ['text200', '13:00',0,5,0,1.8,230],
  ['no-data', '13:00',0,5,0,1.8,230],
  ['no-js', '13:00',0,5,0,1.8,230],
];
const links = states.map(([name])=>`<a href="./${name}/">${name}</a>`).join(' · ');
await mkdir(new URL('review/art/',base),{recursive:true});
await writeFile(new URL('review/art/index.html',base),`<!doctype html><meta name="viewport" content="width=device-width"><title>Локальная сверка среды</title><h1>Локальная сверка среды</h1><p>Фиксированные модели, не настоящая погода.</p>${links}`);
for (const [name,time,code,clouds,precipitation,wind,direction] of states) {
  const date = `2026-10-09T${time}:00+03:00`;
  const stamp = `2026-10-09T${time}`;
  const hours = Array.from({length:24},(_,i)=>`2026-10-09T${String(i).padStart(2,'0')}:00`);
  const payload = {current:{time:stamp,temperature_2m:code===73?1:code===63?17:25,
    relative_humidity_2m:clouds>75?94:40,cloud_cover:clouds,precipitation,wind_speed_10m:wind,
    wind_gusts_10m:wind+4,wind_direction_10m:direction,weather_code:code},
    hourly:{time:hours,temperature_2m:hours.map(()=>25),weather_code:hours.map(()=>code)},
    daily:{time:['2026-10-09'],temperature_2m_max:[25],temperature_2m_min:[18],precipitation_sum:[precipitation]}};
  let js = screen.replace(/from "\.\.\//g,'from "../../../').replace(/from "\.\//g,'from "../../../direction/');
  js = js.replace("new URL('../assets/', import.meta.url)", "new URL('../../../assets/', import.meta.url)");
  js = `const reviewDate = new Date(${JSON.stringify(date)});\n`+js.replaceAll('new Date()','reviewDate').replaceAll('placeClock()','placeClock(reviewDate)');
  js = js.replace('normalizeWeather(payload)','normalizeWeather(payload, reviewDate)').replace('normalizeForecast(payload)','normalizeForecast(payload, reviewDate)');
  js = js.replace(/const response = await fetch\(forecastURL\(\), \{ signal: AbortSignal.timeout\(10000\) \}\);/,name==='no-data'?'throw new Error("Local outage fixture");':`const response = {ok:true,json:async()=>(${JSON.stringify(payload)})};`);
  js = js.replace(/setInterval\(\(\) => \{[\s\S]*?\}, 60000\);/,'');
  if (name==='reduced') js = js.replace("matchMedia('(prefers-reduced-motion: reduce)')",'({matches:true,addEventListener(){}})');
  const folder = new URL(`review/art/${name}/`,base);
  await mkdir(folder,{recursive:true});
  await writeFile(new URL('screen.js',folder),js);
  let page = html.replaceAll('href="./direction/','href="../../../direction/').replaceAll('src="./direction/','src="../../../direction/');
  page = page.replace(/src="\.\.\/\.\.\/\.\.\/direction\/screen.js\?[^"]+"/,'src="./screen.js"');
  page = page.replace('</head>',`<style>${name==='text200'?'html{font-size:200%}':''}</style></head>`);
  if (name==='no-js') page = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  await writeFile(new URL('index.html',folder),page);
}
console.log(`Built ${states.length} local review states at /camp.dustydumbbells/review/art/`);
