// The user selected the local Akt/photo/track comparison on 26 October.
// Production uses the real shared environment, never the local review entry.
export function adaptBodyTypography(html, base, version) {
  return html.replace('</head>', `<link rel="stylesheet" href="${base}body-type.css?v=${version}" data-dd-body-type></head>`);
}

// Selected local track/stacks pass, released by the user on 27 October.
const refrain = 'It costs 0.00 to be a nice camp (21+)';
const photographs = [
  {id:'1016358466',file:'antalya-after-storm.jpg',width:1600,height:1067,place:'Анталья, Коньяалты',alt:'Море и волны на пляже Коньяалты в Анталье после шторма.'},
  {id:'1017632716',file:'ca7c99443ce6-IMG_6951_1.jpg',width:1680,height:2239,archive:true,place:'Кэмп DD в Фетхие, 2025',alt:'Бегуны DD на солнечной дороге между соснами.'},
  {id:'2238016901',file:'antalya-evening.jpg',width:1600,height:1067,place:'Анталья, Коньяалты',alt:'Вечернее море и силуэт гор на пляже Коньяалты в Анталье.'},
];

export function composePhotographicTrack(html, base) {
  for(const photo of photographs){
    const start=html.indexOf(`<div id="rec${photo.id}"`);
    const next=/<(?:div|section) id="rec\d+"/.exec(html.slice(start+10));
    const end=next?start+10+next.index:-1;
    if(start<0||end<0||!html.slice(start,end).includes('t1003'))throw new Error('A selected running band changed: '+photo.id);
    const picture=`<span class="dd-track__photo" data-dd-smooth="photo"><img src="${base}${photo.archive?'assets':'media'}/${photo.file}" width="${photo.width}" height="${photo.height}" alt="${photo.alt}" loading="lazy" decoding="async"${photo.archive?' style="object-position:50% 90%"':''}></span>`;
    const lap=(clone=false)=>`<div class="t1003__item"${clone?' aria-hidden="true"':''}><span class="dd-track__lap"><span class="dd-track__words" lang="en">${refrain}</span>${picture}</span></div>`;
    const strip=`<section id="rec${photo.id}" class="r t-rec dd-track-scene" data-animationappear="off" aria-label="${refrain}"><div class="t1003 dd-track"><div class="dd-track__surface" aria-hidden="true"></div><div class="dd-track__viewport"><div class="t1003__content dd-track__motion">${lap()}${lap(true)}</div></div></div><p class="t-container dd-track__caption">${photo.place}</p></section>`;
    html=html.slice(0,start)+strip+html.slice(end);
  }
  return html;
}

export function adaptVisualSystem(html, base, version) {
  html=composePhotographicTrack(html,base).replace('<body','<body data-dd-photo-weather');
  html=html.replace('aria-label="Анимация строк и подписи"','aria-label="Анимация оформления"');
  return adaptBodyTypography(html,base,version).replace('</head>',`<link rel="stylesheet" href="${base}photo-weather.css?v=${version}" data-dd-photo-style><link rel="stylesheet" href="${base}track.css?v=${version}" data-dd-track-style><script type="module" src="${base}track.js?v=${version}" data-dd-track></script></head>`);
}
