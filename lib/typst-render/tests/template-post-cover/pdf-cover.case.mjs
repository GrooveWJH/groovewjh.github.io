import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { cleanupTempDir, compileTypstPdfText, compileTypstSvg, ROOT_DIR } from '../../../testing/typst.mjs';

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
    const compiled = compileTypstPdfText(
      `#import "../config.typ": *

#show: template-post.with(
  title: "${testCase.title}",
  description: "${testCase.description}",
  cover: ${testCase.cover},
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
      { prefix: testCase.prefix },
    );

    assert.equal(
      compiled.result.status,
      0,
      `Expected typst compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
    );
    assert.equal(
      compiled.textResult?.status,
      0,
      `Expected pdftotext to succeed.\nstdout:\n${compiled.textResult?.stdout || ''}\nstderr:\n${compiled.textResult?.stderr || ''}`,
    );
    assert.match(compiled.textOutput, new RegExp(testCase.title));
    assert.match(compiled.textOutput, new RegExp(testCase.description));
    cleanupTempDir(compiled.tempDir);
  }

  const compiled = compileTypstPdfText(
    `#import "../config.typ": *

#show: template-post.with(
  title: "Relative Cover Path Check",
  description: "Preview description with relative image-object cover",
  cover: image("img/cover.png", width: 60%),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    {
      prefix: '.tmp-template-post-relative-cover-test-',
      extraFiles: [{ from: join(ROOT_DIR, 'assets', 'favicon.png'), target: 'img/cover.png' }],
    },
  );

  assert.equal(
    compiled.result.status,
    0,
    `Expected relative cover compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  assert.equal(
    compiled.textResult?.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${compiled.textResult?.stdout || ''}\nstderr:\n${compiled.textResult?.stderr || ''}`,
  );
  assert.match(compiled.textOutput, /Relative Cover Path Check/);
  assert.match(compiled.textOutput, /Preview description with relative image-object cover/);
  cleanupTempDir(compiled.tempDir);
});

test('render-post-cover centers image-object covers in typst preview output', () => {
  const compiled = compileTypstSvg(`#import "../config.typ": *

#render-post-cover(image("/assets/favicon.png", width: 50%))
`);

  assert.equal(
    compiled.result.status,
    0,
    `Expected typst svg compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  const viewBoxMatch = compiled.svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  const groupMatch = compiled.svg.match(/<g class="typst-group" transform="matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)">/);
  const imageMatch = compiled.svg.match(
    /<image(?: transform="matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)")?[^>]* width="([0-9.]+)"[^>]*>/,
  );

  assert.ok(viewBoxMatch);
  assert.ok(groupMatch);
  assert.ok(imageMatch);

  const pageWidth = Number(viewBoxMatch[1]);
  const contentOffsetX = Number(groupMatch[1]);
  const imageOffsetX = Number(imageMatch[1] || '0');
  const imageWidth = Number(imageMatch[3]);
  const contentWidth = pageWidth - contentOffsetX * 2;
  const leftMargin = imageOffsetX;
  const rightMargin = contentWidth - imageWidth - imageOffsetX;

  cleanupTempDir(compiled.tempDir);
  assert.ok(leftMargin > 0);
  assert.ok(
    Math.abs(leftMargin - rightMargin) < 0.01,
    `Expected centered image margins to match, got left=${leftMargin}, right=${rightMargin}`,
  );
});
