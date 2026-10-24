export const productionSite = '{{SITE}}';

// Fail closed. A preview URL can never opt in to billable Mapbox requests.
export function liveMapPage(href, automated = false, site = productionSite) {
  try {
    const url = new URL(href), allowed = new URL(site);
    return !automated && url.origin === allowed.origin && url.pathname === allowed.pathname && !url.search;
  } catch { return false; }
}

export function liveMapFrame(href, parentHref, framed, automated = false, site = productionSite) {
  try {
    const url = new URL(href), allowed = new URL('map.html', site);
    return framed && !automated && url.origin === allowed.origin && url.pathname === allowed.pathname &&
      !url.search && liveMapPage(parentHref, automated, site);
  } catch { return false; }
}
