import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT_DIR } from '../../node/build/constants.mjs';
import { normalizePosixPath } from '../../node/build/helpers.mjs';
import { FONT_SPECS } from '../catalog/specs.mjs';
import { computeContentHash } from './fingerprint.mjs';

export function ensureSourcesExist() {
  const missing = [];

  for (const spec of FONT_SPECS) {
    for (const sourcePath of Object.values(spec.source)) {
      if (!existsSync(sourcePath)) {
        missing.push(sourcePath);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing font sources:\n- ${missing.join('\n- ')}`);
  }
}

function makeSourceFingerprint(sourcePath) {
  const stats = statSync(sourcePath);
  return {
    path: normalizePosixPath(relative(ROOT_DIR, sourcePath)),
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    hash: computeContentHash(readFileSync(sourcePath)),
  };
}

export function collectSourceFingerprints() {
  const fingerprints = [];

  for (const spec of FONT_SPECS) {
    for (const sourcePath of Object.values(spec.source)) {
      fingerprints.push(makeSourceFingerprint(sourcePath));
    }
  }

  fingerprints.sort((a, b) => a.path.localeCompare(b.path));
  return fingerprints;
}

export function buildSourceFingerprintMap(sourceFingerprints) {
  return new Map(sourceFingerprints.map((fingerprint) => [join(ROOT_DIR, fingerprint.path), fingerprint]));
}
