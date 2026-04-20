import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTypstHtml, cleanupTempDir, compileTypstPdfText } from './test-helpers/typst-test-helpers.mjs';

test('template-post shows title and description in pdf preview output', () => {
  const compiled = compileTypstPdfText(`#import "../config.typ": *

#show: template-post.with(
  title: "Compile Check",
  description: "Preview description",
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, { prefix: '.tmp-template-post-test-' });

  assert.equal(compiled.result.status, 0, `Expected typst compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`);
  assert.equal(compiled.textResult?.status, 0, `Expected pdftotext to succeed.\nstdout:\n${compiled.textResult?.stdout || ''}\nstderr:\n${compiled.textResult?.stderr || ''}`);
  assert.match(compiled.textOutput, /Compile Check/);
  assert.match(compiled.textOutput, /Preview description/);
  cleanupTempDir(compiled.tempDir);
});

test('html callouts render shared default titles and honor explicit override', () => {
  const defaults = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#note[默认 note]
#success[默认 success]
#warning[默认 warning]
#error[默认 error]
`,
    inputs: [['page-path', 'posts/callout-default-title-check']],
  });

  assert.equal(defaults.result.status, 0, `Expected html compile to succeed.\nstdout:\n${defaults.result.stdout}\nstderr:\n${defaults.result.stderr}`);
  assert.match(defaults.html, /<div class="note-block">[\s\S]*?<div class="block-title">提示<\/div>/);
  assert.match(defaults.html, /<div class="success-block">[\s\S]*?<div class="block-title">完成<\/div>/);
  assert.match(defaults.html, /<div class="warning-block">[\s\S]*?<div class="block-title">警告<\/div>/);
  assert.match(defaults.html, /<div class="error-block">[\s\S]*?<div class="block-title">注意<\/div>/);
  cleanupTempDir(defaults.tempDir);

  const explicit = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#warning(title: "注意！")[显式 warning]
`,
    inputs: [['page-path', 'posts/callout-explicit-title-check']],
  });

  assert.equal(explicit.result.status, 0, `Expected html compile to succeed.\nstdout:\n${explicit.result.stdout}\nstderr:\n${explicit.result.stderr}`);
  assert.match(explicit.html, /<div class="warning-block">[\s\S]*?<div class="block-title">注意！<\/div>/);
  assert.doesNotMatch(explicit.html, /<div class="block-title">警告<\/div>/);
  cleanupTempDir(explicit.tempDir);
});

test('typst preview callouts render shared default titles and honor explicit override', () => {
  const defaults = compileTypstPdfText(`#import "../config.typ": *

#note[默认 note]
#success[默认 success]
#warning[默认 warning]
#error[默认 error]
`, { prefix: '.tmp-template-post-callout-title-test-' });

  assert.equal(defaults.result.status, 0, `Expected typst compile to succeed.\nstdout:\n${defaults.result.stdout}\nstderr:\n${defaults.result.stderr}`);
  assert.equal(defaults.textResult?.status, 0, `Expected pdftotext to succeed.\nstdout:\n${defaults.textResult?.stdout || ''}\nstderr:\n${defaults.textResult?.stderr || ''}`);
  assert.match(defaults.textOutput, /提示/);
  assert.match(defaults.textOutput, /完成/);
  assert.match(defaults.textOutput, /警告/);
  assert.match(defaults.textOutput, /注意/);
  cleanupTempDir(defaults.tempDir);

  const explicit = compileTypstPdfText(`#import "../config.typ": *

#warning(title: "注意！")[显式 warning]
`, { prefix: '.tmp-template-post-callout-explicit-title-test-' });

  assert.equal(explicit.result.status, 0, `Expected typst compile to succeed.\nstdout:\n${explicit.result.stdout}\nstderr:\n${explicit.result.stderr}`);
  assert.equal(explicit.textResult?.status, 0, `Expected pdftotext to succeed.\nstdout:\n${explicit.textResult?.stdout || ''}\nstderr:\n${explicit.textResult?.stderr || ''}`);
  assert.match(explicit.textOutput, /注意！/);
  assert.doesNotMatch(explicit.textOutput, /警告/);
  cleanupTempDir(explicit.tempDir);
});
