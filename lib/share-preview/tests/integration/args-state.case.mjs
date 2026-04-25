import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../../foundation/temp-dir.mjs';
import { parseSharePreviewArgs } from '../../index.mjs';
import { createPreviewState } from '../../runtime/ui/state.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return createProjectTempDir(ROOT_DIR, prefix);
}

function _buildSiteTemp({ shareOrigin = 'local' } = {}) {
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

test('parseSharePreviewArgs uses preview defaults and accepts explicit overrides', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'share-card-preview'];

  try {
    const defaults = parseSharePreviewArgs();
    assert.equal(defaults.outDirName, '_site');
    assert.equal(defaults.shareOrigin, 'local');
    assert.equal(defaults.noBuild, false);
    assert.equal(defaults.defaultPage, null);
  } finally {
    process.argv = originalArgv;
  }

  process.argv = [
    'node',
    'share-card-preview',
    '--out',
    '_site-preview',
    '--share-origin',
    'prod',
    '--no-build',
    '--page',
    'posts/articles/prelude/',
  ];

  try {
    const explicit = parseSharePreviewArgs();
    assert.equal(explicit.outDirName, '_site-preview');
    assert.equal(explicit.shareOrigin, 'prod');
    assert.equal(explicit.noBuild, true);
    assert.equal(explicit.defaultPage, 'posts/articles/prelude/');
  } finally {
    process.argv = originalArgv;
  }
});

test('createPreviewState defaults to square canvas with description and qr enabled', () => {
  const state = createPreviewState(
    {
      pages: [{ id: 'posts-articles-prelude', pagePath: '/posts/articles/prelude/' }],
    },
    null,
  );

  assert.equal(state.squareCanvas, true);
  assert.equal(state.cornerSize, 25);
  assert.equal(state.activeInspectorPanel, 'review');
  assert.deepEqual(state.displayOptions, {
    description: true,
    url: false,
    date: false,
    qr: true,
  });
  assert.deepEqual(state.exportOptions, {
    width: 4000,
    height: 4000,
  });
});
