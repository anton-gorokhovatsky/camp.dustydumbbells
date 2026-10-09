import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Preserve the comparison pages against their original, pre-integration composition.
export async function readBaseline(root, release) {
  return (await readFile(path.join(root, 'experiments/baseline.html'), 'utf8'))
    .replaceAll('{{BASE}}', release.base)
    .replaceAll('{{SITE}}', release.site)
    .replaceAll('{{REVISION}}', release.commit);
}
