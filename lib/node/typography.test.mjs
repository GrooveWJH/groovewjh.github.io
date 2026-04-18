import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

const readProjectFile = (relativePath) => readFileSync(join(ROOT_DIR, relativePath), 'utf8');

test('html typography uses the unified serif heading hierarchy', () => {
  const resetCss = readProjectFile('assets/core/foundation/reset.css');
  const postHeaderCss = readProjectFile('assets/core/layout/post-header.css');
  const postCardCss = readProjectFile('assets/core/components/post-card.css');
  const customCss = readProjectFile('assets/custom.css');

  assert.match(postHeaderCss, /\.post-header \.post-header-inner h1\s*\{[^}]*font-weight:\s*700;/s);

  const expectedWeights = new Map([
    ['h1', '700'],
    ['h2', '700'],
    ['h3', '600'],
    ['h4', '600'],
    ['h5', '500'],
  ]);

  for (const [tagName, fontWeight] of expectedWeights) {
    assert.match(
      resetCss,
      new RegExp(`article ${tagName}\\s*\\{[^}]*font-weight:\\s*${fontWeight};`, 's'),
    );
  }

  assert.match(customCss, /article :is\(h1, h2, h3, h4, h5\)\s*\{[^}]*font-family:\s*var\(--font-serif-stack\);/s);
  assert.match(customCss, /article\.post-category-poem :is\(h1, h2, h3, h4, h5\)\s*\{[^}]*font-family:\s*var\(--font-kai-stack\);/s);
  assert.match(postCardCss, /\.post-card \.post-title\s*\{[^}]*font-family:\s*var\(--font-serif-stack\);/s);
  assert.match(postCardCss, /\.post-card \.post-title\s*\{[^}]*font-weight:\s*700;/s);
});

test('typst preview defines an explicit title and heading weight hierarchy', () => {
  const configTyp = readProjectFile('config.typ');

  assert.match(configTyp, /weight:\s*"bold"/);
  assert.match(configTyp, /#show heading\.where\(level: 1\): set text\([^\)]*weight:\s*"bold"/s);
  assert.match(configTyp, /#show heading\.where\(level: 2\): set text\([^\)]*weight:\s*"bold"/s);
  assert.match(configTyp, /#show heading\.where\(level: 3\): set text\([^\)]*weight:\s*"semibold"/s);
  assert.match(configTyp, /#show heading\.where\(level: 4\): set text\([^\)]*weight:\s*"semibold"/s);
  assert.match(configTyp, /#show heading\.where\(level: 5\): set text\([^\)]*weight:\s*"medium"/s);
});
