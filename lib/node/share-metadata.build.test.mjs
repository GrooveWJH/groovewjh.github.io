import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildSiteTemp, extractHead, outputExists, readOutputHtml } from './test-helpers/share-test-helpers.mjs';
import { cleanupTempDir } from './test-helpers/typst-test-helpers.mjs';

test('build emits normalized local share metadata and non-inline post cover html', () => {
  const built = buildSiteTemp({ shareOrigin: 'local' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const homeHtml = readOutputHtml(built.outDirPath, 'index.html');
  const homeHead = extractHead(homeHtml);
  const aboutHead = extractHead(readOutputHtml(built.outDirPath, 'about/index.html'));
  const droneHead = extractHead(readOutputHtml(built.outDirPath, 'posts/articles/drone-needs-2026/index.html'));
  const preludeHtml = readOutputHtml(built.outDirPath, 'posts/articles/prelude/index.html');
  const preludeHead = extractHead(preludeHtml);
  const noCoverNoDesc0Head = extractHead(
    readOutputHtml(built.outDirPath, '__test/post-layout-matrix/cases/desc-0-cover-0-outline-0/index.html'),
  );
  const noCoverNoDesc1Head = extractHead(
    readOutputHtml(built.outDirPath, '__test/post-layout-matrix/cases/desc-0-cover-0-outline-1/index.html'),
  );

  assert.match(homeHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(homeHead, /<meta property="og:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta name="twitter:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta name="twitter:description" content="站点首页">/);
  assert.match(homeHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);
  assert.match(homeHead, /<link rel="icon" type="image\/png" href="\/assets\/favicon\.png">/);
  assert.match(homeHead, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(homeHead, /<link rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png">/);
  assert.match(homeHead, /<meta name="application-name" content="Groove Blog">/);
  assert.match(homeHead, /<meta name="apple-mobile-web-app-title" content="Groove Blog">/);
  assert.match(homeHead, /<meta name="apple-mobile-web-app-capable" content="yes">/);
  assert.match(homeHead, /<meta name="mobile-web-app-capable" content="yes">/);
  assert.match(homeHead, /<meta name="color-scheme" content="light dark">/);
  assert.match(homeHead, /<meta name="theme-color" media="\(prefers-color-scheme: light\)" content="#f4f4f4">/);
  assert.match(homeHead, /<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#262626">/);
  assert.match(homeHead, /localStorage\.getItem\('typ-blog-theme-preference'\)/);
  assert.match(homeHead, /root\.setAttribute\('data-theme','gray-10'\)/);
  assert.match(homeHead, /root\.setAttribute\('data-theme','gray-90'\)/);
  assert.match(homeHead, /root\.style\.backgroundColor='#f4f4f4'/);
  assert.match(homeHead, /root\.style\.backgroundColor='#262626'/);
  assert.match(homeHtml, /data-theme-toggle-group="desktop"/);
  assert.match(homeHtml, /data-theme-toggle-group="sidebar"/);
  assert.match(
    homeHtml,
    /<aside class="nav-sidebar">[\s\S]*?<a class="nav-sidebar-item" href="\/">首页<\/a>[\s\S]*?<a class="nav-sidebar-item" href="\/about\/">关于<\/a>[\s\S]*?<div class="nav-theme-toggle nav-theme-toggle-sidebar"/,
  );
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="light"[^>]*aria-label="切换到浅色主题"|aria-label="切换到浅色主题"[^>]*data-theme-preference="light")[^>]*>/,
  );
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="light"[^>]*data-tooltip="浅色"|data-tooltip="浅色"[^>]*data-theme-preference="light")[^>]*>/,
  );
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="dark"[^>]*aria-label="切换到深色主题"|aria-label="切换到深色主题"[^>]*data-theme-preference="dark")[^>]*>/,
  );
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="dark"[^>]*data-tooltip="深色"|data-tooltip="深色"[^>]*data-theme-preference="dark")[^>]*>/,
  );
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="auto"[^>]*aria-label="跟随系统主题"|aria-label="跟随系统主题"[^>]*data-theme-preference="auto")[^>]*>/,
  );
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="auto"[^>]*data-tooltip="自动"|data-tooltip="自动"[^>]*data-theme-preference="auto")[^>]*>/,
  );
  assert.match(homeHtml, /role="radiogroup" aria-label="主题模式"/);
  assert.match(
    homeHtml,
    /<button[^>]*(?:data-theme-preference="auto"[^>]*aria-checked="true"|aria-checked="true"[^>]*data-theme-preference="auto")[^>]*>/,
  );

  assert.match(aboutHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(aboutHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);
  assert.match(aboutHead, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(aboutHead, /<link rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png">/);
  assert.match(aboutHead, /<meta name="apple-mobile-web-app-title" content="Groove Blog">/);

  assert.match(
    droneHead,
    /<link rel="canonical" href="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/">/,
  );
  assert.match(
    droneHead,
    /<meta property="og:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/,
  );
  assert.match(
    droneHead,
    /<meta name="twitter:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/,
  );
  assert.match(
    droneHead,
    /<meta property="og:url" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/">/,
  );
  assert.match(
    droneHead,
    /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/img\/cover\.png">/,
  );
  assert.match(
    droneHead,
    /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/img\/cover\.png">/,
  );
  assert.match(droneHead, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(droneHead, /<meta name="twitter:description" content="本文内容来源于个人零碎随笔，由AI整理润色发布。">/);
  assert.doesNotMatch(droneHead, /posts\/posts/);

  assert.match(
    preludeHead,
    /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/prelude\/img\/cover\.jpeg">/,
  );
  assert.match(
    preludeHead,
    /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/prelude\/img\/cover\.jpeg">/,
  );
  assert.match(preludeHead, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(preludeHead, /<link rel="apple-touch-icon" href="\/assets\/apple-touch-icon\.png">/);
  assert.match(preludeHead, /<meta name="apple-mobile-web-app-title" content="Groove Blog">/);
  assert.match(
    preludeHtml,
    /<div class="post-cover">[\s\S]*?<img[^>]+src="\/posts\/articles\/prelude\/img\/cover\.jpeg"/,
  );
  assert.doesNotMatch(preludeHtml, /data:image\/png;base64/i);
  assert.ok(outputExists(built.outDirPath, 'posts/articles/prelude/img/cover.jpeg'));
  assert.ok(outputExists(built.outDirPath, 'assets/apple-touch-icon.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-192.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-512.png'));
  assert.ok(outputExists(built.outDirPath, 'assets/webapp-icon-512-maskable.png'));
  assert.ok(outputExists(built.outDirPath, 'manifest.webmanifest'));

  const localManifest = JSON.parse(readFileSync(join(built.outDirPath, 'manifest.webmanifest'), 'utf8'));
  assert.equal(localManifest.name, 'Groove Blog');
  assert.equal(localManifest.short_name, 'Groove Blog');
  assert.equal(localManifest.start_url, '/');
  assert.equal(localManifest.scope, '/');
  assert.equal(localManifest.display, 'standalone');
  assert.equal(localManifest.lang, 'zh-cn');
  assert.equal(localManifest.background_color, '#f4f4f4');
  assert.equal(localManifest.theme_color, '#f4f4f4');
  assert.ok(Array.isArray(localManifest.icons) && localManifest.icons.length >= 3);
  assert.ok(
    localManifest.icons.some(
      (icon) => icon.src === '/assets/webapp-icon-512-maskable.png' && icon.purpose === 'maskable',
    ),
  );
  assert.ok(localManifest.icons.every((icon) => outputExists(built.outDirPath, icon.src.replace(/^\//, ''))));

  assert.match(
    noCoverNoDesc0Head,
    /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/,
  );
  assert.match(
    noCoverNoDesc1Head,
    /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/,
  );

  const noCoverSummary0 = noCoverNoDesc0Head.match(/<meta name="twitter:description" content="([^"]+)">/)?.[1];
  const noCoverSummary1 = noCoverNoDesc1Head.match(/<meta name="twitter:description" content="([^"]+)">/)?.[1];
  assert.equal(noCoverSummary0, noCoverSummary1);

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});

test('build emits normalized production share metadata for pages and posts', () => {
  const built = buildSiteTemp({ shareOrigin: 'prod' });

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
  assert.ok(outputExists(built.outDirPath, 'posts/articles/prelude/img/cover.jpeg'));
  assert.ok(outputExists(built.outDirPath, 'assets/apple-touch-icon.png'));
  assert.ok(outputExists(built.outDirPath, 'manifest.webmanifest'));

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});

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
