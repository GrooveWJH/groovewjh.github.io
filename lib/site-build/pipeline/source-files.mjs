import { existsSync } from 'node:fs';
import { basename, extname, relative } from 'node:path';

import { normalizePosixPath, walkFiles } from '../../foundation/fs.mjs';

export function pagePathToOutputRel(pagePath) {
  const normalized = String(pagePath || '').replace(/^\/+|\/+$/g, '');
  return normalized ? `${normalized}/index.html` : 'index.html';
}

export function collectSourceFiles(sourceDir) {
  if (!existsSync(sourceDir)) {
    return {
      typFiles: [],
      assetFiles: [],
    };
  }

  const files = walkFiles(sourceDir);
  const typFiles = [];
  const assetFiles = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();

    if (ext === '.typ') {
      if (basename(file) === 'index.typ') {
        typFiles.push(file);
      }
      continue;
    }

    if (ext !== '.html') {
      assetFiles.push(file);
    }
  }

  typFiles.sort((a, b) =>
    normalizePosixPath(relative(sourceDir, a)).localeCompare(normalizePosixPath(relative(sourceDir, b))),
  );
  assetFiles.sort((a, b) =>
    normalizePosixPath(relative(sourceDir, a)).localeCompare(normalizePosixPath(relative(sourceDir, b))),
  );

  return { typFiles, assetFiles };
}
