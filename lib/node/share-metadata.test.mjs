import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return mkdtempSync(join(ROOT_DIR, prefix));
}

function compileTypstHtml({ sourceText, outputName = 'out.html', inputs = [], extraFiles = [] }) {
  const tempDir = createTempDir('.tmp-share-metadata-');
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, outputName);

  for (const file of extraFiles) {
    const targetPath = join(tempDir, file.target);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(file.from, targetPath);
  }

  writeFileSync(sourcePath, sourceText, 'utf8');

  const args = [
    'compile',
    '--root',
    '.',
    '--font-path',
    '@fonts',
    '--font-path',
    'fonts-src',
    '--features',
    'html',
    '--format',
    'html',
  ];

  for (const [key, value] of inputs) {
    args.push('--input', `${key}=${value}`);
  }

  args.push(relative(ROOT_DIR, sourcePath), relative(ROOT_DIR, outputPath));

  const result = spawnSync('typst', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  return {
    tempDir,
    outputPath,
    html: existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '',
    result,
  };
}

function buildSiteTemp({ shareOrigin = 'local' } = {}) {
  const outDirPath = createTempDir('.tmp-share-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-share-cache-');
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

function extractHead(html) {
  const match = html.match(/<head>([\s\S]*?)<\/head>/i);
  return match ? match[1] : '';
}

function readOutputHtml(outDirPath, relPath) {
  return readFileSync(join(outDirPath, relPath), 'utf8');
}

test('template-post metadata JSON includes cover and resolvedCoverPath', () => {
  const compiled = compileTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Cover Check",
  description: "",
  cover: "img/cover.png",
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-cover-check'],
      ['emit-post-meta', 'true'],
    ],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected metadata html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  const bodyMatch = compiled.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const jsonMatch = (bodyMatch ? bodyMatch[1] : compiled.html).match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] || '{}');

  rmSync(compiled.tempDir, { recursive: true, force: true });

  assert.equal(parsed.cover, 'img/cover.png');
  assert.equal(parsed.resolvedCoverPath, '/posts/articles/metadata-cover-check/img/cover.png');
});

test('template-post metadata JSON extracts source path from image-object cover', () => {
  const compiled = compileTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Image Cover Check",
  description: "",
  cover: image("img/cover.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-image-cover-check'],
      ['emit-post-meta', 'true'],
    ],
    extraFiles: [
      {
        from: join(ROOT_DIR, 'assets', 'favicon.png'),
        target: 'img/cover.png',
      },
    ],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected metadata html compile for image-object cover to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  const bodyMatch = compiled.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const jsonMatch = (bodyMatch ? bodyMatch[1] : compiled.html).match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] || '{}');

  rmSync(compiled.tempDir, { recursive: true, force: true });

  assert.equal(parsed.cover, 'img/cover.png');
  assert.equal(parsed.resolvedCoverPath, '/posts/articles/metadata-image-cover-check/img/cover.png');
});

test('share metadata helpers normalize article and no-site-url cases', async () => {
  const {
    buildSharePayload,
    extractArticleSummary,
    rewriteHtmlShareHead,
  } = await import('./build/share.mjs');

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

  const withoutSiteUrl = buildSharePayload({
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

  assert.equal(withoutSiteUrl.canonicalUrl, null);
  assert.equal(withoutSiteUrl.ogUrl, null);
  assert.equal(withoutSiteUrl.ogImage, null);
  assert.equal(withoutSiteUrl.ogTitle, '｢首页｣ · Groove Blog');
  assert.equal(withoutSiteUrl.twitterTitle, '｢首页｣ · Groove Blog');
  assert.equal(withoutSiteUrl.twitterImage, null);
  assert.equal(withoutSiteUrl.twitterCard, 'summary');

  const rewritten = rewriteHtmlShareHead(articleHtml, articlePayload);
  const rewrittenHead = extractHead(rewritten);

  assert.match(rewrittenHead, /<link rel="canonical" href="https:\/\/groovewjh\.github\.io\/posts\/articles\/drone-needs-2026\/">/);
  assert.match(rewrittenHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(rewrittenHead, /<meta property="og:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/);
  assert.match(rewrittenHead, /<meta name="twitter:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/);
  assert.doesNotMatch(rewrittenHead, /posts\/posts/);
});

test('build emits normalized local share metadata and non-inline post cover html', () => {
  const built = buildSiteTemp({ shareOrigin: 'local' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const homeHtml = readOutputHtml(built.outDirPath, 'index.html');
  const aboutHtml = readOutputHtml(built.outDirPath, 'about/index.html');
  const droneHtml = readOutputHtml(built.outDirPath, 'posts/articles/drone-needs-2026/index.html');
  const preludeHtml = readOutputHtml(built.outDirPath, 'posts/articles/prelude/index.html');
  const noCoverNoDesc0 = readOutputHtml(built.outDirPath, '__test/post-layout-matrix/cases/desc-0-cover-0-outline-0/index.html');
  const noCoverNoDesc1 = readOutputHtml(built.outDirPath, '__test/post-layout-matrix/cases/desc-0-cover-0-outline-1/index.html');

  const homeHead = extractHead(homeHtml);
  const aboutHead = extractHead(aboutHtml);
  const droneHead = extractHead(droneHtml);
  const preludeHead = extractHead(preludeHtml);
  const noCoverNoDesc0Head = extractHead(noCoverNoDesc0);
  const noCoverNoDesc1Head = extractHead(noCoverNoDesc1);

  assert.match(homeHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(homeHead, /<meta property="og:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta name="twitter:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta name="twitter:description" content="站点首页">/);
  assert.match(homeHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);

  assert.match(aboutHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(aboutHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);

  assert.match(droneHead, /<link rel="canonical" href="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/">/);
  assert.match(droneHead, /<meta property="og:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/);
  assert.match(droneHead, /<meta name="twitter:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/);
  assert.match(droneHead, /<meta property="og:url" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/">/);
  assert.match(droneHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/img\/cover\.png">/);
  assert.match(droneHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/img\/cover\.png">/);
  assert.match(droneHead, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(droneHead, /<meta name="twitter:description" content="本文内容来源于个人零碎随笔，由AI整理润色发布。">/);
  assert.doesNotMatch(droneHead, /posts\/posts/);

  assert.match(preludeHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.match(preludeHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.match(preludeHtml, /<div class="post-cover">[\s\S]*?<img[^>]+src="\/posts\/articles\/prelude\/img\/cover\.jpeg"/);
  assert.doesNotMatch(preludeHtml, /data:image\/png;base64/i);
  assert.ok(existsSync(join(built.outDirPath, 'posts/articles/prelude/img/cover.jpeg')));

  assert.match(noCoverNoDesc0Head, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);
  assert.match(noCoverNoDesc1Head, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);

  const noCoverSummary0 = noCoverNoDesc0Head.match(/<meta name="twitter:description" content="([^"]+)">/)?.[1];
  const noCoverSummary1 = noCoverNoDesc1Head.match(/<meta name="twitter:description" content="([^"]+)">/)?.[1];
  assert.equal(noCoverSummary0, noCoverSummary1);

  rmSync(built.outDirPath, { recursive: true, force: true });
  rmSync(built.cacheRootPath, { recursive: true, force: true });
});

test('build emits normalized production share metadata for pages and posts', () => {
  const built = buildSiteTemp({ shareOrigin: 'prod' });

  assert.equal(
    built.result.status,
    0,
    `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`,
  );

  const homeHtml = readOutputHtml(built.outDirPath, 'index.html');
  const preludeHtml = readOutputHtml(built.outDirPath, 'posts/articles/prelude/index.html');

  const homeHead = extractHead(homeHtml);
  const preludeHead = extractHead(preludeHtml);

  assert.match(homeHead, /<meta property="og:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta property="og:image" content="https:\/\/groovewjh\.github\.io\/assets\/og-default\.png">/);
  assert.match(preludeHead, /<meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">/);
  assert.match(preludeHead, /<meta name="twitter:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">/);
  assert.match(preludeHead, /<link rel="canonical" href="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/">/);
  assert.match(preludeHead, /<meta property="og:url" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/">/);
  assert.match(preludeHead, /<meta property="og:image" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.match(preludeHead, /<meta name="twitter:image" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.ok(existsSync(join(built.outDirPath, 'posts/articles/prelude/img/cover.jpeg')));

  rmSync(built.outDirPath, { recursive: true, force: true });
  rmSync(built.cacheRootPath, { recursive: true, force: true });
});
