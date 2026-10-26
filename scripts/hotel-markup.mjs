// Selected existing, source-attributed hotel photographs; no external image service.
export const hotelPreviewFiles=['aspendos-living.webp','bomo-balcony.webp','four-hills-pool.webp','trend-terrace.webp','sealife-view.webp'];
export function composeHotelPreviews(html,base,hotels,version){
  const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  let previews='';
  for(const [index,hotel] of hotels.entries()){
    const photo=hotel.photos.find(item=>item.file===hotelPreviewFiles[index]);
    if(!photo)throw Error('The source hotel photograph changed: '+hotel.id);
    const url=hotel.booking.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const link=new RegExp(`<a\\b(?=[^>]*href="${url}")[^>]*>`,'g');
    let count=0;
    html=html.replace(link,tag=>{count++;return tag.slice(0,-1)+` data-dd-hotel="${hotel.id}" aria-describedby="dd-hotel-caption-${hotel.id}">`;});
    if(count!==1)throw Error('Exactly one original booking link is required: '+hotel.id);
    previews+=`<figure class="dd-hotel-preview" data-dd-hotel-photo="${hotel.id}" hidden><div class="dd-hotel-preview__frame" data-dd-smooth="photo"><img src="${base}media/hotels/${photo.file}" width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="lazy" decoding="async"></div><figcaption id="dd-hotel-caption-${hotel.id}">${escape(hotel.name)} · ${escape(photo.caption)}</figcaption></figure>`;
  }
  return html.replace('</head>',`<link rel="stylesheet" href="${base}hotel-previews.css?v=${version}" data-dd-hotel-style></head>`).replace('</body>',previews+`<script type="module" src="${base}hotel-previews.js?v=${version}"></script></body>`);
}
