import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildSharePreviewEntry, collectSharePreviewManifestSync, parseSharePreviewArgs } from './share-preview.mjs';
import { buildExportFileName, renderPlatformCardSvg, wrapSvgInSquareCanvas } from './share-preview/runtime/renderers/index.mjs';
import { createPreviewState } from './share-preview/runtime/ui/state.mjs';
import { createProjectTempDir } from './tmp-dir.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return createProjectTempDir(ROOT_DIR, prefix);
}

function buildSiteTemp({ shareOrigin = 'local' } = {}) {
  const outDirPath = createTempDir('.tmp-share-preview-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-share-preview-cache-');
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync('node', ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName, '--share-origin', shareOrigin], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  return {
    outDirName,
    outDirPath,
    cacheRootPath,
    result,
  };
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

  process.argv = ['node', 'share-card-preview', '--out', '_site-preview', '--share-origin', 'prod', '--no-build', '--page', 'posts/articles/prelude/'];

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
  const state = createPreviewState({
    pages: [
      { id: 'posts-articles-prelude', pagePath: '/posts/articles/prelude/' },
    ],
  }, null);

  assert.equal(state.squareCanvas, true);
  assert.equal(state.descriptionBreakStartIndex, null);
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
  assert.match(imessagePlusSvg, /data-part="imessage-content-column"[^>]*clip-path="url\(#imessage-content-column-clip\)"/);
  assert.match(imessagePlusSvg, /preserveAspectRatio="xMidYMin slice"/);
  assert.equal(buildExportFileName(entry, 'imessagePlus'), 'posts-articles-prelude__imessage-plus.png');
});
test('wrapSvgInSquareCanvas centers a landscape card inside a square export canvas', () => {
  const wrapped = wrapSvgInSquareCanvas('<svg viewBox="0 0 600 380" width="600" height="380"><rect width="600" height="380" fill="#fff"></rect></svg>');

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

test('share-card-preview script emits preview page and manifest for an existing build', () => {
  const built = buildSiteTemp({ shareOrigin: 'local' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const result = spawnSync('node', ['scripts/share-card-preview.mjs', '--no-build', '--out', built.outDirName, '--page', 'posts/articles/prelude/'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected share preview script to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const previewIndexPath = join(built.outDirPath, '__tools', 'share-preview', 'index.html');
  const manifestPath = join(built.outDirPath, '__tools', 'share-preview', 'manifest.json');
  const appPath = join(built.outDirPath, '__tools', 'share-preview', 'app.mjs');
  const runtimeStylesPath = join(built.outDirPath, '__tools', 'share-preview', 'styles.css');
  const rendererPath = join(built.outDirPath, '__tools', 'share-preview', 'renderers', 'index.mjs');
  const imessageRendererPath = join(built.outDirPath, '__tools', 'share-preview', 'renderers', 'imessage.mjs');
  const configPath = join(built.outDirPath, '__tools', 'share-preview', 'config.mjs');
  const qrHelperPath = join(built.outDirPath, '__tools', 'share-preview', 'qr-code.mjs');
  const slackRendererPath = join(built.outDirPath, '__tools', 'share-preview', 'renderers', 'slack.mjs');
  const xRendererPath = join(built.outDirPath, '__tools', 'share-preview', 'renderers', 'x.mjs');
  const discordRendererPath = join(built.outDirPath, '__tools', 'share-preview', 'renderers', 'discord.mjs');
  const exportHelperPath = join(built.outDirPath, '__tools', 'share-preview', 'export', 'png.mjs');
  const colorThiefVendorPath = join(built.outDirPath, '__tools', 'share-preview', 'vendor', 'color-thief.global.js');
  const qrVendorPath = join(built.outDirPath, '__tools', 'share-preview', 'vendor', 'qrcode-generator.min.js');

  assert.ok(existsSync(previewIndexPath), 'Expected preview index page to exist');
  assert.ok(existsSync(manifestPath), 'Expected preview manifest to exist');
  assert.ok(existsSync(appPath), 'Expected runtime app module to exist');
  assert.ok(existsSync(runtimeStylesPath), 'Expected runtime styles to exist');
  assert.ok(existsSync(rendererPath), 'Expected renderer module to exist');
  assert.ok(existsSync(imessageRendererPath), 'Expected iMessage renderer module to exist');
  assert.ok(existsSync(configPath), 'Expected preview runtime config module to exist');
  assert.ok(existsSync(qrHelperPath), 'Expected QR helper module to exist');
  assert.equal(existsSync(slackRendererPath), false, 'Expected Slack renderer module to be removed');
  assert.equal(existsSync(xRendererPath), false, 'Expected X renderer module to be removed');
  assert.equal(existsSync(discordRendererPath), false, 'Expected Discord renderer module to be removed');
  assert.ok(existsSync(exportHelperPath), 'Expected export helper module to exist');
  assert.ok(existsSync(colorThiefVendorPath), 'Expected ColorThief vendor runtime to exist');
  assert.ok(existsSync(qrVendorPath), 'Expected QRCode vendor runtime to exist');

  const previewIndexHtml = readFileSync(previewIndexPath, 'utf8');
  const imessageRendererSource = readFileSync(imessageRendererPath, 'utf8');
  const runtimeConfigSource = readFileSync(configPath, 'utf8');
  const qrHelperSource = readFileSync(qrHelperPath, 'utf8');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const preludeEntry = manifest.pages.find((page) => page.pagePath === '/posts/articles/prelude/');

  rmSync(built.outDirPath, { recursive: true, force: true });
  rmSync(built.cacheRootPath, { recursive: true, force: true });

  assert.match(previewIndexHtml, /data-default-page="posts\/articles\/prelude\/"/);
  assert.match(previewIndexHtml, /<script src="\.\/vendor\/color-thief\.global\.js"><\/script>/);
  assert.match(previewIndexHtml, /carbon-preview-shell/);
  assert.match(previewIndexHtml, /carbon-preview-header/);
  assert.match(previewIndexHtml, /carbon-preview-rail/);
  assert.match(previewIndexHtml, /carbon-preview-toolbar/);
  assert.match(previewIndexHtml, /carbon-preview-bottom-sheet/);
  assert.match(previewIndexHtml, /id="display-options-host"/);
  assert.match(previewIndexHtml, /id="inspector-tabs"/);
  assert.match(previewIndexHtml, /qrcode-generator\.min\.js/);
  assert.match(runtimeConfigSource, /DEFAULT_SHARE_CARD_EXPORT_OPTIONS/);
  assert.match(imessageRendererSource, /data-part="imessage-metadata-panel"/);
  assert.match(imessageRendererSource, /backgroundColor/);
  assert.match(imessageRendererSource, /renderQrOverlay/);
  assert.match(qrHelperSource, /data-part="imessage-qr-overlay"/);
  assert.ok(manifest.pages.length > 0, 'Expected preview manifest to include article pages');
  assert.deepEqual(manifest.platforms, ['imessagePlus']);
  assert.ok(manifest.pages.every((page) => page.pagePath.startsWith('/posts/articles/')), 'Expected preview manifest to only include posts/articles pages');
  assert.ok(preludeEntry, 'Expected prelude entry to exist in preview manifest');
  assert.equal(preludeEntry.shareTitle, '｢Prelude——美好祝愿的开始｣ · Groove Blog');
  assert.equal(preludeEntry.imageUrl, 'http://127.0.0.1:5500/posts/articles/prelude/img/cover.jpeg');
  assert.equal(preludeEntry.canonicalUrl, 'https://groovewjh.github.io/posts/articles/prelude/');
  assert.equal(preludeEntry.qrUrl, 'https://groovewjh.github.io/posts/articles/prelude/');
  assert.ok(preludeEntry.imageWidth > 0);
  assert.ok(preludeEntry.imageHeight > 0);
  assert.deepEqual(Object.keys(preludeEntry.platforms), ['imessagePlus']);
  assert.equal(preludeEntry.platforms.imessagePlus.displayDescription, true);
  assert.equal(preludeEntry.platforms.imessagePlus.hasQr, true);
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
  assert.equal(manifest.pages.some((page) => page.pagePath === '/'), false);
  assert.equal(manifest.pages.some((page) => page.pagePath === '/about/'), false);
});
