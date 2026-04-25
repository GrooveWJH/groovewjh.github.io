import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../foundation/temp-dir.mjs';
import { buildAndWriteSharePreview } from '../index.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function extractVersionedAssetPath(indexHtml, pattern) {
  return indexHtml.match(pattern)?.[1] || '';
}

test('buildAndWriteSharePreview version-stamps manifest and runtime asset urls', async () => {
  const outDirPath = createProjectTempDir(ROOT_DIR, '.tmp-share-preview-versioned-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);

  const first = await buildAndWriteSharePreview({ outDirName, shareOrigin: 'local' });
  const firstHtml = readFileSync(first.previewIndexPath, 'utf8');
  const firstManifestPath = extractVersionedAssetPath(firstHtml, /data-manifest-url="([^"]+)"/);
  const firstAppPath = extractVersionedAssetPath(firstHtml, /<script type="module" src="([^"]+)"><\/script>/);

  const second = await buildAndWriteSharePreview({ outDirName, shareOrigin: 'local', noBuild: true });
  const secondHtml = readFileSync(second.previewIndexPath, 'utf8');
  const secondManifestPath = extractVersionedAssetPath(secondHtml, /data-manifest-url="([^"]+)"/);
  const secondAppPath = extractVersionedAssetPath(secondHtml, /<script type="module" src="([^"]+)"><\/script>/);

  rmSync(outDirPath, { recursive: true, force: true });

  assert.match(firstManifestPath, /^\.\/manifest\.[^/]+\.json$/);
  assert.match(firstAppPath, /^\.\/runtime\/[^/]+\/app\.mjs$/);
  assert.match(secondManifestPath, /^\.\/manifest\.[^/]+\.json$/);
  assert.match(secondAppPath, /^\.\/runtime\/[^/]+\/app\.mjs$/);
  assert.notEqual(firstManifestPath, secondManifestPath);
  assert.notEqual(firstAppPath, secondAppPath);
});
