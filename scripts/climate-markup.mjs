// A colour adapter for the accepted original. Numeric record IDs are confined
// here; the palette model knows only the roles of the published composition.
export function adaptClimate(html, base, version) {
  html = html.replace('<body', '<body data-dd-environment');
  // Replace only CSS declarations, never scripts, copy, images or brand SVGs.
  const roleColours = css => css
    .replace(/((?:^|[;{\s])(?:color|border-color|background-color|fill|stroke)\s*:\s*)#232323\b/gi, '$1var(--dd-ink)')
    .replace(/((?:^|[;{\s])(?:color|border-color|background-color|fill|stroke)\s*:\s*)(?:#1a4297|rgb\(26,\s*66,\s*151\))(?=[;\s!}]|$)/gi, '$1var(--dd-blue)')
    .replace(/((?:^|[;{\s])(?:color|border-color|background-color|fill|stroke)\s*:\s*)(?:#b21818|rgb\(178,\s*24,\s*24\))(?=[;\s!}]|$)/gi, '$1var(--dd-red)');
  html = html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attributes, css) => `<style${attributes}>${roleColours(css)}</style>`)
    .replace(/\bstyle="([^"]*)"/gi, (_, css) => `style="${roleColours(css)}"`);
  const weatherStart = html.indexOf('<div id="rec1017020466"');
  if (weatherStart >= 0) {
    const weatherEnd=html.indexOf('<div id="rec',weatherStart+10);
    let record=html.slice(weatherStart,weatherEnd);
    let facts=0;
    record=record.replace(/<ul>[\s\S]*?<\/ul>/,list=>{
      const items=[...list.matchAll(/<li\b[^>]*>([^<]+)<\/li>/g)];
      if(items.length!==3)throw Error('The three October temperature facts changed.');
      facts++;
      return '<dl class="dd-climate-facts">'+items.map(([,text])=>{
        const split=text.indexOf(':');if(split<0)throw Error('A temperature label is missing.');
        return `<div><dt>${text.slice(0,split)}</dt><dd>${text.slice(split+1).trim()}</dd></div>`;
      }).join('')+'</dl>';
    }).replace(/Температура воздуха в(?:\s|&nbsp;)+октябре:/,'Температура в&nbsp;октябре:');
    if(facts!==1)throw Error('The October climate list is missing.');
    html=html.slice(0,weatherStart)+record+html.slice(weatherEnd);
    const descriptionStart = html.indexOf('field="bdescr">', weatherStart);
    const opening=html.lastIndexOf('<div',descriptionStart);
    const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=opening;
    let depth=0,descriptionEnd=-1;
    for(let tag;(tag=tags.exec(html));){
      depth+=tag[0].startsWith('</')?-1:1;
      if(!depth){descriptionEnd=tag.index;break;}
    }
    const nextRecord = html.indexOf('<div id="rec', weatherStart + 10);
    if (descriptionStart < 0 || descriptionEnd < 0 || descriptionEnd > nextRecord) {
      throw new Error('Review the original weather copy before adding the climate reading.');
    }
    html = html.slice(0, descriptionEnd)
      + '<p class="dd-climate-reading"><span data-dd-weather-values>Цвета страницы следуют свету Антальи.</span></p>'
      + html.slice(descriptionEnd);
  }
  return html.replace('</head>', `<link rel="stylesheet" href="${base}climate.css?v=${version}" data-dd-climate><script type="module" src="${base}camp-environment.js?v=${version}" data-dd-climate></script></head>`);
}
