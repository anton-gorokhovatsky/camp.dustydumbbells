import { liveMapFrame } from './map-policy.js';
import { mapboxPublicToken } from './mapbox-config.js';

const message = document.querySelector('#map-message');
let parentHref = '';
try { if (window.parent !== window) parentHref = window.parent.location.href; } catch {}
const allowed = liveMapFrame(location.href, parentHref, window.parent !== window, navigator.webdriver);
let map = null, failed = false, ready = false;

function fail(text) {
  if (failed) return;
  failed = true;
  map?.remove();
  message.hidden = false;
  message.textContent = text;
  if (window.parent !== window) window.parent.postMessage({type: 'dd-map-error'}, location.origin);
}

if (!allowed) {
  message.textContent = 'В этом режиме карта отключена. Запросов к Mapbox нет.';
} else if (!/^pk\.[A-Za-z0-9._-]+$/.test(mapboxPublicToken)) {
  fail('Карта временно недоступна.');
} else {
  // These are the only remote loads. Nothing above this policy gate contacts Mapbox.
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.css';
  document.head.append(style);
  const script = document.createElement('script');
  script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.33.0/mapbox-gl.js';
  script.onerror = () => fail('Не удалось загрузить карту.');
  script.onload = () => {
    try {
      if (!mapboxgl.supported()) { fail('Карта недоступна в этом браузере.'); return; }
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
      new mapboxgl.Marker({color: '#b21818'}).setLngLat([30.63773, 36.863249]).addTo(map);
      map.once('load', () => {
        if (failed) return;
        ready = true;
        message.hidden = true;
        window.parent.postMessage({type: 'dd-map-ready'}, location.origin);
      });
      map.on('error', () => { if (!ready) fail('Не удалось загрузить карту.'); });
    } catch { fail('Карта недоступна в этом браузере.'); }
  };
  document.head.append(script);
}
