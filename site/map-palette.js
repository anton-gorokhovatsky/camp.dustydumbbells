import { channels, mix, contrast } from './palette-colours.js';

export const mapPaletteType = 'dd-map-palette/v1';
const colourKeys = ['land', 'water', 'park', 'building', 'road', 'edge', 'ink', 'accent'];
const hex = /^#[0-9a-f]{6}$/i;

// Only a fixed set of colours crosses the frame boundary. No CSS, URLs,
// credentials, weather payloads or commands can be conveyed by this message.
export function normaliseMapPalette(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== colourKeys.length + 1
    || !['light', 'dark'].includes(value.scheme)
    || !colourKeys.every(key => typeof value[key] === 'string' && hex.test(value[key]))) return null;
  return Object.fromEntries([['scheme', value.scheme], ...colourKeys.map(key => [key, value[key].toLowerCase()])]);
}

function readable(colour, surfaces, light, minimum) {
  for (let step = 0; step <= 100; step++) {
    const next = mix(colour, light ? '#ffffff' : '#000000', step / 100);
    if (surfaces.every(surface => contrast(next, surface) >= minimum)) return next;
  }
  return null;
}

export function mapPalette(css) {
  const land = css['--dd-page'], blue = css['--dd-blue'], red = css['--dd-red'];
  if (![land, blue, red].every(value => typeof value === 'string' && hex.test(value))) return null;
  const dark = css['--dd-scheme'] === 'dark';
  let water = mix(land, dark ? '#244466' : '#7db6c9', dark ? .37 : .43);
  let park = mix(land, dark ? '#36574f' : '#8ead95', .23);
  let building = mix(land, dark ? '#657084' : '#a4a4a1', dark ? .15 : .18);
  let road = mix(land, dark ? '#a5b5cb' : '#ffffff', dark ? .17 : .65);
  // Twilight expands the palette through middle-light fields. Keep the map's
  // material range on the same side of the shared foreground as its land.
  for(let attempt=0;attempt<10;attempt++){
    const surfaces=[land,water,park,building,road];
    const ink=readable(hex.test(css['--dd-ink'] || '')?css['--dd-ink']:blue,surfaces,dark,4.5);
    if(ink)return normaliseMapPalette({scheme:dark?'dark':'light',land,water,park,building,road,
      edge:readable(mix(blue,land,.6),surfaces,dark,1.5)||ink,ink,
      accent:readable(red,surfaces,dark,3)||ink});
    water=mix(land,water,.5);park=mix(land,park,.5);
    building=mix(land,building,.5);road=mix(land,road,.5);
  }
  return null;
}

export const mapPaletteKey = value => JSON.stringify(normaliseMapPalette(value));

export function trustedMapPalette(event, parent, origin) {
  if (event.source !== parent || event.origin !== origin || event.data?.type !== mapPaletteType) return null;
  return normaliseMapPalette(event.data.palette);
}

// Preserve Streets' geometry, labels, sources, filters and zoom-dependent widths.
// Updating paint on the already loaded map does not initialise another Map.
export function paintMap(map, palette) {
  const p = normaliseMapPalette(palette);
  if (!p) return 0;
  let count = 0;
  const paint = (id, property, value) => {
    try { map.setPaintProperty(id, property, value); count++; } catch { /* Unknown future layers retain their own paint. */ }
  };
  for (const layer of map.getStyle()?.layers || []) {
    const source = layer['source-layer'] || '';
    if (layer.type === 'background') paint(layer.id, 'background-color', p.land);
    if (layer.type === 'fill') {
      let colour;
      if (source === 'water') colour = p.water;
      else if (['landcover', 'national_park', 'landuse_overlay'].includes(source)) colour = p.park;
      else if (source === 'landuse') colour = ['match', ['get', 'class'],
        ['park','wood','grass','scrub','agriculture','national_park','cemetery','pitch'], p.park, p.land];
      else if (source === 'building') colour = p.building;
      else if (['aeroway', 'road'].includes(source)) colour = p.road;
      else if (source === 'structure') colour = p.land;
      else if (source === 'depth') colour = ['interpolate', ['linear'], ['zoom'], 6,
        ['interpolate', ['linear'], ['get', 'min_depth'], 0, ['rgba', ...channels(p.water), .35],
          7000, ['rgba', ...channels(mix(p.water, '#000000', .15)), .35]],
        8, ['rgba', ...channels(p.water), 0]];
      if (colour) paint(layer.id, 'fill-color', colour);
      if (source === 'building') paint(layer.id, 'fill-outline-color', p.edge);
    }
    if (layer.type === 'fill-extrusion' && source === 'building') paint(layer.id, 'fill-extrusion-color', p.building);
    if (layer.type === 'line') {
      if (source === 'waterway') paint(layer.id, 'line-color', p.water);
      else if (['road', 'aeroway'].includes(source)) paint(layer.id, 'line-color', /case|casing|path|rail/.test(layer.id) ? p.edge : p.road);
      else if (source === 'admin') paint(layer.id, 'line-color', p.edge);
      else if (source === 'structure') paint(layer.id, 'line-color', p.land);
      else if (source === 'landuse') paint(layer.id, 'line-color', p.edge);
    }
    if (layer.type === 'circle' && source === 'road') {
      paint(layer.id, 'circle-color', p.road);
      if (layer.paint?.['circle-stroke-color']) paint(layer.id, 'circle-stroke-color', p.edge);
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      paint(layer.id, 'text-color', p.ink);
      paint(layer.id, 'text-halo-color', /water|marine/.test(layer.id) ? p.water : p.land);
    }
  }
  return count;
}
