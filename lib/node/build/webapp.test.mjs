import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSiteTemp, outputExists } from '../test-helpers/share-test-helpers.mjs';
import { cleanupTempDir } from '../test-helpers/typst-test-helpers.mjs';

test('release build emits cross-platform web app artifacts', () => {
  const built = buildSiteTemp({ shareOrigin: 'prod', outDirName: '.tmp-share-webapp-release-check' });

  assert.equal(
    built.result.status,
    0,
    `Expected release-style build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );
  assert.ok(outputExists(built.outDirPath, 'manifest.webmanifest'));
  assert.ok(outputExists(built.outDirPath, 'assets/apple-touch-icon.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-192.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-512.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-512-maskable.png'));

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});
