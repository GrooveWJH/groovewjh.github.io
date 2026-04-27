import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../foundation/temp-dir.mjs';
import { buildAndWriteSharePreview } from '../index.mjs';
import { PREVIEW_TOOL_REL_DIR, writeSharePreviewTool } from '../build/writer.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function extractVersionedAssetPath(indexHtml, pattern) {
  return indexHtml.match(pattern)?.[1] || '';
}

function buildSiteTemp({ shareOrigin = 'local' } = {}) {
  const outDirPath = createProjectTempDir(ROOT_DIR, '.tmp-share-preview-versioned-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createProjectTempDir(ROOT_DIR, '.tmp-share-preview-cache-');
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

test('writeSharePreviewTool rotates the preview runtime version even when manifest data is unchanged', async () => {
  const outDirPath = createProjectTempDir(ROOT_DIR, '.tmp-share-preview-write-version-');
  mkdirSync(outDirPath, { recursive: true });
  const manifest = {
    generatedAt: '2026-04-27T00:00:00.000Z',
    platforms: ['imessagePlus'],
    pages: [],
  };

  const firstIndexPath = writeSharePreviewTool(outDirPath, manifest);
  const firstHtml = readFileSync(firstIndexPath, 'utf8');
  const firstAppPath = extractVersionedAssetPath(firstHtml, /<script type="module" src="([^"]+)"><\/script>/);
  const firstVersion = JSON.parse(readFileSync(join(outDirPath, PREVIEW_TOOL_REL_DIR, 'version.json'), 'utf8')).version;

  await new Promise((resolve) => setTimeout(resolve, 12));

  const secondIndexPath = writeSharePreviewTool(outDirPath, manifest);
  const secondHtml = readFileSync(secondIndexPath, 'utf8');
  const secondAppPath = extractVersionedAssetPath(secondHtml, /<script type="module" src="([^"]+)"><\/script>/);
  const secondVersion = JSON.parse(readFileSync(join(outDirPath, PREVIEW_TOOL_REL_DIR, 'version.json'), 'utf8')).version;

  rmSync(outDirPath, { recursive: true, force: true });

  assert.notEqual(firstVersion, secondVersion);
  assert.notEqual(firstAppPath, secondAppPath);
});

test('buildAndWriteSharePreview version-stamps manifest and runtime asset urls', async () => {
  const built = buildSiteTemp({ shareOrigin: 'local' });

  assert.equal(
    built.result.status,
    0,
    `Expected temp site build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const first = await buildAndWriteSharePreview({ outDirName: built.outDirName, shareOrigin: 'local', noBuild: true });
  const firstHtml = readFileSync(first.previewIndexPath, 'utf8');
  const firstManifestPath = extractVersionedAssetPath(firstHtml, /data-manifest-url="([^"]+)"/);
  const firstAppPath = extractVersionedAssetPath(firstHtml, /<script type="module" src="([^"]+)"><\/script>/);

  const second = await buildAndWriteSharePreview({ outDirName: built.outDirName, shareOrigin: 'local', noBuild: true });
  const secondHtml = readFileSync(second.previewIndexPath, 'utf8');
  const secondManifestPath = extractVersionedAssetPath(secondHtml, /data-manifest-url="([^"]+)"/);
  const secondAppPath = extractVersionedAssetPath(secondHtml, /<script type="module" src="([^"]+)"><\/script>/);

  rmSync(built.outDirPath, { recursive: true, force: true });
  rmSync(built.cacheRootPath, { recursive: true, force: true });

  assert.match(firstManifestPath, /^\.\/manifest\.[^/]+\.json$/);
  assert.match(firstAppPath, /^\.\/runtime\/[^/]+\/app\.mjs$/);
  assert.match(secondManifestPath, /^\.\/manifest\.[^/]+\.json$/);
  assert.match(secondAppPath, /^\.\/runtime\/[^/]+\/app\.mjs$/);
  assert.notEqual(firstManifestPath, secondManifestPath);
  assert.notEqual(firstAppPath, secondAppPath);
});
