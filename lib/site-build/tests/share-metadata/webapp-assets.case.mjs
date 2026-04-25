import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSiteTemp, outputExists } from '../../../testing/share-site.mjs';
import { cleanupTempDir } from '../../../testing/typst.mjs';

test('build emits web app manifest and icon assets for preview output directory', () => {
  const built = buildSiteTemp({ outDirName: '.tmp-share-preview-site-webapp' });

  assert.equal(
    built.result.status,
    0,
    `Expected preview build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );
  assert.ok(outputExists(built.outDirPath, 'manifest.webmanifest'));
  assert.ok(outputExists(built.outDirPath, 'assets/apple-touch-icon.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-192.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-512.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-512-maskable.png'));

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});
