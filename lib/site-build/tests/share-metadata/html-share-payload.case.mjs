import assert from 'node:assert/strict';
import test from 'node:test';
import { extractHead } from '../../../testing/share-site.mjs';

test('share metadata helpers normalize article payloads and canonical tags', async () => {
  const { buildSharePayload, extractArticleSummary, rewriteHtmlShareHead } = await import(
    '../../publish/share/index.mjs'
  );

  const articleHtml = `
    <html>
      <head>
        <title>Old</title>
        <link rel="canonical" href="https://example.com/posts/posts/bad/">
        <meta property="og:title" content="Old">
        <meta property="og:url" content="https://example.com/posts/posts/bad/">
        <meta name="twitter:card" content="summary">
      </head>
      <body>
        <div class="post-header-description">Header description should be ignored</div>
        <article class="post-article">
          <section>
            <div class="post-cover"><img src="data:image/png;base64,abc"></div>
            <p>  第一段   摘要  会  被   规范化。 </p>
            <div class="post-meta">meta</div>
            <p>第二段不应被使用。</p>
          </section>
        </article>
      </body>
    </html>
  `;

  assert.equal(extractArticleSummary(articleHtml), '第一段 摘要 会 被 规范化。');

  const articlePayload = buildSharePayload({
    pageKind: 'article',
    title: '2026年从生产力需求扩大角度看待无人机发展',
    description: '',
    pageUrl: '/posts/articles/drone-needs-2026/',
    activeOrigin: 'https://groovewjh.github.io',
    siteName: 'Groove Blog',
    author: 'Carbon Typst Blog',
    date: '2026-03-18',
    imagePath: '/assets/og-default.png',
    articleHtml,
  });

  assert.equal(articlePayload.canonicalUrl, 'https://groovewjh.github.io/posts/articles/drone-needs-2026/');
  assert.equal(articlePayload.ogUrl, 'https://groovewjh.github.io/posts/articles/drone-needs-2026/');
  assert.equal(articlePayload.ogImage, 'https://groovewjh.github.io/assets/og-default.png');
  assert.equal(articlePayload.ogTitle, '｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog');
  assert.equal(articlePayload.twitterTitle, '｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog');
  assert.equal(articlePayload.twitterCard, 'summary_large_image');
  assert.equal(articlePayload.description, '第一段 摘要 会 被 规范化。');

  const rewritten = rewriteHtmlShareHead(articleHtml, articlePayload);
  const rewrittenHead = extractHead(rewritten);

  assert.match(
    rewrittenHead,
    /<link rel="canonical" href="https:\/\/groovewjh\.github\.io\/posts\/articles\/drone-needs-2026\/">/,
  );
  assert.match(rewrittenHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(
    rewrittenHead,
    /<meta property="og:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/,
  );
  assert.match(
    rewrittenHead,
    /<meta name="twitter:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/,
  );
  assert.doesNotMatch(rewrittenHead, /posts\/posts/);
});

test('share metadata helpers handle missing site origins for pages', async () => {
  const { buildSharePayload } = await import('../../publish/share/index.mjs');

  const payload = buildSharePayload({
    pageKind: 'page',
    title: '首页',
    description: '站点首页',
    pageUrl: '/',
    activeOrigin: null,
    siteName: 'Groove Blog',
    author: 'Carbon Typst Blog',
    imagePath: '/assets/og-default.png',
    articleHtml: '',
  });

  assert.equal(payload.canonicalUrl, null);
  assert.equal(payload.ogUrl, null);
  assert.equal(payload.ogImage, null);
  assert.equal(payload.ogTitle, '｢首页｣ · Groove Blog');
  assert.equal(payload.twitterTitle, '｢首页｣ · Groove Blog');
  assert.equal(payload.twitterImage, null);
  assert.equal(payload.twitterCard, 'summary');
});
