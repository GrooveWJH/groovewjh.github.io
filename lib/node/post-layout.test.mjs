import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT_DIR, createTempDir, cleanupTempDir } from './test-helpers/typst-test-helpers.mjs';

function buildSiteTemp(prefix) {
  const outDirPath = createTempDir(`${prefix}-site-`);
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir(`${prefix}-cache-`);
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync('node', ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  return { outDirPath, cacheRootPath, result };
}

test('build emits nine post layout matrix pages', () => {
  const built = buildSiteTemp('.tmp-post-layout-matrix');

  assert.equal(built.result.status, 0, `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`);

  const matrixIndexPath = join(built.outDirPath, '__test', 'post-layout-matrix', 'index.html');
  assert.ok(existsSync(matrixIndexPath), 'Expected matrix index page to exist');

  const matrixIndexHtml = readFileSync(matrixIndexPath, 'utf8');
  const linkMatches = matrixIndexHtml.match(/\/__test\/post-layout-matrix\/cases\/[^/]+\/"/g) || [];
  assert.equal(linkMatches.length, 9, 'Expected matrix index to link to 9 case pages');

  for (const slug of [
    'baseline-current',
    'desc-0-cover-0-outline-0',
    'desc-0-cover-0-outline-1',
    'desc-0-cover-1-outline-0',
    'desc-0-cover-1-outline-1',
    'desc-1-cover-0-outline-0',
    'desc-1-cover-0-outline-1',
    'desc-1-cover-1-outline-0',
    'desc-1-cover-1-outline-1',
  ]) {
    assert.ok(existsSync(join(built.outDirPath, '__test', 'post-layout-matrix', 'cases', slug, 'index.html')), `Expected case page to exist: ${slug}`);
  }

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});

test('poem pagination keeps the homepage hero header shell', () => {
  const built = buildSiteTemp('.tmp-home-pagination');

  assert.equal(built.result.status, 0, `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`);

  const poemPageTwoHtml = readFileSync(join(built.outDirPath, 'poems', 'page', '2', 'index.html'), 'utf8');
  assert.match(poemPageTwoHtml, /class="homepage-route-shell"/);
  assert.match(poemPageTwoHtml, /class="homepage-header"/);
  assert.match(poemPageTwoHtml, /class="homepage-header-stage"/);
  assert.doesNotMatch(poemPageTwoHtml, /class="homepage-route-title"/);
  assert.doesNotMatch(poemPageTwoHtml, /homepage-filter-standalone/);

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});
