import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSharePreviewEntry } from '../index.mjs';

test('buildSharePreviewEntry prefers Typst cover metadata over HTML cover readback for articles', () => {
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
    <meta property="og:image" content="http://127.0.0.1:5500/posts/articles/learn_color%231/cover.jpg">
    <meta property="og:site_name" content="Groove Blog">
    <meta property="article:published_time" content="2026-04-20">
  </head>
  <body>
    <div class="post-cover"><img src="/posts/articles/learn_color%231/cover.jpg" alt=""></div>
  </body>
</html>`,
    post: {
      slug: 'articles/learn_color#1',
      url: '/posts/articles/learn_color%231/',
      title: '学习色彩科学[1]：光的坐标系——主流色彩空间',
      description: '从 RGB 到 OKLCH。色彩空间并不是审美玄学，而是光学计算里不同的坐标系。',
      date: '2026-04-20',
      cover: 'img/cover.jpg',
      resolvedCoverPath: '/posts/articles/learn_color#1/img/cover.jpg',
      resolvedPublicCoverPath: '/posts/articles/learn_color%231/img/cover.jpg',
    },
  });

  assert.equal(entry.pagePath, '/posts/articles/learn_color%231/');
  assert.equal(entry.rawPagePath, '/posts/articles/learn_color#1/');
  assert.equal(entry.imagePath, '/posts/articles/learn_color%231/img/cover.jpg');
  assert.equal(entry.imageUrl, 'http://127.0.0.1:5500/posts/articles/learn_color%231/img/cover.jpg');
});

test('buildSharePreviewEntry prefers Typst descriptionText over flattened HTML metadata for articles', () => {
  const entry = buildSharePreviewEntry({
    outputRel: 'posts/articles/content-desc/index.html',
    html: `<!DOCTYPE html>
<html>
  <head>
    <title>Content Desc</title>
    <link rel="canonical" href="http://127.0.0.1:5500/posts/articles/content-desc/">
    <meta name="description" content="第一行 第二行">
    <meta property="og:title" content="｢Content Desc｣ · Groove Blog">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Groove Blog">
    <meta property="article:published_time" content="2026-04-23">
  </head>
  <body></body>
</html>`,
    post: {
      slug: 'articles/content-desc',
      url: '/posts/articles/content-desc/',
      title: 'Content Desc',
      description: '第一行 第二行',
      descriptionText: '第一行\n第二行',
      date: '2026-04-23',
      cover: '',
      resolvedCoverPath: '',
      resolvedPublicCoverPath: '',
    },
  });

  assert.equal(entry.description, '第一行 第二行');
  assert.equal(entry.descriptionText, '第一行\n第二行');
});
