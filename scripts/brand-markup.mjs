import { readFileSync } from 'node:fs';

// Four unchanged DD paths, cropped from the supplied DD CAMP master.
// Provenance: docs/interface-finish-2026-10-26.md.
export const ddBrandMark = readFileSync(new URL('../site/media/dd-mark.svg', import.meta.url), 'utf8')
  .trim().replace('<svg ', '<svg class="dd-brand-mark" aria-hidden="true" focusable="false" ');
