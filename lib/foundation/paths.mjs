import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizePosixPath } from './fs.mjs';

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const POSTS_DIR = join(ROOT_DIR, 'posts');
export const PAGES_DIR = join(ROOT_DIR, 'pages');
export const ASSETS_DIR = join(ROOT_DIR, 'assets');
export const TYPE_TOOLCHAIN_DIR = join(ROOT_DIR, 'lib', 'typst-render');

export function resolveSafeBuildSubdir(rootDir, rawPath, optionLabel) {
  const rawText = String(rawPath ?? '').trim();
  if (!rawText) {
    throw new Error(`${optionLabel} cannot be empty`);
  }

  if (isAbsolute(rawText)) {
    throw new Error(`${optionLabel} must be a relative path inside repository root: ${rawText}`);
  }

  const resolvedPath = resolve(rootDir, rawText);
  const relPath = normalizePosixPath(relative(rootDir, resolvedPath));

  if (!relPath || relPath === '.' || relPath === '..' || relPath.startsWith('../')) {
    throw new Error(`${optionLabel} must resolve to a subdirectory inside repository root: ${rawText}`);
  }

  return {
    rawText,
    resolvedPath,
    relPath,
  };
}
