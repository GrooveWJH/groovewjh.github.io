import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

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
    assert.match(resetCss, new RegExp(`article ${tagName}\\s*\\{[^}]*font-weight:\\s*${fontWeight};`, 's'));
  }

  assert.match(customCss, /article :is\(h1, h2, h3, h4, h5\)\s*\{[^}]*font-family:\s*var\(--font-serif-stack\);/s);
  assert.match(
    tokensCss,
    /--font-serif-stack:\s*"Site Noto Serif",\s*"Noto Serif CJK SC",\s*"Noto Serif SC",\s*"Noto Serif",\s*"Noto Serif TC",/s,
  );
  assert.match(
    tokensCss,
    /--font-kai-stack:\s*"Site Kai",\s*"KaiTi",\s*"Kaiti SC",\s*"STKaiti",\s*"Kai",\s*"LXGW WenKai",/s,
  );
  assert.match(tokensCss, /--font-poem-stack:\s*"Site Poem", "Site Kai", "Site Noto Serif", serif;/s);
  assert.match(
    customCss,
    /\.post-header\.post-category-poem \.post-header-inner h1,\s*\.post-header\.post-category-poem \.post-header-description,\s*article\.post-category-poem\s*\{[^}]*font-family:\s*var\(--font-poem-stack\);/s,
  );
  assert.match(
    customCss,
    /article\.post-category-poem :is\(h1, h2, h3, h4, h5\)\s*\{[^}]*font-family:\s*var\(--font-poem-stack\);/s,
  );
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
  assert.match(
    poemFrameTyp,
    /#let render-poem-line-typst\(line-text\) = \[[\s\S]*font: if run\.at\("kind"\) == "cjk" \{ poem-cjk-font \} else \{ poem-latin-font \}/s,
  );
  assert.match(templatePostTyp, /#show heading\.where\(level: 1\): set text\([^)]*weight:\s*"bold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 2\): set text\([^)]*weight:\s*"bold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 3\): set text\([^)]*weight:\s*"semibold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 4\): set text\([^)]*weight:\s*"semibold"/s);
  assert.match(templatePostTyp, /#show heading\.where\(level: 5\): set text\([^)]*weight:\s*"medium"/s);
});

test('root scroll uses the document while page-shell stays layout-only', () => {
  const resetCss = readProjectFile('assets/core/foundation/reset.css');

  assert.match(
    resetCss,
    /html\s*\{[^}]*height:\s*100%;[^}]*background:\s*var\(--background\);[^}]*overscroll-behavior-y:\s*none;/s,
  );
  assert.match(
    resetCss,
    /body\s*\{[^}]*min-height:\s*100%;[^}]*width:\s*100%;[^}]*overflow-x:\s*hidden;[^}]*background:\s*var\(--background\);/s,
  );
  assert.doesNotMatch(resetCss, /body\s*\{[^}]*overflow-y:\s*hidden;/s);
  assert.match(
    resetCss,
    /\.page-shell\s*\{[^}]*min-height:\s*100vh;[^}]*min-height:\s*100dvh;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*width:\s*100%;[^}]*background:\s*var\(--background\);/s,
  );
  assert.doesNotMatch(resetCss, /\.page-shell\s*\{[^}]*[\r\n]\s*height:\s*100vh;/s);
  assert.doesNotMatch(resetCss, /\.page-shell\s*\{[^}]*overflow-y:\s*auto;/s);
  assert.doesNotMatch(resetCss, /\.page-shell\s*\{[^}]*overflow-x:\s*clip;/s);
  assert.doesNotMatch(resetCss, /\.page-shell\s*\{[^}]*overscroll-behavior-y:\s*none;/s);
});

test('system theme css keeps color-scheme separate from token themes and narrows runtime transition scope', () => {
  const themesCss = readProjectFile('assets/core/foundation/themes.css');
  const systemDarkCss = readProjectFile('assets/core/foundation/themes/system-dark.css');
  const lightCss = readProjectFile('assets/core/foundation/themes/light.css');
  const resetCss = readProjectFile('assets/core/foundation/reset.css');
  const headerChromeCss = readProjectFile('assets/core/layout/header/chrome.css');

  assert.match(themesCss, /@import url\("\.\/themes\/system-dark\.css"\);/);
  assert.match(lightCss, /html:not\(\[data-color-scheme\]\),\s*html\[data-color-scheme="light"\]\s*\{\s*color-scheme:\s*light;/s);
  assert.match(lightCss, /html\[data-color-scheme="dark"\]\s*\{\s*color-scheme:\s*dark;/s);
  assert.match(systemDarkCss, /@media \(prefers-color-scheme: dark\)\s*\{\s*html:not\(\[data-color-scheme\]\)\s*\{\s*color-scheme:\s*dark;/s);
  assert.match(
    systemDarkCss,
    /@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*html:not\(\[data-theme\]\)\s*\{[^}]*--background:\s*var\(--gray-90\);/s,
  );
  assert.doesNotMatch(resetCss, /html\.theme-system-transition \*/);
  assert.match(resetCss, /html\.theme-system-transition\s*:is\(/);
  assert.match(resetCss, /header\s+\.nav-title\s*>\s*\.nav-title-link/);
  assert.match(
    headerChromeCss,
    /header \.nav-title > \.nav-title-link\s*\{[^}]*color:\s*var\(--text-primary\);/s,
  );
  assert.doesNotMatch(
    headerChromeCss,
    /header \.nav-title > \.nav-title-link\s*\{[^}]*color:\s*inherit;/s,
  );
  assert.match(resetCss, /\.post-header\s+\.post-header-inner\s+\.post-header-description/);
  assert.match(resetCss, /transition-duration:\s*500ms(?:\s*!important)?;/);
  assert.match(
    resetCss,
    /transition-property:\s*color,\s*background-color,\s*border-color,\s*outline-color,\s*text-decoration-color(?:\s*!important)?;/s,
  );
  assert.doesNotMatch(resetCss, /html\.theme-switching \*/);
});

test('root scrollbar chrome keeps native scrollbars visible with a Carbon-style fade treatment', () => {
  const resetCss = readProjectFile('assets/core/foundation/reset.css');
  const scrollbarCss = readProjectFile('assets/core/foundation/scrollbar.css');

  assert.doesNotMatch(resetCss, /scrollbar-width:\s*none;/);
  assert.doesNotMatch(resetCss, /::-webkit-scrollbar\s*\{[^}]*width:\s*0;[^}]*height:\s*0;/s);
  assert.match(
    scrollbarCss,
    /html\s*\{[^}]*scrollbar-width:\s*thin;[^}]*scrollbar-color:\s*var\(--scrollbar-thumb-rest\)\s*var\(--scrollbar-track\);/s,
  );
  assert.match(scrollbarCss, /html::-webkit-scrollbar\s*\{[^}]*width:\s*0\.75rem;[^}]*height:\s*0\.75rem;/s);
  assert.match(
    scrollbarCss,
    /html::-webkit-scrollbar-thumb\s*\{[^}]*background-color:\s*var\(--scrollbar-thumb-rest\);[^}]*transition:\s*background-color\s*180ms\s*ease;/s,
  );
  assert.match(
    scrollbarCss,
    /html\.scrollbar-active::-webkit-scrollbar-thumb\s*\{[^}]*background-color:\s*var\(--scrollbar-thumb-active\);/s,
  );
});

test('code rendering keeps syntax colors on semantic css variables so system theme changes stay reactive', () => {
  const codeMathCss = readProjectFile('assets/core/components/code-math.css');
  const renderCodeJs = readProjectFile('assets/core/behavior/render-code.js');

  assert.match(
    codeMathCss,
    /html\s*\{[^}]*--code-token-comment:\s*var\(--green-60\);[^}]*--code-token-string:\s*var\(--gray-100\);/s,
  );
  assert.match(
    codeMathCss,
    /html\[data-theme="gray-90"\],\s*html\[data-theme="gray-100"\]\s*\{[^}]*--code-token-comment:\s*var\(--green-40\);[^}]*--code-token-string:\s*var\(--gray-10\);/s,
  );
  assert.match(
    codeMathCss,
    /@media \(prefers-color-scheme: dark\)\s*\{\s*html:not\(\[data-theme\]\)\s*\{[^}]*--code-token-comment:\s*var\(--green-40\);[^}]*--code-token-string:\s*var\(--gray-10\);/s,
  );
  assert.doesNotMatch(renderCodeJs, /prefers-color-scheme/);
  assert.doesNotMatch(renderCodeJs, /document\.documentElement\.dataset\.theme/);
  assert.match(renderCodeJs, /var\(--code-token-comment\)/);
  assert.match(renderCodeJs, /var\(--code-token-string\)/);
});

test('theme toggle uses Carbon-like bare header actions with underline-only active state', () => {
  const themeToggleCss = readProjectFile('assets/core/layout/header/theme-toggle.css');
  const motionCss = readProjectFile('assets/core/layout/header/motion.css');
  const layoutTyp = readProjectFile('lib/typ2html/layout.typ');

  assert.match(themeToggleCss, /mask-image: url\("\/assets\/icons\/automatic\.svg"\);/);
  assert.match(layoutTyp, /data-tooltip": tooltip-label/);
  assert.match(layoutTyp, /role:\s*"radiogroup"/);
  assert.match(layoutTyp, /make-theme-toggle-button\("auto",\s*"跟随系统主题",\s*"自动"\)/);

  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle\s*\{[^}]*border:/s);
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle\s*\{[^}]*background:/s);
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle\s*\{[^}]*box-shadow:/s);
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle-button \+ \.nav-theme-toggle-button\s*\{[^}]*border-left:/s);
  assert.match(
    themeToggleCss,
    /header \.nav-theme-toggle-button:hover\s*\{[^}]*color:\s*var\(--text-primary\);[^}]*background:\s*var\(--layer2-hover\);/s,
  );
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle-button:active\s*\{[^}]*background:/s);
  assert.match(
    themeToggleCss,
    /header \.nav-theme-toggle-button\.is-active\s*\{[^}]*color:\s*var\(--text-primary\);[^}]*linear-gradient\(to top,\s*var\(--border-interactive\)/s,
  );
  assert.doesNotMatch(motionCss, /nav-theme-toggle-button[^{]*\{[^}]*background-color/s);
});
