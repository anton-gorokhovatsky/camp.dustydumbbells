function division(html,start){
  const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;let depth=0;
  for(let tag;(tag=tags.exec(html));){depth+=tag[0].startsWith('</')?-1:1;if(!depth)return {start,end:tags.lastIndex,html:html.slice(start,tags.lastIndex)};}
  throw Error('A selected photographic group is unbalanced.');
}

export function composePhotoStacks(html,base,version){
  let galleries=0,initializers=0;
  html=html.replace(/<div class="t1148">/g,()=>{galleries++;return '<div class="t1148 dd-photo-stack" data-dd-stack>';});
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,script=>/t_slider__init\([^)]*['"]t1148['"]/.test(script)?(initializers++,''):script);
  if(galleries!==3||initializers!==3)throw Error('Exactly three existing galleries must become stacks.');
  let cursor=0;
  while((cursor=html.indexOf('<div class="t1148 dd-photo-stack"',cursor))>=0){
    const group=division(html,cursor);
    const changed=group.html.replace(/\s*data-zoomable="[^"]*"/g,'').replace(/<img\b[^>]*>/g,tag=>tag.replace(/data-img-zoom-url="([^"]*)"/,'data-dd-photo-source="$1"').replace(/aria-label="[^"]*"/,'aria-label="Следующая фотография"'));
    html=html.slice(0,cursor)+changed+html.slice(group.end);cursor+=changed.length;
  }
  return html.replace('</head>',`<link rel="stylesheet" href="${base}photo-stacks.css?v=${version}" data-dd-stacks><script type="module" src="${base}photo-stacks.js?v=${version}" data-dd-stacks></script></head>`);
}
