import { createHash } from 'node:crypto';

import { FONT_CACHE_VERSION, FONT_GENERATOR_VERSION } from '../catalog/specs.mjs';

export function computeContentHash(value) {
  const hash = createHash('sha256');
  if (Buffer.isBuffer(value)) {
    hash.update(value);
  } else {
    hash.update(String(value), 'utf8');
  }
  return hash.digest('hex');
}

export function computeFontArtifactFingerprint({ slug, weight, suffix, sourceHash, textHash }) {
  return computeContentHash(
    [FONT_CACHE_VERSION, FONT_GENERATOR_VERSION, slug, String(weight), suffix, sourceHash, textHash].join('\0'),
  );
}
