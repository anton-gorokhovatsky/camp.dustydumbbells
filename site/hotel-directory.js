export const renderHotelDirectory = (hotels, mediaBase) => `<div class="hotel-directory" data-hotel-directory data-initial-hotel="bomo">
  <header class="hotels-heading"><h3 id="hotels-title">Отели и апартаменты</h3><p>Номера и цены — на Trip.com.</p></header>
  <nav class="hotel-contents" id="hotel-overview" aria-label="Отели на этой странице" tabindex="-1">${hotels.map(hotel => `<a href="#hotel-${hotel.id}">${hotel.name}</a>`).join('')}</nav>
  <fieldset class="hotel-picker" hidden><legend>Выбери отель</legend>${hotels.map(hotel => `<label><input type="radio" name="hotel-preview" value="${hotel.id}" aria-controls="hotel-${hotel.id}" ${hotel.id === 'bomo' ? 'checked' : ''}><span>${hotel.name}</span></label>`).join('')}</fieldset>
  <p class="sr-only" data-hotel-status role="status"></p>
  <ul class="hotel-list" aria-labelledby="hotels-title">${hotels.map(hotel => `<li data-hotel="${hotel.id}" id="hotel-${hotel.id}" tabindex="-1">
    <a class="hotel-name" href="${hotel.booking}" target="_blank" rel="noopener noreferrer"><span>${hotel.name}</span><small>${hotel.kind} · Номера и цены на Trip.com</small></a>
    <p class="hotel-description">${hotel.description}</p>
    <div class="hotel-preview" aria-labelledby="hotel-preview-${hotel.id}"><p class="hotel-preview-title" id="hotel-preview-${hotel.id}">${hotel.name}</p>
      <div class="hotel-images" style="--hotel-photo-columns:${hotel.photos.map(photo => `${photo.width / photo.height}fr`).join(' ')};--hotel-photo-ratio:${hotel.photos.reduce((sum, photo) => sum + photo.width / photo.height, 0)}">${hotel.photos.map(photograph => `<figure style="--photo-ratio:${photograph.width / photograph.height}"><span class="hotel-photo-frame"><img src="${mediaBase}${photograph.file}" width="${photograph.width}" height="${photograph.height}" loading="lazy" alt="${photograph.alt}"></span><figcaption>${photograph.caption}</figcaption></figure>`).join('')}</div>
      <div class="hotel-preview-meta"><p class="hotel-photo-source">Фотографии: <a href="${hotel.source}" target="_blank" rel="noopener noreferrer">сайт ${hotel.name}</a></p><p class="hotel-return"><a href="#hotel-overview">К списку отелей</a></p></div>
    </div>
  </li>`).join('')}</ul>
</div>`;
