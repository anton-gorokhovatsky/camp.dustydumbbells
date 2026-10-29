import archive from '../site/data/camp-antalya-2026.json' with {type:'json'};

const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function division(html,start){
  const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;let depth=0;
  for(let tag;(tag=tags.exec(html));){depth+=tag[0].startsWith('</')?-1:1;if(!depth)return {start,end:tags.lastIndex,html:html.slice(start,tags.lastIndex)};}
  throw Error('A selected photographic group is unbalanced.');
}

function addArchive(group,base){
  const carousel=group.match(/id="carousel_(\d+)"/)?.[1];
  const selection=archive.stacks.find(stack=>stack.carousel===carousel);
  if(!selection)throw Error('Every photographic scene needs an explicit archive selection.');
  const old=[...group.matchAll(/<div\s+class="t1148__item"/g)].map(match=>division(group,match.index));
  const retained=old.map(item=>{
    const source=item.html.match(/data-dd-photo-source="([^"]+)"/)?.[1];
    const format=archive.retainedFormats[source?.slice(base.length)];
    if(!format)throw Error('The retained archive photograph needs its full-image proportions.');
    return item.html
      .replace('class="t1148__item"','class="t1148__item" data-dd-archive-caption="Кэмп в Фетхие, 2025"')
      .replace(/class="t1148__img-wrapper"/,`class="t1148__img-wrapper" data-dd-photo-ratio="${format.width}/${format.height}"`);
  });
  const additions=selection.photos.map(id=>{
    const photo=archive.photos.find(photo=>photo.id===id);
    if(!photo||!/^media\/camp-antalya-2026\/camp-antalya-2026-\d{2}\.webp$/.test(photo.file))throw Error('The camp archive photograph is missing.');
    const source=escape(base+photo.file);
    return `<div class="t1148__item" role="group" aria-roledescription="slide" aria-label="1 из 1"\naria-current="false" data-dd-archive-caption="${escape(archive.caption)}"><div class="t1148__img-wrapper" data-dd-photo-ratio="${photo.width}/${photo.height}"><img class="t-img t1148__img" src="${source}" data-original="${source}" data-index="0" alt="${escape(photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async" role="button" tabindex="0" aria-label="Следующая фотография" draggable="false" data-zoom-target="0" data-dd-photo-source="${source}"></div></div>`;
  });
  const cards=[...additions,...retained];
  const indexed=cards.map((card,index)=>card
    .replace(/aria-label="\d+ из \d+"/,`aria-label="${index+1} из ${cards.length}"`)
    .replace(/aria-current="(?:true|false)"/,`aria-current="${index===0}"`)
    .replace(/data-index="\d+"/,`data-index="${index}"`)
    .replace(/data-zoom-target="\d+"/,`data-zoom-target="${index}"`)
    .replace(/imgfield="gi_img__\d+"/,`imgfield="gi_img__${index}"`));
  return (group.slice(0,old[0].start)+indexed.join('')+group.slice(old.at(-1).end))
    .replace('<p class="dd-archive-caption">Кэмп в Фетхие, 2025</p>',`<p class="dd-archive-caption">${escape(archive.caption)}</p>`);
}

export function composePhotoStacks(html,base,version){
  let galleries=0,initializers=0;
  html=html.replace(/<div class="t1148">/g,()=>{galleries++;return '<div class="t1148 dd-photo-stack" data-dd-stack>';});
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,script=>/t_slider__init\([^)]*['"]t1148['"]/.test(script)?(initializers++,''):script);
  if(galleries!==3||initializers!==3)throw Error('Exactly three existing galleries must become stacks.');
  let cursor=0;
  while((cursor=html.indexOf('<div class="t1148 dd-photo-stack"',cursor))>=0){
    const group=division(html,cursor);
    const changed=addArchive(group.html.replace(/\s*data-zoomable="[^"]*"/g,'').replace(/<img\b[^>]*>/g,tag=>tag.replace(/data-img-zoom-url="([^"]*)"/,'data-dd-photo-source="$1"').replace(/aria-label="[^"]*"/,'aria-label="Следующая фотография"')),base);
    html=html.slice(0,cursor)+changed+html.slice(group.end);cursor+=changed.length;
  }
  return html.replace('</head>',`<link rel="stylesheet" href="${base}photo-stacks.css?v=${version}" data-dd-stacks><script type="module" src="${base}photo-stacks.js?v=${version}" data-dd-stacks></script></head>`);
}
