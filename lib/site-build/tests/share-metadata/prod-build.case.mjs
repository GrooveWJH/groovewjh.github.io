import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSiteTemp, extractHead, outputExists, readOutputHtml } from '../../../testing/share-site.mjs';
import { cleanupTempDir } from '../../../testing/typst.mjs';

test('build emits normalized production share metadata for pages and posts', () => {
  const built = buildSiteTemp({ shareOrigin: 'prod', fontMode: 'release' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const homeHead = extractHead(readOutputHtml(built.outDirPath, 'index.html'));
  const preludeHead = extractHead(readOutputHtml(built.outDirPath, 'posts/articles/prelude/index.html'));

  assert.match(homeHead, /<meta property="og:title" content="｢首页｣ · Groove Blog">/);
  assert.match(
    homeHead,
    /<meta property="og:image" content="https:\/\/groovewjh\.github\.io\/assets\/og-default\.png">/,
  );
  assert.match(homeHead, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(homeHead, /<link rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png">/);
  assert.match(homeHead, /<meta name="application-name" content="Groove Blog">/);
  assert.match(homeHead, /<meta name="apple-mobile-web-app-title" content="Groove Blog">/);
  assert.match(homeHead, /<meta name="apple-mobile-web-app-capable" content="yes">/);
  assert.match(homeHead, /<meta name="mobile-web-app-capable" content="yes">/);
  assert.match(homeHead, /<meta name="color-scheme" content="light dark">/);
  assert.match(homeHead, /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="#f4f4f4">/);
  assert.match(homeHead, /<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#262626">/);
  assert.match(preludeHead, /<meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">/);
  assert.match(preludeHead, /<meta name="twitter:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">/);
  assert.match(
    preludeHead,
    /<link rel="canonical" href="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/">/,
  );
  assert.match(
    preludeHead,
    /<meta property="og:url" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/">/,
  );
  assert.match(
    preludeHead,
    /<meta property="og:image" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/img\/cover\.jpeg">/,
  );
  assert.match(
    preludeHead,
    /<meta name="twitter:image" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/img\/cover\.jpeg">/,
  );
  assert.match(preludeHead, /<link rel="preload" href="\/assets\/fonts\/noto-serif-sc-basic-400\.woff2"/);
  assert.match(preludeHead, /<link rel="preload" href="\/assets\/fonts\/noto-serif-sc-non-basic-400\.woff2"/);
  assert.match(preludeHead, /<link rel="preload" href="\/assets\/fonts\/site-kai-non-basic-400\.woff2"/);
  assert.doesNotMatch(preludeHead, /<link rel="preload" href="\/assets\/fonts\/site-kai-basic-400\.woff2"/);
  assert.ok(outputExists(built.outDirPath, 'posts/articles/prelude/img/cover.jpeg'));
  assert.ok(outputExists(built.outDirPath, 'assets/apple-touch-icon.png'));
  assert.ok(outputExists(built.outDirPath, 'manifest.webmanifest'));

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});
