function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDefaultPageValue(value) {
  const normalized = collapseWhitespace(value).replace(/^\/+/, '');
  if (!normalized) {
    return null;
  }

  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

export function parseSharePreviewArgs(argv = process.argv.slice(2)) {
  let outDirName = '_site';
  let shareOrigin = 'local';
  let noBuild = false;
  let defaultPage = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--out' || arg === '-o') {
      outDirName = argv[index + 1] || '_site';
      index += 1;
      continue;
    }

    if (arg === '--share-origin') {
      const value = String(argv[index + 1] || '')
        .trim()
        .toLowerCase();
      shareOrigin = value === 'prod' ? 'prod' : 'local';
      index += 1;
      continue;
    }

    if (arg === '--page') {
      defaultPage = normalizeDefaultPageValue(argv[index + 1] || '');
      index += 1;
      continue;
    }

    if (arg === '--no-build') {
      noBuild = true;
    }
  }

  return {
    outDirName,
    shareOrigin,
    noBuild,
    defaultPage,
  };
}

export function shouldShowSharePreviewHelp(argv = process.argv.slice(2)) {
  return argv.some((arg) => arg === '--help' || arg === '-h');
}

export function printSharePreviewHelp(writeLine = console.log) {
  writeLine(`Share Card Preview

Usage:
  node scripts/share-card-preview.mjs
  node scripts/share-card-preview.mjs --out _site-preview --share-origin prod
  node scripts/share-card-preview.mjs --no-build --out _site
  node scripts/share-card-preview.mjs --page posts/articles/prelude/

Options:
  -o, --out          Output directory (default: _site)
      --share-origin Share-card origin: local | prod (default: local)
      --no-build     Reuse an existing built site instead of building first
      --page         Default selected page path or slug
  -h, --help         Show this help message
`);
}
