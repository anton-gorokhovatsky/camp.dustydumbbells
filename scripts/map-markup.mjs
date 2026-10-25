/** Keep the captured point; production Mapbox starts when its section becomes visible. */
export function adaptMap(html, base, version) {
  let maps = 0;
  const result = html.replace(
    /<div\s+class="t-map"\s+id="separateMap2083039171"[\s\S]*?<\/script>/g,
    source => {
      maps++;
      const zoom = /data-map-zoom="(\d+)"/.exec(source)?.[1];
      const point = /lat:"([\d.]+)",lng:"([\d.]+)"/.exec(source);
      if (!zoom || !point || point[1] !== '36.863249' || point[2] !== '30.63773') {
        throw new Error('The source map changed; review its location before building.');
      }
      const coordinates = `${point[2]},${point[1]}`;
      const external = `https://yandex.ru/maps/?ll=${encodeURIComponent(coordinates)}&amp;pt=${encodeURIComponent(coordinates + ',pm2blm')}&amp;z=${zoom}`;
      return `<section class="dd-map" data-dd-map data-lat="${point[1]}" data-lng="${point[2]}" aria-label="Карта Антальи"><div class="dd-map-intro"><h3>Анталья<br>Конья&shy;алты</h3><p role="status" data-map-status>Карта Антальи — Коньяалты</p><button type="button" data-map-open hidden>Повторить загрузку</button><a href="${external}" target="_blank" rel="noopener noreferrer">В Яндекс Картах</a></div></section>`;
    },
  );
  if (maps !== 1) throw new Error(`Expected one original camp map; found ${maps}.`);
  return result.replace('</head>', `<link rel="stylesheet" href="${base}camp-map.css?v=${version}" data-dd-map-style></head>`)
    .replace('</body>', `<script type="module" src="${base}camp-map.js?v=${version}" data-dd-map-script></script></body>`);
}
