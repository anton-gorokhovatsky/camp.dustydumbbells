// Billing is allowed only here, independently of SITE_URL or preview build settings.
export const productionSite = 'https://anton-gorokhovatsky.github.io/camp.dustydumbbells/';

// Only ordinary production parameters are accepted. QA modes fail closed.
function productionParameters(parameters) {
  const seen = new Set();
  for (const [key, value] of parameters) {
    if (seen.has(key)) return false;
    seen.add(key);
    if ((key === 'v' || key === 'release') && /^[a-f0-9]{7,40}$/i.test(value)) continue;
    if (/^utm_(?:source|medium|campaign|content|term)$/.test(key)) continue;
    return false;
  }
  return true;
}

export function liveMapPage(href, automated = false) {
  try {
    const url = new URL(href), allowed = new URL(productionSite);
    return !automated && url.origin === allowed.origin && url.pathname === allowed.pathname && productionParameters(url.searchParams);
  } catch { return false; }
}

export function liveMapFrame(href, parentHref, framed, automated = false) {
  try {
    const url = new URL(href), allowed = new URL('map.html', productionSite);
    return framed && !automated && url.origin === allowed.origin && url.pathname === allowed.pathname &&
      !url.search && liveMapPage(parentHref, automated);
  } catch { return false; }
}
