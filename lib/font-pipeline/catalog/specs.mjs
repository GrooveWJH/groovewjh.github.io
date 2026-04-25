import { join } from 'node:path';

import { PAGES_DIR, POSTS_DIR, ROOT_DIR, TYPE_TOOLCHAIN_DIR } from '../../node/build/constants.mjs';
import { dedupeCodepoints } from '../planning/subset-text.mjs';

export const DEFAULT_CACHE_ROOT = '.typ-blog-cache';
export const FONT_SOURCE_DIR = join(ROOT_DIR, 'fonts-src');
export const FONT_CACHE_VERSION = 1;
export const FONT_GENERATOR_VERSION = 'font-artifacts-v2';
export const FONT_BUILD_MODES = new Set(['auto', 'dev', 'release']);
export const ALLOWED_TEXT_EXTENSIONS = new Set(['.typ', '.md', '.txt']);
export const BASIC_ASCII_TEXT = dedupeCodepoints(
  `${Array.from({ length: 95 }, (_, index) => String.fromCodePoint(0x20 + index)).join('')}\n\r\t`,
);
export const BASIC_UNICODE_RANGE = 'U+0009-000D, U+0020-007E';
export const NON_BASIC_UNICODE_RANGE = 'U+0080-10FFFF';
export const FONT_CSS_OUTPUT_REL = 'fonts.css';
export const FONT_FILES_DIRNAME = 'fonts';
export const POEM_FONT_FAMILY_NAME = 'Site Poem';

export const FONT_SPECS = [
  {
    familyName: 'Site Noto Sans',
    slug: 'noto-sans-sc',
    source: {
      400: join(FONT_SOURCE_DIR, 'NotoSansCJKsc-Regular.otf'),
      700: join(FONT_SOURCE_DIR, 'NotoSansCJKsc-Bold.otf'),
    },
  },
  {
    familyName: 'Site Noto Serif',
    slug: 'noto-serif-sc',
    source: {
      400: join(FONT_SOURCE_DIR, 'NotoSerifCJKsc-Regular.otf'),
      700: join(FONT_SOURCE_DIR, 'NotoSerifCJKsc-Bold.otf'),
    },
  },
  {
    familyName: 'Site Noto Mono',
    slug: 'noto-mono-sc',
    source: {
      400: join(FONT_SOURCE_DIR, 'NotoSansMonoCJKsc-Regular.otf'),
      700: join(FONT_SOURCE_DIR, 'NotoSansMonoCJKsc-Bold.otf'),
    },
  },
  {
    familyName: 'Site Kai',
    slug: 'site-kai',
    source: {
      400: join(FONT_SOURCE_DIR, 'Kaiti.ttf'),
    },
  },
];

export const STATIC_TEXT_SOURCES = [
  join(ROOT_DIR, 'config.typ'),
  POSTS_DIR,
  PAGES_DIR,
  TYPE_TOOLCHAIN_DIR,
  join(ROOT_DIR, 'site.config.json'),
];

export function getFontArtifactPaths(cacheRootPath) {
  const artifactRoot = join(cacheRootPath, 'artifacts', 'fonts');
  return {
    artifactRoot,
    outputDir: join(artifactRoot, FONT_FILES_DIRNAME),
    cssPath: join(artifactRoot, FONT_CSS_OUTPUT_REL),
    manifestPath: join(artifactRoot, 'manifest.json'),
  };
}

export function resolveFontBuildMode(requestedMode = 'auto', env = process.env) {
  if (!FONT_BUILD_MODES.has(requestedMode)) {
    throw new Error(`Unsupported font build mode: ${requestedMode}`);
  }

  if (requestedMode === 'auto') {
    return env.CI ? 'release' : 'dev';
  }

  return requestedMode;
}
