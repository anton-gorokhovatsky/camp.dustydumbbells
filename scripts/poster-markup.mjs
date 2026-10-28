/** The user selected poster-finish on 27 October. Keep its composition in the
 * ordinary build, without importing the local clock, transport or map guards. */
function division(html,start) {
  if(start<0)throw Error('The selected poster division is missing.');
  const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;let depth=0;
  for(let tag;(tag=tags.exec(html));){
    depth+=tag[0].startsWith('</')?-1:1;
    if(!depth)return {start,end:tags.lastIndex,html:html.slice(start,tags.lastIndex)};
  }
  throw Error('The selected poster division is not closed.');
}

export function composePoster(html,base,version) {
  const scenes={
    about:{people:{src:base+'media/dd-menu-people.webp'},place:{src:base+'media/antalya-xG2uKMgxGzw.webp',position:'50% 48%'}},
    programme:{people:{src:base+'media/dd-menu-training.webp'},place:{src:base+'media/antalya-after-storm.jpg'}},
    weather:{people:{src:base+'media/dd-menu-coast-run.webp'},place:{src:base+'media/antalya-wz1B2Rd3LbA.webp'}},
    travel:{people:{src:base+'media/dd-menu-people.webp'},place:{src:base+'media/antalya-xG2uKMgxGzw.webp'}},
  };
  const picture=(slot,portrait=false)=>`<span class="dd-menu-preview dd-menu-inline${portrait?' dd-menu-inline--portrait':''}" data-menu-slot="${slot}" data-front="a" aria-hidden="true"><img src="${scenes.about[slot].src}" style="object-position:${scenes.about[slot].position||'50% 50%'}" data-layer="a" alt="" width="180" height="120"><img src="${scenes.about[slot].src}" style="object-position:${scenes.about[slot].position||'50% 50%'}" data-layer="b" alt="" width="180" height="120"></span>`;
  const tail=text=>`<span class="dd-menu-tail">${text}<span class="dd-menu-current" aria-hidden="true"></span></span>`;
  const words=[
    `<span class="dd-menu-word">О</span>${picture('people')}<span class="dd-menu-word">${tail('кэмпе')}</span>`,
    `<span class="dd-menu-word">Распи&shy;${tail('сание')}</span>`,
    `<span class="dd-menu-word">Погода в Ан&shy;${tail('талье')}</span>`,
    `<span class="dd-menu-word">Дорога</span>${picture('place',true)}<span class="dd-menu-word">и ${tail('жильё')}</span>`,
  ];
  const names=['О кэмпе','Расписание','Погода в Анталье','Дорога и жильё'];
  const keys=Object.keys(scenes);
  let menuCount=0;
  html=html.replace(/(<a class="t-menu__link-item"\s+href="#[^"]+" data-menu-item-number="([1-4])")>[^<]*<\/a>/g,(_,start,n)=>{
    menuCount++;
    return `${start} aria-label="${names[+n-1]}" data-menu-scene="${keys[+n-1]}">${words[+n-1]}</a>`;
  });
  if(menuCount!==4)throw Error('The selected disclosure needs four original destinations.');
  html=html.replace(/<a class="dd-join-link dd-menu-join" href="#form">Оставить заявку<\/a>/,
    '<div class="dd-menu-application"><a class="dd-join-link dd-menu-join dd-menu-apply" href="#form">Оставить заявку</a></div>');

  html=html.replace(/<span class="dd-cover-opening">«<\/span>Пыль&shy;ные Ган&shy;те&shy;ли<span class="dd-cover-closing">»<\/span>/,
    '<span class="dd-cover-name">«Пыль&shy;ные Ган&shy;те&shy;ли»</span>');
  let titleCount=0;
  html=html.replace(/<h1\b[^>]*id="dd-title"[^>]*>[\s\S]*?<\/h1>/,title=>title.replace(/(<span class="dd-cover-name">[\s\S]*?<\/span>)([\s\S]*?)(<span class="dd-cover-date">)/,(_,name,trip,date)=>{
    titleCount++;return `${name} <span class="dd-cover-trip">${trip.trim()}</span>${date}`;
  }));
  if(titleCount!==1)throw Error('The selected title hierarchy changed.');

  const destinations=[
    {href:'#rec1016322141',name:names[0],text:'О кэмпе',photo:'media/dd-menu-people.webp'},
    {href:'#rec2078762951',name:names[1],text:'Распи&shy;сание',photo:'media/dd-menu-training.webp'},
    {href:'#rec1017020466',name:names[2],text:'Погода в Ан&shy;талье',photo:'media/antalya-after-storm.jpg'},
    {href:'#rec2078794451',name:names[3],text:'Дорога и жильё',photo:'media/antalya-xG2uKMgxGzw.webp'},
  ];
  const record=division(html,html.indexOf('<div id="rec1016601036"'));
  const logo=record.html.match(/<img\b[^>]*class=["'][^"']*\bt967__imglogo\b[^"']*["'][^>]*>/)?.[0];
  if(!logo)throw Error('The authentic DD CAMP image is required.');
  const links=destinations.map((d,i)=>`<a href="${d.href}" class="dd-nav-link" aria-label="${d.name}" data-scene="${i}" data-photo="${base+d.photo}"><span class="dd-nav-label">${d.text}</span></a>`).join('');
  const header=`<div id="rec1016601036" class="r t-rec dd-nav-record"><nav id="nav1016601036" class="dd-nav-experiment" data-nav-treatment="poster" aria-label="Основная навигация"><a class="dd-nav-logo" href="#dd-title" aria-label="В начало">${logo}</a><div class="dd-nav-destinations">${links}</div><figure class="dd-nav-image dd-menu-preview" data-dd-smooth="photo" hidden aria-hidden="true"><img src="${base+destinations[0].photo}" alt="" decoding="async"></figure></nav></div>`;
  html=html.slice(0,record.start)+header+html.slice(record.end);

  const paired=/<span class="dd-track__words" lang="en" aria-hidden="true">It costs 0\.00 to be a nice camp(<span class="dd-track__age">21\+<\/span>)<\/span>(<span class="dd-track__photo"[^>]*><img\b[^>]*><\/span>)(<span class="dd-track__photo"[^>]*><img\b[^>]*><\/span>)/g;
  let pairs=0;
  html=html.replace(paired,(_,age,first,second)=>{pairs++;return `<span class="dd-track__words" lang="en" aria-hidden="true">It costs 0.00</span>${first}<span class="dd-track__words" lang="en" aria-hidden="true">to be a nice camp${age}</span>${second}`;});
  if(pairs!==32)throw Error('The selected primary/clone photo pairs changed: '+pairs);
  html=html.replace('<body','<body data-dd-poster-finish');
  const fields=html.match(/<div class="dd-track__surface" aria-hidden="true"><\/div>/g)||[];
  if(fields.length!==3)throw Error('Three selected photographic tracks are required.');
  if(!html.includes('dd-menu-apply')||!html.includes('dd-application-explanation'))throw Error('The selected poster composition is incomplete.');
  return html.replace('</head>',`<link rel="stylesheet" href="${base}poster.css?v=${version}" data-dd-poster><script type="application/json" id="dd-menu-scenes">${JSON.stringify(scenes)}</script><script type="module" src="${base}menu-poster.js?v=${version}"></script><script type="module" src="${base}poster-navigation.js?v=${version}"></script></head>`);
}
