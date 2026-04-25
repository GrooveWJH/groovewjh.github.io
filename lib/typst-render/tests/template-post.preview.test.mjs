import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildTypstHtml, cleanupTempDir, compileTypstPdfText, compileTypstSvg } from '../../testing/typst.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

test('template-post shows title and description in pdf preview output', () => {
  const compiled = compileTypstPdfText(
    `#import "../../config.typ": *

#show: template-post.with(
  title: "Compile Check",
  description: "Preview description",
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    { prefix: '.tmp-template-post-test-' },
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
  assert.match(compiled.textOutput, /Compile Check/);
  assert.match(compiled.textOutput, /Preview description/);
  cleanupTempDir(compiled.tempDir);
});

test('template-post shows multiline content descriptions in pdf preview output', () => {
  const compiled = compileTypstPdfText(
    `#import "../../config.typ": *

#show: template-post.with(
  title: "Compile Check",
  description: [第一行#linebreak()第二行],
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 23),
)

正文。
`,
    { prefix: '.tmp-template-post-content-description-test-' },
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
  assert.match(compiled.textOutput, /第一行\s+第二行/);
  cleanupTempDir(compiled.tempDir);
});

test('html callouts render shared default titles and honor explicit override', () => {
  const defaults = buildTypstHtml({
    sourceText: `#import "../../config.typ": *

#note[默认 note]
#success[默认 success]
#warning[默认 warning]
#error[默认 error]
`,
    inputs: [['page-path', 'posts/callout-default-title-check']],
  });

  assert.equal(
    defaults.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${defaults.result.stdout}\nstderr:\n${defaults.result.stderr}`,
  );
  assert.match(defaults.html, /<div class="note-block">[\s\S]*?<div class="block-title">提示<\/div>/);
  assert.match(defaults.html, /<div class="success-block">[\s\S]*?<div class="block-title">完成<\/div>/);
  assert.match(defaults.html, /<div class="warning-block">[\s\S]*?<div class="block-title">警告<\/div>/);
  assert.match(defaults.html, /<div class="error-block">[\s\S]*?<div class="block-title">注意<\/div>/);
  cleanupTempDir(defaults.tempDir);

  const explicit = buildTypstHtml({
    sourceText: `#import "../../config.typ": *

#warning(title: "注意！")[显式 warning]
`,
    inputs: [['page-path', 'posts/callout-explicit-title-check']],
  });

  assert.equal(
    explicit.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${explicit.result.stdout}\nstderr:\n${explicit.result.stderr}`,
  );
  assert.match(explicit.html, /<div class="warning-block">[\s\S]*?<div class="block-title">注意！<\/div>/);
  assert.doesNotMatch(explicit.html, /<div class="block-title">警告<\/div>/);
  cleanupTempDir(explicit.tempDir);
});

test('typst preview callouts render shared default titles and honor explicit override', () => {
  const defaults = compileTypstPdfText(
    `#import "../../config.typ": *

#note[默认 note]
#success[默认 success]
#warning[默认 warning]
#error[默认 error]
`,
    { prefix: '.tmp-template-post-callout-title-test-' },
  );

  assert.equal(
    defaults.result.status,
    0,
    `Expected typst compile to succeed.\nstdout:\n${defaults.result.stdout}\nstderr:\n${defaults.result.stderr}`,
  );
  assert.equal(
    defaults.textResult?.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${defaults.textResult?.stdout || ''}\nstderr:\n${defaults.textResult?.stderr || ''}`,
  );
  assert.match(defaults.textOutput, /提示/);
  assert.match(defaults.textOutput, /完成/);
  assert.match(defaults.textOutput, /警告/);
  assert.match(defaults.textOutput, /注意/);
  cleanupTempDir(defaults.tempDir);

  const explicit = compileTypstPdfText(
    `#import "../../config.typ": *

#warning(title: "注意！")[显式 warning]
`,
    { prefix: '.tmp-template-post-callout-explicit-title-test-' },
  );

  assert.equal(
    explicit.result.status,
    0,
    `Expected typst compile to succeed.\nstdout:\n${explicit.result.stdout}\nstderr:\n${explicit.result.stderr}`,
  );
  assert.equal(
    explicit.textResult?.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${explicit.textResult?.stdout || ''}\nstderr:\n${explicit.textResult?.stderr || ''}`,
  );
  assert.match(explicit.textOutput, /注意！/);
  assert.doesNotMatch(explicit.textOutput, /警告/);
  cleanupTempDir(explicit.tempDir);
});

test('multiline raw blocks strip shared source indentation in html and typst preview', () => {
  const source = `#import "../../config.typ": *

#show: template-post.with(
  title: "Raw Indent Check",
  description: "",
  tags: (),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 20),
)

#raw(
  lang: "answer",
  block: true,
  "第一行
  第二行
    第三行",
)
`;

  const htmlCompiled = buildTypstHtml({
    sourceText: source,
    inputs: [['page-path', 'posts/raw-indent-check']],
    prefix: '.tmp-template-post-raw-indent-html-',
  });

  assert.equal(
    htmlCompiled.result.status,
    0,
    `Expected html compile to succeed.\nstdout:\n${htmlCompiled.result.stdout}\nstderr:\n${htmlCompiled.result.stderr}`,
  );
  assert.match(htmlCompiled.html, /<pre><code class="language-answer">第一行\n第二行\n {2}第三行<\/code><\/pre>/);
  assert.doesNotMatch(htmlCompiled.html, /第一行\n {2}第二行/);
  cleanupTempDir(htmlCompiled.tempDir);

  const previewCompiled = compileTypstSvg(source, { prefix: '.tmp-template-post-raw-indent-svg-' });
  assert.equal(
    previewCompiled.result.status,
    0,
    `Expected typst svg compile to succeed.\nstdout:\n${previewCompiled.result.stdout}\nstderr:\n${previewCompiled.result.stderr}`,
  );
  cleanupTempDir(previewCompiled.tempDir);

  const templatePostSource = readFileSync(join(ROOT_DIR, 'lib/typst-render/post/template-post.typ'), 'utf8');
  assert.match(templatePostSource, /#import "\.\.\/fragments\/raw\.typ": normalize-raw-block-text/);
  assert.match(templatePostSource, /preview-zebraw-default\(raw\(\s*normalize-raw-block-text\(fields\.text\)/s);
});
