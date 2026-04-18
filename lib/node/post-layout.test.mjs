import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return mkdtempSync(join(ROOT_DIR, prefix));
}

function buildTypstHtml({ sourceText, inputs = [] }) {
  const tempDir = createTempDir('.tmp-post-layout-html-');
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.html');

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

test('template-post html renders description in header and cover before outline', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Layout Check",
  description: "Header description",
  cover: "/assets/favicon.png",
  outline-enabled: true,
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

= 第一节

正文。
`,
    inputs: [
      ['page-path', 'posts/layout-check'],
    ],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  assert.match(compiled.html, /class="post-header-description"/);
  assert.match(compiled.html, /Header description/);
  assert.match(compiled.html, /class="post-cover"/);
  assert.match(compiled.html, /<img[^>]+src="\/assets\/favicon\.png"/);
  assert.match(compiled.html, /style="width: 75%; height: auto;"/);
  assert.doesNotMatch(compiled.html, /data:image\/png;base64/i);

  const coverIndex = compiled.html.indexOf('class="post-cover"');
  const outlineIndex = compiled.html.indexOf('role="doc-toc"');

  assert.notEqual(coverIndex, -1);
  assert.notEqual(outlineIndex, -1);
  assert.ok(coverIndex < outlineIndex, 'Expected cover to render before outline');

  rmSync(compiled.tempDir, { recursive: true, force: true });
});

test('template-post html uses default width for image-object cover', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Default Width",
  description: "Header description",
  cover: image("/assets/favicon.png"),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/layout-check-image-default'],
    ],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile with image-object cover to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  assert.match(compiled.html, /<img[^>]+src="\/assets\/favicon\.png"/);
  assert.match(compiled.html, /style="width: 75%; height: auto;"/);

  rmSync(compiled.tempDir, { recursive: true, force: true });
});

test('template-post html uses explicit percentage width for image-object cover', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Width",
  description: "Header description",
  outline-enabled: true,
  cover: image("/assets/favicon.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

= 第一节

正文。
`,
    inputs: [
      ['page-path', 'posts/layout-check-image-width'],
    ],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile with percentage image-object cover to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  assert.match(compiled.html, /<img[^>]+src="\/assets\/favicon\.png"/);
  assert.match(compiled.html, /style="width: 60%; height: auto;"/);

  const coverIndex = compiled.html.indexOf('class="post-cover"');
  const outlineIndex = compiled.html.indexOf('role="doc-toc"');
  assert.notEqual(coverIndex, -1);
  assert.notEqual(outlineIndex, -1);
  assert.ok(coverIndex < outlineIndex, 'Expected cover to render before outline');

  rmSync(compiled.tempDir, { recursive: true, force: true });
});

test('template-post html rejects non-percentage image-object cover width', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Invalid Width",
  description: "Header description",
  cover: image("/assets/favicon.png", width: 120pt),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/layout-check-image-invalid'],
    ],
  });

  assert.notEqual(compiled.result.status, 0, 'Expected html compile with non-percentage image cover width to fail');
  assert.match(compiled.result.stderr, /cover width/i);

  rmSync(compiled.tempDir, { recursive: true, force: true });
});

test('template-post html omits description node when description is empty', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Layout Check",
  description: "",
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/layout-check-empty-desc'],
    ],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  assert.doesNotMatch(compiled.html, /class="post-header-description"/);

  rmSync(compiled.tempDir, { recursive: true, force: true });
});

test('build emits nine post layout matrix pages', () => {
  const outDirPath = createTempDir('.tmp-post-layout-matrix-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-post-layout-cache-');
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync('node', ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected build to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const matrixIndexPath = join(outDirPath, '__test', 'post-layout-matrix', 'index.html');
  assert.ok(existsSync(matrixIndexPath), 'Expected matrix index page to exist');

  const matrixIndexHtml = readFileSync(matrixIndexPath, 'utf8');
  const linkMatches = matrixIndexHtml.match(/\/__test\/post-layout-matrix\/cases\/[^/]+\/"/g) || [];
  assert.equal(linkMatches.length, 9, 'Expected matrix index to link to 9 case pages');

  const expectedCases = [
    'baseline-current',
    'desc-0-cover-0-outline-0',
    'desc-0-cover-0-outline-1',
    'desc-0-cover-1-outline-0',
    'desc-0-cover-1-outline-1',
    'desc-1-cover-0-outline-0',
    'desc-1-cover-0-outline-1',
    'desc-1-cover-1-outline-0',
    'desc-1-cover-1-outline-1',
  ];

  for (const slug of expectedCases) {
    const casePath = join(outDirPath, '__test', 'post-layout-matrix', 'cases', slug, 'index.html');
    assert.ok(existsSync(casePath), `Expected case page to exist: ${slug}`);
  }

  rmSync(outDirPath, { recursive: true, force: true });
  rmSync(cacheRootPath, { recursive: true, force: true });
});

test('poem pagination keeps the homepage hero header shell', () => {
  const outDirPath = createTempDir('.tmp-home-pagination-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-home-pagination-cache-');
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync('node', ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected build to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const poemPageTwoHtml = readFileSync(join(outDirPath, 'poems', 'page', '2', 'index.html'), 'utf8');

  assert.match(poemPageTwoHtml, /class="homepage-route-shell"/);
  assert.match(poemPageTwoHtml, /class="homepage-header"/);
  assert.match(poemPageTwoHtml, /class="homepage-header-stage"/);
  assert.doesNotMatch(poemPageTwoHtml, /class="homepage-route-title"/);
  assert.doesNotMatch(poemPageTwoHtml, /homepage-filter-standalone/);

  rmSync(outDirPath, { recursive: true, force: true });
  rmSync(cacheRootPath, { recursive: true, force: true });
});
