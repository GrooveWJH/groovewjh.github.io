import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTypstHtml, cleanupTempDir } from '../../../testing/typst.mjs';

test('template-post html renders description in header and cover before outline', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Layout Check",
  description: "Header description",
  cover: "/assets/favicon.png",
  outline-enabled: true,
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

= 第一节

正文。
`,
    inputs: [['page-path', 'posts/layout-check']],
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
  assert.ok(compiled.html.indexOf('class="post-cover"') < compiled.html.indexOf('role="doc-toc"'));

  cleanupTempDir(compiled.tempDir);
});

test('template-post html marks articles that start with a cover', () => {
  const withCover = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Cover State",
  cover: "/assets/favicon.png",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [['page-path', 'posts/cover-state']],
  });

  assert.equal(
    withCover.result.status,
    0,
    `Expected cover html compile to succeed.\nstdout:\n${withCover.result.stdout}\nstderr:\n${withCover.result.stderr}`,
  );
  assert.match(withCover.html, /<article class="[^"]*\bhas-cover\b[^"]*">/);
  cleanupTempDir(withCover.tempDir);

  const withoutCover = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "No Cover State",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [['page-path', 'posts/no-cover-state']],
  });

  assert.equal(
    withoutCover.result.status,
    0,
    `Expected no-cover html compile to succeed.\nstdout:\n${withoutCover.result.stdout}\nstderr:\n${withoutCover.result.stderr}`,
  );
  assert.doesNotMatch(withoutCover.html, /<article class="[^"]*\bhas-cover\b[^"]*">/);
  cleanupTempDir(withoutCover.tempDir);
});

test('template-post html preserves explicit linebreaks in content descriptions', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Content Description Check",
  description: [第一行#linebreak()第二行],
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 23),
)

正文。
`,
    inputs: [['page-path', 'posts/content-description-check']],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  assert.match(compiled.html, /<p class="post-header-description">第一行<br>第二行<\/p>/);

  cleanupTempDir(compiled.tempDir);
});

test('template-post html uses image-object cover widths and omits empty description nodes', () => {
  const defaultWidth = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Default Width",
  description: "Header description",
  cover: image("/assets/favicon.png"),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [['page-path', 'posts/layout-check-image-default']],
  });

  assert.equal(
    defaultWidth.result.status,
    0,
    `Expected default width html compile to succeed.\nstdout:\n${defaultWidth.result.stdout}\nstderr:\n${defaultWidth.result.stderr}`,
  );
  assert.match(defaultWidth.html, /style="width: 75%; height: auto;"/);
  cleanupTempDir(defaultWidth.tempDir);

  const explicitWidth = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Width",
  description: "",
  outline-enabled: true,
  cover: image("/assets/favicon.png", width: 60%),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

= 第一节

正文。
`,
    inputs: [['page-path', 'posts/layout-check-image-width']],
  });

  assert.equal(
    explicitWidth.result.status,
    0,
    `Expected explicit width html compile to succeed.\nstdout:\n${explicitWidth.result.stdout}\nstderr:\n${explicitWidth.result.stderr}`,
  );
  assert.match(explicitWidth.html, /style="width: 60%; height: auto;"/);
  assert.doesNotMatch(explicitWidth.html, /class="post-header-description"/);
  assert.ok(explicitWidth.html.indexOf('class="post-cover"') < explicitWidth.html.indexOf('role="doc-toc"'));
  cleanupTempDir(explicitWidth.tempDir);
});

test('template-post html rejects non-percentage image-object cover width', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Invalid Width",
  description: "Header description",
  cover: image("/assets/favicon.png", width: 120pt),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [['page-path', 'posts/layout-check-image-invalid']],
  });

  assert.notEqual(compiled.result.status, 0);
  assert.match(compiled.result.stderr, /cover width/i);
  cleanupTempDir(compiled.tempDir);
});
