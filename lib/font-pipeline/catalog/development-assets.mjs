import { basename, extname } from 'node:path';

import { FONT_SPECS } from './specs.mjs';

function inferFontFormat(sourcePath) {
  const extension = extname(sourcePath).toLowerCase();
  if (extension === '.otf') {
    return 'opentype';
  }

  if (extension === '.ttf') {
    return 'truetype';
  }

  return 'unknown';
}

export function getDevelopmentFontAssetDescriptors() {
  const descriptors = [];

  for (const spec of FONT_SPECS) {
    for (const [weight, sourcePath] of Object.entries(spec.source)) {
      descriptors.push({
        familyName: spec.familyName,
        slug: spec.slug,
        weight: Number(weight),
        sourcePath,
        fileName: basename(sourcePath),
        format: inferFontFormat(sourcePath),
      });
    }
  }

  descriptors.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return descriptors;
}
