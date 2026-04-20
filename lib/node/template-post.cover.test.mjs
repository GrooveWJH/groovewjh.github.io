import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_DIR, buildTypstHtml, cleanupTempDir, compileTypstPdfText, compileTypstSvg } from './test-helpers/typst-test-helpers.mjs';

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
    inputs: [['page-path', 'posts/layout-check']],
  });

  assert.equal(compiled.result.status, 0, `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`);
  assert.match(compiled.html, /class="post-header-description"/);
  assert.match(compiled.html, /Header description/);
  assert.match(compiled.html, /class="post-cover"/);
  assert.match(compiled.html, /<img[^>]+src="\/assets\/favicon\.png"/);
  assert.match(compiled.html, /style="width: 75%; height: auto;"/);
  assert.doesNotMatch(compiled.html, /data:image\/png;base64/i);
  assert.ok(compiled.html.indexOf('class="post-cover"') < compiled.html.indexOf('role="doc-toc"'));

  cleanupTempDir(compiled.tempDir);
});

test('template-post html uses image-object cover widths and omits empty description nodes', () => {
  const defaultWidth = buildTypstHtml({
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
    inputs: [['page-path', 'posts/layout-check-image-default']],
  });

  assert.equal(defaultWidth.result.status, 0, `Expected default width html compile to succeed.\nstdout:\n${defaultWidth.result.stdout}\nstderr:\n${defaultWidth.result.stderr}`);
  assert.match(defaultWidth.html, /style="width: 75%; height: auto;"/);
  cleanupTempDir(defaultWidth.tempDir);

  const explicitWidth = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Image Cover Width",
  description: "",
  outline-enabled: true,
  cover: image("/assets/favicon.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

= 第一节

正文。
`,
    inputs: [['page-path', 'posts/layout-check-image-width']],
  });

  assert.equal(explicitWidth.result.status, 0, `Expected explicit width html compile to succeed.\nstdout:\n${explicitWidth.result.stdout}\nstderr:\n${explicitWidth.result.stderr}`);
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
  tags: ("测试",),
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

test('template-post pdf preview compiles with string, image-object, and relative cover paths', () => {
  const cases = [
    {
      title: 'Cover Check',
      description: 'Preview description with cover',
      cover: '"/assets/favicon.png"',
      prefix: '.tmp-template-post-cover-test-',
    },
    {
      title: 'Image Object Cover Check',
      description: 'Preview description with image-object cover',
      cover: 'image("/assets/favicon.png")',
      prefix: '.tmp-template-post-image-cover-test-',
    },
    {
      title: 'Image Object Cover Width Check',
      description: 'Preview description with 60 percent image-object cover',
      cover: 'image("/assets/favicon.png", width: 60%)',
      prefix: '.tmp-template-post-image-cover-width-test-',
    },
  ];

  for (const testCase of cases) {
    const compiled = compileTypstPdfText(`#import "../config.typ": *

#show: template-post.with(
  title: "${testCase.title}",
  description: "${testCase.description}",
  cover: ${testCase.cover},
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, { prefix: testCase.prefix });

    assert.equal(compiled.result.status, 0, `Expected typst compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`);
    assert.equal(compiled.textResult?.status, 0, `Expected pdftotext to succeed.\nstdout:\n${compiled.textResult?.stdout || ''}\nstderr:\n${compiled.textResult?.stderr || ''}`);
    assert.match(compiled.textOutput, new RegExp(testCase.title));
    assert.match(compiled.textOutput, new RegExp(testCase.description));
    cleanupTempDir(compiled.tempDir);
  }

  const compiled = compileTypstPdfText(`#import "../config.typ": *

#show: template-post.with(
  title: "Relative Cover Path Check",
  description: "Preview description with relative image-object cover",
  cover: image("img/cover.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, {
    prefix: '.tmp-template-post-relative-cover-test-',
    extraFiles: [{ from: join(ROOT_DIR, 'assets', 'favicon.png'), target: 'img/cover.png' }],
  });

  assert.equal(compiled.result.status, 0, `Expected relative cover compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`);
  assert.equal(compiled.textResult?.status, 0, `Expected pdftotext to succeed.\nstdout:\n${compiled.textResult?.stdout || ''}\nstderr:\n${compiled.textResult?.stderr || ''}`);
  assert.match(compiled.textOutput, /Relative Cover Path Check/);
  assert.match(compiled.textOutput, /Preview description with relative image-object cover/);
  cleanupTempDir(compiled.tempDir);
});

test('render-post-cover centers image-object covers in typst preview output', () => {
  const compiled = compileTypstSvg(`#import "../config.typ": *

#render-post-cover(image("/assets/favicon.png", width: 50%))
`);

  assert.equal(compiled.result.status, 0, `Expected typst svg compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`);

  const viewBoxMatch = compiled.svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  const groupMatch = compiled.svg.match(/<g class="typst-group" transform="matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)">/);
  const imageMatch = compiled.svg.match(/<image(?: transform="matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)")?[^>]* width="([0-9.]+)"[^>]*>/);

  assert.ok(viewBoxMatch);
  assert.ok(groupMatch);
  assert.ok(imageMatch);

  const pageWidth = Number(viewBoxMatch[1]);
  const contentOffsetX = Number(groupMatch[1]);
  const imageOffsetX = Number(imageMatch[1] || '0');
  const imageWidth = Number(imageMatch[3]);
  const contentWidth = pageWidth - (contentOffsetX * 2);
  const leftMargin = imageOffsetX;
  const rightMargin = contentWidth - imageWidth - imageOffsetX;

  cleanupTempDir(compiled.tempDir);
  assert.ok(leftMargin > 0);
  assert.ok(Math.abs(leftMargin - rightMargin) < 0.01, `Expected centered image margins to match, got left=${leftMargin}, right=${rightMargin}`);
});
