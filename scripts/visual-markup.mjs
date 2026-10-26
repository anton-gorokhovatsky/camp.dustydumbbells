// The user selected the local Akt/photo/track comparison on 26 October.
// Production uses the real shared environment, never the local review entry.
export function adaptBodyTypography(html, base, version) {
  return html.replace('</head>', `<link rel="stylesheet" href="${base}body-type.css?v=${version}" data-dd-body-type></head>`);
}

const photographs = [
  {file:'ca7c99443ce6-IMG_6951_1.jpg',width:1680,height:2239},
  {file:'9b0df23f9df7-IMG_6952.JPG',width:1680,height:2520},
];

export function composePhotographicTrack(html, base) {
  if(photographs.some(photo=>html.includes(photo.file)))throw new Error('A selected track photograph is already placed.');
  const picture=(photo,second=false)=>`<span class="dd-track__photo${second?' dd-track__photo--second':''}" data-dd-smooth="photo" style="--photo-ratio:${photo.width}/${photo.height}"><img src="${base}assets/${photo.file}" width="${photo.width}" height="${photo.height}" alt="" loading="lazy" decoding="async"></span>`;
  const tracks=[
    {id:'1016358466',text:'Ты бронируешь билеты, жильё и трансфер — мы берём на себя спорт и развлечения',href:'#rec2078794451'},
    {id:'1017632716',text:'It costs 0.00 to be a nice camp (21+)',href:'#form',photo:true},
    {id:'2238016901',text:'Присоединяйтесь к беговому приключению',href:'#form'},
  ];
  for(const track of tracks){
    const start=html.indexOf(`<div id="rec${track.id}"`);
    const next=/<(?:div|section) id="rec\d+"/.exec(html.slice(start+10));
    const end=next?start+10+next.index:-1;
    if(start<0||end<0||!html.slice(start,end).includes('t1003'))throw new Error('A selected running band changed: '+track.id);
    const words=track.photo?`<span class="dd-track__words">It costs</span>${picture(photographs[0])}<span class="dd-track__words">0.00 to be</span>${picture(photographs[1],true)}<span class="dd-track__words">a nice camp (21+)</span>`:`<span class="dd-track__words">${track.text}</span>`;
    const lap=(clone=false)=>`<div class="t1003__item"${clone?' aria-hidden="true"':''}><a class="t1003__item-link dd-track__lap" href="${track.href}" aria-label="${track.text}"${clone?' tabindex="-1"':''}>${words}<span class="dd-track__mark" aria-hidden="true">↗</span></a></div>`;
    const strip=`<section id="rec${track.id}" class="r t-rec dd-track-scene" data-animationappear="off" aria-label="${track.text}"><div class="t1003 dd-track"><div class="dd-track__surface" aria-hidden="true"></div><div class="dd-track__viewport"><div class="t1003__content dd-track__motion">${lap()}${lap(true)}</div></div></div>${track.photo?'<p class="t-container dd-track__caption">Кэмп в Фетхие, 2025</p>':''}</section>`;
    html=html.slice(0,start)+strip+html.slice(end);
  }
  return html;
}

export function adaptVisualSystem(html, base, version) {
  html=composePhotographicTrack(html,base).replace('<body','<body data-dd-photo-weather');
  html=html.replace('aria-label="Анимация строк и подписи"','aria-label="Анимация оформления"');
  return adaptBodyTypography(html,base,version).replace('</head>',`<link rel="stylesheet" href="${base}photo-weather.css?v=${version}" data-dd-photo-style><link rel="stylesheet" href="${base}track.css?v=${version}" data-dd-track-style><script type="module" src="${base}track.js?v=${version}" data-dd-track></script></head>`);
}
