import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../../foundation/temp-dir.mjs';
import { buildSharePreviewEntry } from '../../index.mjs';
import { buildExportFileName, renderPlatformCardSvg, wrapSvgInSquareCanvas } from '../../runtime/renderers/index.mjs';
import { createPreludeEntry } from '../helpers.mjs';

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

test('buildSharePreviewEntry preserves actual share payload fields from built html', () => {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Prelude——美好祝愿的开始</title>
    <link rel="canonical" href="http://127.0.0.1:5500/posts/articles/prelude/">
    <meta name="description" content="那时候，你就会明白，一切我们爱过与恨过的，其实并没有什么不同。">
    <meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">
    <meta property="og:type" content="article">
    <meta property="og:url" content="http://127.0.0.1:5500/posts/articles/prelude/">
    <meta property="og:image" content="http://127.0.0.1:5500/posts/articles/prelude/img/cover.jpeg">
    <meta property="og:site_name" content="Groove Blog">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="article:published_time" content="2026-03-02">
  </head>
  <body>
    <article class="post-article">
      <section>
        <div class="post-cover"><img src="/posts/articles/prelude/img/cover.jpeg" alt="Prelude——美好祝愿的开始"></div>
      </section>
    </article>
  </body>
</html>`;

  const entry = buildSharePreviewEntry({
    outputRel: 'posts/articles/prelude/index.html',
    html,
  });

  assert.equal(entry.id, 'posts-articles-prelude');
  assert.equal(entry.pageKind, 'article');
  assert.equal(entry.pagePath, '/posts/articles/prelude/');
  assert.equal(entry.sourceTitle, 'Prelude——美好祝愿的开始');
  assert.equal(entry.shareTitle, '｢Prelude——美好祝愿的开始｣ · Groove Blog');
  assert.equal(entry.description, '那时候，你就会明白，一切我们爱过与恨过的，其实并没有什么不同。');
  assert.equal(entry.imagePath, '/posts/articles/prelude/img/cover.jpeg');
  assert.equal(entry.imageUrl, 'http://127.0.0.1:5500/posts/articles/prelude/img/cover.jpeg');
  assert.equal(entry.imageWidth, null);
  assert.equal(entry.imageHeight, null);
  assert.equal(entry.canonicalUrl, 'https://groovewjh.github.io/posts/articles/prelude/');
  assert.equal(entry.siteName, 'Groove Blog');
  assert.equal(entry.publishedTime, '2026-03-02');
  assert.equal(entry.qrUrl, 'https://groovewjh.github.io/posts/articles/prelude/');
  assert.equal(entry.platforms.imessagePlus.displayDescription, true);
  assert.deepEqual(Object.keys(entry.platforms), ['imessagePlus']);
});

test('renderPlatformCardSvg renders iMessage+ with description and expected export naming', () => {
  const entry = buildSharePreviewEntry({
    outputRel: 'posts/articles/prelude/index.html',
    html: `<!DOCTYPE html>
<html>
  <head>
    <title>Prelude——美好祝愿的开始</title>
    <link rel="canonical" href="http://127.0.0.1:5500/posts/articles/prelude/">
    <meta name="description" content="那时候，你就会明白，一切我们爱过与恨过的，其实并没有什么不同。">
    <meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">
    <meta property="og:type" content="article">
    <meta property="og:image" content="http://127.0.0.1:5500/posts/articles/prelude/img/cover.jpeg">
    <meta property="og:site_name" content="Groove Blog">
    <meta name="twitter:card" content="summary_large_image">
  </head>
  <body><div class="post-cover"><img src="/posts/articles/prelude/img/cover.jpeg"></div></body>
</html>`,
  });

  const imessagePlusSvg = renderPlatformCardSvg(entry, 'imessagePlus');

  assert.match(imessagePlusSvg, /那时候，你就会明白/);
  assert.match(imessagePlusSvg, /｢Prelude——美好祝愿的开始｣/);
  assert.match(imessagePlusSvg, /<tspan x="42" dy="0">Groove Blog<\/tspan>/);
  assert.match(
    imessagePlusSvg,
    /data-part="imessage-content-column"[^>]*clip-path="url\(#imessage-content-column-clip\)"/,
  );
  assert.match(imessagePlusSvg, /preserveAspectRatio="xMidYMin slice"/);
  assert.equal(buildExportFileName(entry, 'imessagePlus'), 'posts-articles-prelude__imessage-plus.png');
});

test('renderPlatformCardSvg preserves multiline description rows from managed HTML metadata without post sidecar data', () => {
  const entry = buildSharePreviewEntry({
    outputRel: 'posts/articles/prelude/index.html',
    html: `<!DOCTYPE html>
<html>
  <head>
    <title>Prelude——美好祝愿的开始</title>
    <link rel="canonical" href="http://127.0.0.1:5500/posts/articles/prelude/">
    <meta name="description" content="那时候，你就会明白，一切我们爱过与恨过的，其实并没有什么不同。">
    <meta name="typ-blog:description-text" content="那时候，你就会明白，&#10;一切我们爱过与恨过的，&#10;其实并没有什么不同。">
    <meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">
    <meta property="og:type" content="article">
    <meta property="og:image" content="http://127.0.0.1:5500/posts/articles/prelude/img/cover.jpeg">
    <meta property="og:site_name" content="Groove Blog">
    <meta name="twitter:card" content="summary_large_image">
  </head>
  <body><div class="post-cover"><img src="/posts/articles/prelude/img/cover.jpeg"></div></body>
</html>`,
  });

  const imessagePlusSvg = renderPlatformCardSvg(entry, 'imessagePlus');

  assert.match(imessagePlusSvg, /<tspan x="42" dy="0">那时候，你就会明白，<\/tspan>/);
  assert.match(imessagePlusSvg, /<tspan x="42" dy="22">一切我们爱过与恨过的，<\/tspan>/);
  assert.match(imessagePlusSvg, /<tspan x="42" dy="22">其实并没有什么不同。<\/tspan>/);
});

test('renderPlatformCardSvg keeps the non-square card background transparent outside the rounded card', () => {
  const entry = createPreludeEntry();

  const defaultSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    squareCanvas: false,
  });
  const squareSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    squareCanvas: true,
  });

  assert.doesNotMatch(defaultSvg, /<rect width="600" height="\d+" fill="#edf1f7"><\/rect>/);
  assert.match(squareSvg, /<rect width="\d+" height="\d+" fill="#edf1f7"><\/rect>/);
});

test('renderPlatformCardSvg adds a subtle outward feather for transparent non-square exports', () => {
  const entry = createPreludeEntry();

  const defaultSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    squareCanvas: false,
  });
  const squareSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    squareCanvas: true,
  });

  assert.match(defaultSvg, /id="imessage-edge-feather"/);
  assert.match(defaultSvg, /data-part="imessage-card-feather"/);
  assert.doesNotMatch(squareSvg, /id="imessage-edge-feather"/);
  assert.doesNotMatch(squareSvg, /data-part="imessage-card-feather"/);
});

test('wrapSvgInSquareCanvas centers a landscape card inside a square export canvas', () => {
  const wrapped = wrapSvgInSquareCanvas(
    '<svg viewBox="0 0 600 380" width="600" height="380"><rect width="600" height="380" fill="#fff"></rect></svg>',
  );

  assert.match(wrapped, /viewBox="0 0 600 600"/);
  assert.match(wrapped, /<rect width="600" height="600" fill="#edf1f7"><\/rect>/);
  assert.match(wrapped, /<g transform="translate\(0 110\)"/);
});

test('buildSharePreviewEntry supports pages without description and falls back to a local image path', () => {
  const entry = buildSharePreviewEntry({
    outputRel: 'demo/index.html',
    html: `<!DOCTYPE html>
<html>
  <head>
    <title>Demo Page</title>
    <link rel="canonical" href="http://127.0.0.1:5500/demo/">
    <meta property="og:title" content="｢Demo Page｣ · Groove Blog">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Groove Blog">
    <meta name="twitter:card" content="summary">
  </head>
  <body>
    <div class="post-cover"><img src="/assets/og-default.png" alt=""></div>
  </body>
</html>`,
  });

  assert.equal(entry.pageKind, 'page');
  assert.equal(entry.description, null);
  assert.equal(entry.imagePath, '/assets/og-default.png');
  assert.equal(entry.imageUrl, null);
  assert.equal(entry.canonicalUrl, 'https://groovewjh.github.io/demo/');
  assert.equal(entry.qrUrl, 'https://groovewjh.github.io/demo/');
  assert.equal(entry.platforms.imessagePlus.displayDescription, false);
  assert.deepEqual(Object.keys(entry.platforms), ['imessagePlus']);
});
