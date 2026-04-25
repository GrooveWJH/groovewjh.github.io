import { DEFAULT_CACHE_ROOT } from '../catalog/specs.mjs';

export function parseCliArgs(argv = process.argv.slice(2)) {
  let cacheRoot = DEFAULT_CACHE_ROOT;
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--cache-root') {
      cacheRoot = argv[index + 1] || DEFAULT_CACHE_ROOT;
      index += 1;
      continue;
    }

    if (arg === '--force') {
      force = true;
    }
  }

  return { cacheRoot, force };
}
