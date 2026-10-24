// Billing is allowed only here, independently of SITE_URL or preview build settings.
export const productionSite = 'https://anton-gorokhovatsky.github.io/camp.dustydumbbells/';

// Fail closed. A preview URL can never opt in to billable Mapbox requests.
export function liveMapPage(href, automated = false) {
  try {
    const url = new URL(href), allowed = new URL(productionSite);
    return !automated && url.origin === allowed.origin && url.pathname === allowed.pathname && !url.search;
  } catch { return false; }
}

export function liveMapFrame(href, parentHref, framed, automated = false) {
  try {
    const url = new URL(href), allowed = new URL('map.html', productionSite);
    return framed && !automated && url.origin === allowed.origin && url.pathname === allowed.pathname &&
      !url.search && liveMapPage(parentHref, automated);
  } catch { return false; }
}
