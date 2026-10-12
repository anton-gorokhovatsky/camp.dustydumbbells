// Run after the ordinary build. Pages never invokes this local comparison.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {replaceAboutCurrent} from './coral.js';
import {replaceAboutCurrent as replaceStrip} from './strip-version/coral.js';
import {renderSeaCurrent as renderBaselineCurrent} from './baseline-sea-currents.js';
const output=new URL('../../dist/experiments/coral-about/',import.meta.url);
const release=JSON.parse(await readFile(new URL('../../dist/release.json',import.meta.url),'utf8'));
const original=await readFile(new URL('../../dist/index.html',import.meta.url),'utf8');
await mkdir(output,{recursive:true});
await copyFile(new URL('./coral.css',import.meta.url),new URL('./coral.css',output));
await copyFile(new URL('./coral-player.js',import.meta.url),new URL('./coral-player.js',output));
await mkdir(new URL('./media/',output),{recursive:true});
for(const name of ['coral-88364-loop.mp4','coral-88364-still.jpg','coral-88364-portrait-loop.mp4','coral-88364-portrait-still.jpg']) await copyFile(new URL(`./media/${name}`,import.meta.url),new URL(`./media/${name}`,output));
await copyFile(new URL('./strip-version/coral.css',import.meta.url),new URL('./coral-strip.css',output));
await copyFile(new URL('./strip-version/coral-player.js',import.meta.url),new URL('./coral-player-strip.js',output));
await copyFile(new URL('./wash-version/coral.css',import.meta.url),new URL('./coral-wash.css',output));
await copyFile(new URL('./wash-version/coral-player.js',import.meta.url),new URL('./coral-player-wash.js',output));
await copyFile(new URL('./scene-view.js',import.meta.url),new URL('./scene-view.js',output));
await copyFile(new URL('./preview.html',import.meta.url),new URL('./preview.html',output));
// Keep the original page intact and rebase its existing relative assets.
const rebased=original.replaceAll('./direction/',`${release.base}direction/`)
 .replace('</head>','<meta name="robots" content="noindex,nofollow"></head>')
 .replace('</body>','<script src="./scene-view.js"></script></body>');
// Current output uses the production implementation once, without a second clock.
const trial=rebased
 .replace(/<title>[\s\S]*?<\/title>/,'<title>Coral к «О кэмпе» — локальная проба</title>');
let historicalScreen=await readFile(new URL('../../dist/direction/screen.js',import.meta.url),'utf8');
historicalScreen=historicalScreen.replace('setupCoralCurrent(reduced);','')
 .replaceAll('from "../',`from "${release.base}`)
 .replaceAll('from "./',`from "${release.base}direction/`)
 .replace("new URL('../assets/', import.meta.url)",`new URL('${release.base}assets/', location.href)`);
await writeFile(new URL('./screen-baseline.js',output),historicalScreen);
const baseline=rebased
 .replace(/<link[^>]+href="[^"]*coral-current\.css[^>]*>/,'')
 .replace(/<div class="sea-current sea-current--(out|in) sea-current--coral"[\s\S]*?<\/div>/g,(_,half)=>renderBaselineCurrent('WEATHER_ABOUT',half.toUpperCase()))
 .replace(/src="[^"]*direction\/screen\.js[^" ]*"/,'src="./screen-baseline.js"');
await writeFile(new URL('./baseline.html',output),baseline);
await writeFile(new URL('./strip.html',output),replaceStrip(baseline).replace('</head>','<link rel="stylesheet" href="./coral-strip.css"></head>').replace('</body>','<script type="module" src="./coral-player-strip.js"></script></body>'));
await writeFile(new URL('./wash.html',output),replaceAboutCurrent(baseline).replace('</head>','<link rel="stylesheet" href="./coral-wash.css"></head>').replace('</body>','<script type="module" src="./coral-player-wash.js"></script></body>'));
await writeFile(new URL('./index.html',output),trial);
// Reuse the project's existing local weather/accessibility fixtures when built.
for (const state of ['clear','night','rain','reduced','text200','no-js']) {
  const input=new URL(`../../dist/review/art/${state}/index.html`,import.meta.url);
  let page;
  try {page=await readFile(input,'utf8');} catch(error) {if(error.code==='ENOENT')continue;throw error;}
  page=page.replaceAll('../../../direction/',`${release.base}direction/`)
    .replace('src="./screen.js"',`src="${release.base}review/art/${state}/screen.js"`)
    .replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
  if(state!=='no-js')page=page.replace('</body>','<script src="./scene-view.js"></script></body>');
  await writeFile(new URL(`./${state}.html`,output),page);
}
console.log(`Local Coral trial: http://127.0.0.1:4173${release.base}experiments/coral-about/#about`);
