import { liveMapFrame, productionSite } from './map-policy.js';
import { mapboxPublicToken } from './mapbox-config.js';
import { trustedMapPalette, paintMap } from './map-palette.js';

const message = document.querySelector('#map-message');
let parentHref = '';
try { if (window.parent !== window) parentHref = window.parent.location.href; } catch {}
const allowed = liveMapFrame(location.href, parentHref, window.parent !== window, navigator.webdriver);
let map = null, failed = false, ready = false;
let palette = null, marker = null;
const applyPalette = () => {
  if (!ready || !palette || failed) return;
  paintMap(map, palette);
  const root = document.documentElement;
  root.style.colorScheme = palette.scheme;
  root.dataset.ddMapScheme = palette.scheme;
  for (const key of ['land', 'ink', 'accent']) root.style.setProperty(`--dd-map-${key}`, palette[key]);
  // The default marker's public DOM keeps its original shape and white centre.
  marker?.getElement().querySelector('svg path[fill]')?.setAttribute('fill', palette.accent);
};

function fail(text, reason, httpStatus) {
  if (failed) return;
  failed = true;
  map?.remove();
  message.hidden = false;
  message.textContent = text;
  if (window.parent !== window) {
    // Never send Error/message/URL: resource URLs can contain the public access token.
    const status = Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus <= 599 ? httpStatus : null;
    window.parent.postMessage({type: 'dd-map-error', reason, status}, location.origin);
  }
}

if (!allowed) {
  fail('В этом режиме карта отключена. Запросов к Mapbox нет.', 'policy');
} else if (!/^pk\.[A-Za-z0-9._-]+$/.test(mapboxPublicToken)) {
  fail('Карта временно недоступна.', 'credentials');
} else {
  window.addEventListener('message', event => {
    const next = trustedMapPalette(event, window.parent, new URL(productionSite).origin);
    if (next) { palette = next; applyPalette(); }
  });
  // These are the only remote loads. Nothing above this policy gate contacts Mapbox.
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css';
  document.head.append(style);
  const script = document.createElement('script');
  script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js';
  script.onerror = () => fail('Не удалось загрузить карту.', 'sdk');
  script.onload = () => {
    try {
      if (!mapboxgl.supported()) { fail('Карта недоступна в этом браузере.', 'unsupported'); return; }
      map = new mapboxgl.Map({
        accessToken: mapboxPublicToken,
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [30.63773, 36.863249],
        zoom: 12,
        cooperativeGestures: true,
        attributionControl: true,
      });
      // Keep zoom clear of the site's floating menu when the map reaches the viewport top.
      map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'bottom-right');
      marker = new mapboxgl.Marker({color: '#b21818'}).setLngLat([30.63773, 36.863249]).addTo(map);
      marker.getElement().setAttribute('aria-label', 'Район кэмпа — Коньяалты');
      map.once('load', () => {
        if (failed) return;
        ready = true;
        message.hidden = true;
        applyPalette();
        window.parent.postMessage({type: 'dd-map-ready'}, location.origin);
      });
      map.on('error', event => { if (!ready) fail('Не удалось загрузить карту.', 'resource', event.error?.status); });
    } catch { fail('Карта недоступна в этом браузере.', 'initialization'); }
  };
  document.head.append(script);
}
