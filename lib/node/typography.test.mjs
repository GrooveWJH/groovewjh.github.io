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
  const tokensCss = readProjectFile('assets/core/foundation/tokens.css');
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
  assert.match(tokensCss, /--font-poem-stack:\s*"Site Poem", "Site Noto Serif", serif;/s);
  assert.match(customCss, /\.post-header\.post-category-poem \.post-header-inner h1,\s*\.post-header\.post-category-poem \.post-header-description,\s*article\.post-category-poem\s*\{[^}]*font-family:\s*var\(--font-poem-stack\);/s);
  assert.match(customCss, /article\.post-category-poem :is\(h1, h2, h3, h4, h5\)\s*\{[^}]*font-family:\s*var\(--font-poem-stack\);/s);
  assert.match(customCss, /article \.poem-frame\.poem-frame-align-center\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(customCss, /article \.poem-frame-inner\s*\{[^}]*width:\s*fit-content;/s);
  assert.match(customCss, /article \.poem-frame-run-latin\s*\{[^}]*font-family:\s*var\(--font-serif-stack\);/s);
  assert.match(customCss, /article \.poem-frame-run-cjk\s*\{[^}]*font-family:\s*var\(--font-kai-stack\);/s);
  assert.match(postCardCss, /\.post-card \.post-title\s*\{[^}]*font-family:\s*var\(--font-serif-stack\);/s);
  assert.match(postCardCss, /\.post-card \.post-title\s*\{[^}]*font-weight:\s*700;/s);
});

test('typst preview defines an explicit title and heading weight hierarchy', () => {
  const poemFrameTyp = readProjectFile('lib/typ2html/poem-frame.typ');
  const templatePostTyp = readProjectFile('lib/typ2html/template-post.typ');

  assert.match(poemFrameTyp, /#let poem-latin-font = \([\s\S]*"Noto Serif CJK SC"[\s\S]*"Noto Serif CJK TC"[\s\S]*\)/s);
  assert.match(poemFrameTyp, /#let poem-cjk-font = \([\s\S]*"KaiTi"[\s\S]*"Kaiti SC"[\s\S]*"STKaiti"[\s\S]*\)/s);
  assert.match(poemFrameTyp, /#let render-poem-line-typst\(line-text\) = \[[\s\S]*font: if run\.at\("kind"\) == "cjk" \{ poem-cjk-font \} else \{ poem-latin-font \}/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 1\): set text\([^\)]*weight:\s*"bold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 2\): set text\([^\)]*weight:\s*"bold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 3\): set text\([^\)]*weight:\s*"semibold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 4\): set text\([^\)]*weight:\s*"semibold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 5\): set text\([^\)]*weight:\s*"medium"/s);
});

test('root scroll is vertically contained by page-shell while horizontal gestures stay available', () => {
  const resetCss = readProjectFile('assets/core/foundation/reset.css');

  assert.match(resetCss, /html\s*\{[^}]*height:\s*100%;[^}]*background:\s*var\(--background\);/s);
  assert.match(resetCss, /body\s*\{[^}]*min-height:\s*100%;[^}]*overflow-y:\s*hidden;[^}]*overflow-x:\s*hidden;[^}]*background:\s*var\(--background\);/s);
  assert.match(
    resetCss,
    /\.page-shell\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100dvh;[^}]*height:\s*100vh;[^}]*height:\s*100dvh;[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*clip;[^}]*overscroll-behavior-y:\s*none;[^}]*overscroll-behavior-x:\s*auto;[^}]*background:\s*var\(--background\);/s,
  );
});
