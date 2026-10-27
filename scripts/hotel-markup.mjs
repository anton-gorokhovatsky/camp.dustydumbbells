// Selected existing, source-attributed hotel photographs; no external image service.
export const hotelPreviewFiles=['aspendos-living.webp','bomo-balcony.webp','four-hills-pool.webp','trend-terrace.webp','sealife-view.webp'];
export function composeHotelPreviews(html,base,hotels,version){
  const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  let previews='';
  let rows='';
  for(const [index,hotel] of hotels.entries()){
    const photo=hotel.photos.find(item=>item.file===hotelPreviewFiles[index]);
    if(!photo)throw Error('The source hotel photograph changed: '+hotel.id);
    const url=hotel.booking.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const link=new RegExp(`<a\\b(?=[^>]*href="${url}")[^>]*>[\\s\\S]*?<\\/a>`,'g');
    let count=0;
    html=html.replace(link,tag=>{
      count++;
      const opening=tag.slice(0,tag.indexOf('>')).replace(/\sstyle="[^"]*"/g,'');
      const row=`${opening} class="dd-stay-link" data-dd-hotel="${hotel.id}" aria-describedby="dd-hotel-caption-${hotel.id}"><span class="dd-stay-photo" data-dd-smooth="photo"><img src="${base}media/hotels/${photo.file}" width="${photo.width}" height="${photo.height}" alt="" loading="lazy" decoding="async"></span><span class="dd-stay-text"><span class="dd-stay-kind">${escape(hotel.kind)}</span><span class="dd-stay-name">${escape(hotel.name)}</span></span></a>`;
      rows+=`<li>${row}</li>`;
      return row;
    });
    if(count!==1)throw Error('Exactly one original booking link is required: '+hotel.id);
    previews+=`<figure class="dd-hotel-preview" data-dd-hotel-photo="${hotel.id}" hidden><div class="dd-hotel-preview__frame" data-dd-smooth="photo"><img src="${base}media/hotels/${photo.file}" width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="lazy" decoding="async"></div><figcaption id="dd-hotel-caption-${hotel.id}">${escape(hotel.name)} · ${escape(photo.caption)}</figcaption></figure>`;
  }
  let lists=0;
  html=html.replace(/<ul\b[^>]*>[\s\S]*?<\/ul>/g,list=>{
    if(!list.includes('data-dd-hotel='))return list;
    lists++;
    if((list.match(/data-dd-hotel=/g)||[]).length!==hotels.length)throw Error('All hotel destinations must stay in one list.');
    return `<ul class="dd-stays" role="list">${rows}</ul>`;
  });
  if(lists!==1)throw Error('Exactly one hotel list is required.');
  return html.replace('</head>',`<link rel="stylesheet" href="${base}hotel-previews.css?v=${version}" data-dd-hotel-style></head>`).replace('</body>',previews+`<script type="module" src="${base}hotel-previews.js?v=${version}"></script></body>`);
}
