import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTypstHtml, cleanupTempDir, compileTypstPdfText } from '../../testing/typst.mjs';

test('poem-frame html renders semantic centered layout with split font runs', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Poem Frame Html",
  description: "",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 20),
)

#poem-frame(align: "center", inset: 1em)[
  Echo之死 2026 \\
  第二行ABC 123，中文。
]
`,
    inputs: [['page-path', 'posts/poem-frame-html']],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  assert.match(compiled.html, /class="poem-frame poem-frame-align-center"/);
  assert.match(compiled.html, /class="poem-frame-inner poem-frame-inner-align-left"/);
  assert.match(compiled.html, /style="padding: 1em;"/);
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-latin">Echo<\/span>/);
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-cjk">之死<\/span>/);
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-latin"> 2026<\/span>/);
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-latin">ABC 123<\/span>/);
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-cjk">，中文。<\/span>/);
  assert.doesNotMatch(compiled.html, /class="typst-frame"/);
  cleanupTempDir(compiled.tempDir);
});

test('poem-frame routes east asian punctuation to the kai side instead of serif fallback', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Poem Frame Punctuation",
  description: "",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 20),
)

#poem-frame[
  Prelude——“引号”…
]
`,
    inputs: [['page-path', 'posts/poem-frame-punctuation']],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-latin">Prelude<\/span>/);
  assert.match(compiled.html, /class="poem-frame-run poem-frame-run-cjk">——“引号”…<\/span>/);
  cleanupTempDir(compiled.tempDir);
});

test('poem-frame html preserves intentional blank lines', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Poem Frame Blank Line",
  description: "",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 20),
)

#poem-frame[
  第一行 \\
  \\
  第三行
]
`,
    inputs: [['page-path', 'posts/poem-frame-blank-line']],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  assert.match(
    compiled.html,
    /class="poem-frame-line"><span class="poem-frame-run poem-frame-run-cjk">第一行<\/span><\/div>\s*<div class="poem-frame-line"><br[^>]*><\/div>\s*<div class="poem-frame-line"><span class="poem-frame-run poem-frame-run-cjk">第三行<\/span><\/div>/,
  );
  cleanupTempDir(compiled.tempDir);
});

test('poem-frame html falls back to typst frame for complex inline content', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Poem Frame Html Fallback",
  description: "",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 20),
)

#poem-frame[
  普通文本 \\
  #link("https://example.com")[链接内容]
]
`,
    inputs: [['page-path', 'posts/poem-frame-html-fallback']],
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  assert.match(compiled.html, /class="typst-frame"/);
  assert.doesNotMatch(compiled.html, /class="poem-frame poem-frame-align-left"/);
  cleanupTempDir(compiled.tempDir);
});

test('poem-frame compiles with default, center, and right alignment variants', () => {
  const compiled = compileTypstPdfText(
    `#import "../config.typ": *

#poem-frame[
  第一行 \\
  第二行 \\
]

#poem-frame(align: "center", inset: 1em)[
  居中片段 \\
]

#poem-frame(align: "right", inner-align: "right")[
  右侧片段 \\
]
`,
    { prefix: '.tmp-template-post-pdf-test-' },
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
  assert.match(compiled.textOutput, /第一行/);
  assert.match(compiled.textOutput, /第二行/);
  assert.match(compiled.textOutput, /居中片段/);
  assert.match(compiled.textOutput, /右侧片段/);
  cleanupTempDir(compiled.tempDir);
});

test('poem-frame rejects invalid alignment values', () => {
  const compiled = compileTypstPdfText(`#import "../config.typ": *

#poem-frame(align: "diagonal")[
  非法参数 \\
]
`);

  assert.notEqual(compiled.result.status, 0);
  assert.match(compiled.result.stderr, /align/i);
  cleanupTempDir(compiled.tempDir);
});
