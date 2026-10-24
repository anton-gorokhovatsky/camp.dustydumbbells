import { liveMapPage, productionSite } from './map-policy.js';

const container = document.querySelector('[data-dd-map]');
if (container) {
  const button = container.querySelector('[data-map-open]');
  const status = container.querySelector('[data-map-status]');
  let started = false;
  button.addEventListener('click', event => {
    if (started || !event.isTrusted) return;
    if (!liveMapPage(location.href, navigator.webdriver)) {
      status.hidden = false;
      status.textContent = 'В предпросмотре карта отключена: запросов к Mapbox нет.';
      return;
    }
    started = true;
    button.disabled = true;
    status.hidden = false;
    status.textContent = 'Загружаем карту…';
    const frame = document.createElement('iframe');
    frame.src = new URL('map.html', productionSite).href;
    frame.title = 'Карта Антальи — Коньяалты';
    frame.className = 'dd-map-frame';
    frame.referrerPolicy = 'same-origin';
    container.append(frame);
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      if (event.data?.type === 'dd-map-ready') {
        container.querySelector('.dd-map-intro').hidden = true;
      } else if (event.data?.type === 'dd-map-error') {
        frame.remove();
        status.textContent = 'Карта не загрузилась. Откройте её в Яндекс Картах.';
      }
    });
  });
}
