import photographs from '../site/data/track-photographs.json' with {type:'json'};

// The user selected the local Akt/photo/track comparison on 26 October.
// Production uses the real shared environment, never the local review entry.
export function adaptBodyTypography(html, base, version) {
  return html.replace('</head>', `<link rel="stylesheet" href="${base}body-type.css?v=${version}" data-dd-body-type></head>`);
}

// Selected local track/stacks pass, released by the user on 27 October.
const motto = 'It costs 0.00 to be a nice camp';
const refrain = `${motto} · 21+`;
const paintedRefrain = `${motto}<span class="dd-track__age">21+</span>`;
export function composePhotographicTrack(html, base) {
  for(const band of photographs){
    const start=html.indexOf(`<div id="rec${band.id}"`);
    const next=/<(?:div|section) id="rec\d+"/.exec(html.slice(start+10));
    const end=next?start+10+next.index:-1;
    if(start<0||end<0||!html.slice(start,end).includes('t1003'))throw new Error('A selected running band changed: '+band.id);
    const sequence=band.photos.map((photo,index)=>{
      const ratio=(photo.width/photo.height).toFixed(4);
      const picture=`<span class="dd-track__photo" data-dd-smooth="photo" style="--dd-track-photo-ratio:${ratio}"><img src="${base}${photo.archive?'assets':'media'}/${photo.file}" width="${photo.width}" height="${photo.height}" alt="${photo.alt}" loading="lazy" decoding="async"></span>`;
      return (index%2===0?`<span class="dd-track__words" lang="en" aria-hidden="true">${paintedRefrain}</span>`:'')+picture;
    }).join('');
    const lap=(clone=false)=>`<div class="t1003__item"${clone?' aria-hidden="true"':''}><span class="dd-track__lap">${sequence}</span></div>`;
    // Each frame keeps its own place/year in alt text and the footer credits.
    // A sentence under a changing mix of archive and city frames has no stable subject.
    const strip=`<section id="rec${band.id}" class="r t-rec dd-track-scene" data-animationappear="off" aria-label="${refrain}"><div class="t1003 dd-track"><div class="dd-track__surface" aria-hidden="true"></div><div class="dd-track__viewport"><div class="t1003__content dd-track__motion">${lap()}${lap(true)}</div></div></div></section>`;
    html=html.slice(0,start)+strip+html.slice(end);
  }
  return html;
}

export function adaptVisualSystem(html, base, version) {
  html=composePhotographicTrack(html,base).replace('<body','<body data-dd-photo-weather');
  html=html.replace('aria-label="Анимация строк и подписи"','aria-label="Анимация оформления"');
  return adaptBodyTypography(html,base,version).replace('</head>',`<link rel="stylesheet" href="${base}photo-weather.css?v=${version}" data-dd-photo-style><link rel="stylesheet" href="${base}track.css?v=${version}" data-dd-track-style><script type="module" src="${base}track.js?v=${version}" data-dd-track></script></head>`);
}
