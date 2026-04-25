import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSharePreviewEntry } from '../index.mjs';

test('buildSharePreviewEntry emits encoded public urls for reserved-character slugs', () => {
  const entry = buildSharePreviewEntry({
    outputRel: 'posts/articles/learn_color#1/index.html',
    html: `<!DOCTYPE html>
<html>
  <head>
    <title>学习色彩科学[1]：光的坐标系——主流色彩空间</title>
    <link rel="canonical" href="http://127.0.0.1:5500/posts/articles/learn_color%231/">
    <meta name="description" content="从 RGB 到 OKLCH。色彩空间并不是审美玄学，而是光学计算里不同的坐标系。">
    <meta property="og:title" content="｢学习色彩科学[1]：光的坐标系——主流色彩空间｣ · Groove Blog">
    <meta property="og:type" content="article">
    <meta property="og:image" content="http://127.0.0.1:5500/posts/articles/learn_color%231/img/cover.jpg">
    <meta property="og:site_name" content="Groove Blog">
    <meta property="article:published_time" content="2026-04-20">
  </head>
  <body>
    <div class="post-cover"><img src="/posts/articles/learn_color%231/img/cover.jpg" alt=""></div>
  </body>
</html>`,
  });

  assert.equal(entry.pagePath, '/posts/articles/learn_color%231/');
  assert.equal(entry.imagePath, '/posts/articles/learn_color%231/img/cover.jpg');
  assert.equal(entry.imageUrl, 'http://127.0.0.1:5500/posts/articles/learn_color%231/img/cover.jpg');
  assert.equal(entry.canonicalUrl, 'https://groovewjh.github.io/posts/articles/learn_color%231/');
  assert.equal(entry.qrUrl, 'https://groovewjh.github.io/posts/articles/learn_color%231/');
});
