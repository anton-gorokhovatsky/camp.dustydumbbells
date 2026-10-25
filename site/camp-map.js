import { liveMapPage, productionSite } from './map-policy.js';
import { mapPalette, normaliseMapPalette, mapPaletteKey, mapPaletteType } from './map-palette.js';

/** One map per production visit. Preview/automation never creates a frame. */
export function mountCampMap(container, runtime) {
  const button = container.querySelector('[data-map-open]');
  const status = container.querySelector('[data-map-status]');
  const intro = container.querySelector('.dd-map-intro');
  const allowed = liveMapPage(runtime.href, runtime.automated);
  let state = 'idle', frame = null, timer = null;
  let lastPalette = null;
  const sendPalette = () => {
    if (state !== 'ready' || !frame || !runtime.readPalette) return;
    const palette = normaliseMapPalette(runtime.readPalette());
    if (!palette) return;
    const key = mapPaletteKey(palette);
    if (key === lastPalette) return;
    frame.contentWindow.postMessage({ type: mapPaletteType, palette }, new URL(productionSite).origin);
    lastPalette = key;
  };
  const failureReasons = new Set(['policy', 'credentials', 'sdk', 'unsupported', 'initialization', 'resource', 'timeout']);
  let stopObserving = () => {};
  const setState = next => { state = next; container.dataset.mapState = next; };
  const clearTimer = () => { if (timer !== null) runtime.clearTimeout(timer); timer = null; };
  const fail = (reason, httpStatus) => {
    if (state === 'ready') return;
    container.dataset.mapError = failureReasons.has(reason) ? reason : 'resource';
    if (Number.isInteger(httpStatus) && httpStatus >= 400 && httpStatus <= 599) container.dataset.mapHttpStatus = String(httpStatus);
    else delete container.dataset.mapHttpStatus;
    clearTimer();
    frame?.remove();
    frame = null;
    lastPalette = null;
    setState('error');
    intro.hidden = false;
    status.hidden = false;
    status.textContent = 'Карта не загрузилась. Попробуйте ещё раз или откройте её в Яндекс Картах.';
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Повторить загрузку';
  };
  const start = () => {
    if (!allowed || state === 'loading' || state === 'ready') return;
    setState('loading');
    delete container.dataset.mapError;
    delete container.dataset.mapHttpStatus;
    stopObserving();
    intro.hidden = false;
    button.hidden = true;
    button.disabled = true;
    status.hidden = false;
    status.textContent = 'Загружаем карту…';
    frame = runtime.createFrame();
    lastPalette = null;
    frame.src = new URL('map.html', productionSite).href;
    frame.title = 'Карта Антальи — Коньяалты';
    frame.className = 'dd-map-frame';
    frame.referrerPolicy = 'same-origin';
    timer = runtime.setTimeout(() => fail('timeout'), 25000);
    container.append(frame);
  };
  button.addEventListener('click', event => { if (event.isTrusted) start(); });
  if (!allowed) {
    setState('preview');
    status.hidden = false;
    status.textContent = 'В предпросмотре карта отключена: запросов к Mapbox нет.';
    button.hidden = true;
    return;
  }
  runtime.listenMessage(event => {
    if (!frame || event.origin !== new URL(productionSite).origin || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'dd-map-ready') {
      clearTimer();
      setState('ready');
      intro.hidden = true;
      sendPalette();
    } else if (event.data?.type === 'dd-map-error' && state !== 'ready') fail(event.data.reason, event.data.status);
  });
  runtime.observePalette?.(sendPalette);
  setState('idle');
  stopObserving = runtime.observe(() => { if (state === 'idle') start(); });
}

if (typeof document !== 'undefined') {
  const container = document.querySelector('[data-dd-map]');
  if (container) mountCampMap(container, {
    href: location.href,
    automated: navigator.webdriver,
    createFrame: () => document.createElement('iframe'),
    listenMessage: listener => window.addEventListener('message', listener),
    setTimeout: (callback, delay) => window.setTimeout(callback, delay),
    clearTimeout: id => window.clearTimeout(id),
    readPalette: () => {
      const style = getComputedStyle(document.documentElement);
      return mapPalette(Object.fromEntries(['--dd-page','--dd-blue','--dd-red','--dd-ink','--dd-scheme']
        .map(name => [name, style.getPropertyValue(name).trim()])));
    },
    observePalette: changed => document.documentElement.addEventListener('dd-palette-change', changed),
    observe: start => {
      let inView = false;
      const check = () => { if (inView && document.visibilityState === 'visible') start(); };
      const onViewport = () => {
        const box = container.getBoundingClientRect();
        inView = box.top < innerHeight && box.bottom > 0 && box.width > 0;
        check();
      };
      document.addEventListener('visibilitychange', check);
      if (!('IntersectionObserver' in window)) {
        window.addEventListener('scroll', onViewport, { passive: true });
        window.addEventListener('resize', onViewport);
        queueMicrotask(onViewport);
        return () => {
          document.removeEventListener('visibilitychange', check);
          window.removeEventListener('scroll', onViewport);
          window.removeEventListener('resize', onViewport);
        };
      }
      const observer = new IntersectionObserver(entries => {
        const entry = entries.find(entry => entry.target === container);
        if (!entry) return;
        inView = entry.isIntersecting && entry.intersectionRect.height > 0 && entry.intersectionRect.width > 0;
        check();
      });
      observer.observe(container);
      return () => { observer.disconnect(); document.removeEventListener('visibilitychange', check); };
    },
  });
}
