import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../../foundation/temp-dir.mjs';
import { collectSharePreviewManifestSync } from '../../index.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return createProjectTempDir(ROOT_DIR, prefix);
}

function buildSiteTemp({ shareOrigin = 'local' } = {}) {
  const outDirPath = createTempDir('.tmp-share-preview-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-share-preview-cache-');
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync(
    'node',
    ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName, '--share-origin', shareOrigin],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    },
  );

  return {
    outDirName,
    outDirPath,
    cacheRootPath,
    result,
  };
}

function _extractPreviewAssetPath(indexHtml, pattern, label) {
  const matched = indexHtml.match(pattern)?.[1];
  assert.ok(matched, `Expected preview index to include ${label}`);
  return matched;
}

test('build:preview regenerates the share preview tool inside _site-preview', () => {
  const previewOutDirPath = join(ROOT_DIR, '_site-preview');
  rmSync(previewOutDirPath, { recursive: true, force: true });

  const result = spawnSync('npm', ['run', 'build:preview'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected build:preview to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.ok(
    existsSync(join(previewOutDirPath, '__tools', 'share-preview', 'index.html')),
    'Expected build:preview to regenerate the share preview tool.',
  );

  rmSync(previewOutDirPath, { recursive: true, force: true });
});

test('collectSharePreviewManifestSync only includes posts/articles outputs', () => {
  const built = buildSiteTemp({ shareOrigin: 'local' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const manifest = collectSharePreviewManifestSync(built.outDirPath);

  rmSync(built.outDirPath, { recursive: true, force: true });
  rmSync(built.cacheRootPath, { recursive: true, force: true });

  assert.ok(manifest.pages.length > 0, 'Expected article preview entries to exist');
  assert.ok(manifest.pages.every((page) => page.pagePath.startsWith('/posts/articles/')));
  assert.ok(manifest.pages.every((page) => page.imageWidth > 0 && page.imageHeight > 0));
  assert.equal(
    manifest.pages.some((page) => page.pagePath === '/'),
    false,
  );
  assert.equal(
    manifest.pages.some((page) => page.pagePath === '/about/'),
    false,
  );
});
