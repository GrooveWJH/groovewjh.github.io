import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from './tmp-dir.mjs';
import { extractPoemFrameTextFromSource, collectPublishedPoemFrameCorpusText } from './poem-frame-corpus.mjs';
import { cleanupTempDir, ROOT_DIR } from './test-helpers/typst-test-helpers.mjs';

test('extractPoemFrameTextFromSource keeps simple poem-frame text and skips complex inline content', () => {
  const source = `#poem-frame[
  Prelude——“引号”… \\
  第二行ABC 123，中文。
]

#poem-frame[
  #link("https://example.com")[复杂内容]
]`;

  const corpus = extractPoemFrameTextFromSource(source);

  assert.match(corpus, /Prelude——“引号”…/);
  assert.match(corpus, /第二行ABC 123，中文。/);
  assert.doesNotMatch(corpus, /复杂内容/);
  assert.doesNotMatch(corpus, /example\.com/);
});

test('collectPublishedPoemFrameCorpusText scans published articles poems and pages only', () => {
  const tempDir = createProjectTempDir(ROOT_DIR, 'poem-frame-corpus-test-');
  const postsDir = join(tempDir, 'posts');
  const pagesDir = join(tempDir, 'pages');
  mkdirSync(join(postsDir, 'articles', 'live-post'), { recursive: true });
  mkdirSync(join(postsDir, 'poems', 'live-poem'), { recursive: true });
  mkdirSync(join(postsDir, '_drafts', 'hidden-post'), { recursive: true });
  mkdirSync(join(pagesDir, 'about'), { recursive: true });

  writeFileSync(
    join(postsDir, 'articles', 'live-post', 'index.typ'),
    `#poem-frame[
  文章里的诗句：果轮可继续做狮只绵羊棵石千
]`,
    'utf8',
  );
  writeFileSync(
    join(postsDir, 'poems', 'live-poem', 'index.typ'),
    `#poem-frame[
  诗歌页正文
]`,
    'utf8',
  );
  writeFileSync(
    join(postsDir, '_drafts', 'hidden-post', 'index.typ'),
    `#poem-frame[
  草稿内容不应进入语料
]`,
    'utf8',
  );
  writeFileSync(
    join(pagesDir, 'about', 'index.typ'),
    `#poem-frame[
  页面中的片段
]`,
    'utf8',
  );

  const corpus = collectPublishedPoemFrameCorpusText({ postsDir, pagesDir });

  assert.match(corpus, /文章里的诗句：果轮可继续做狮只绵羊棵石千/);
  assert.match(corpus, /诗歌页正文/);
  assert.match(corpus, /页面中的片段/);
  assert.doesNotMatch(corpus, /草稿内容不应进入语料/);

  cleanupTempDir(tempDir);
});

test('collectPublishedPoemFrameCorpusText includes prelude poem-frame characters used by the live article', () => {
  const corpus = collectPublishedPoemFrameCorpusText();

  assert.match(corpus, /而如果轮回可以继续下去/);
  for (const char of '果轮可继续做狮只绵羊棵石千') {
    assert.ok(corpus.includes(char), `Expected poem corpus to include "${char}" from prelude.`);
  }
});
