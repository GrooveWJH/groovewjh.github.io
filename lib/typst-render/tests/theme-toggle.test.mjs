import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

const readProjectFile = (relativePath) => readFileSync(join(ROOT_DIR, relativePath), 'utf8');

test('theme toggle uses Carbon-like bare header actions with underline-only active state', () => {
  const themeToggleCss = readProjectFile('assets/core/layout/header/theme-toggle.css');
  const headerChromeCss = readProjectFile('assets/core/layout/header/chrome.css');
  const sidebarCss = readProjectFile('assets/core/layout/header/sidebar.css');
  const motionCss = readProjectFile('assets/core/layout/header/motion.css');
  const layoutTyp = readProjectFile('lib/typst-render/shell/layout.typ');

  assert.match(layoutTyp, /data-tooltip": tooltip-label/);
  assert.match(layoutTyp, /role:\s*"radiogroup"/);
  assert.match(layoutTyp, /make-theme-toggle-button\("auto",\s*"跟随系统主题",\s*"自动"\)/);
  assert.match(layoutTyp, /class: "nav-theme-toggle-icon"/);
  assert.match(layoutTyp, /"data-theme-icon": icon-preference/);
  assert.match(layoutTyp, /icon-shell\("auto",\s*\{/);
  assert.match(layoutTyp, /class: "nav-theme-toggle-icon-glyph nav-theme-toggle-icon-glyph-auto"/);
  assert.match(themeToggleCss, /-webkit-appearance:\s*none;/);
  assert.match(themeToggleCss, /header \.nav-theme-toggle-icon\s*\{[^}]*width:\s*1\.125rem;[^}]*height:\s*1\.125rem;/s);
  assert.match(
    themeToggleCss,
    /header \.nav-theme-toggle-button\[data-theme-preference="auto"\] \.nav-theme-toggle-icon\s*\{[^}]*width:\s*1\.1875rem;[^}]*height:\s*1\.1875rem;/s,
  );
  assert.match(themeToggleCss, /header \.nav-theme-toggle-icon svg\s*\{[^}]*fill:\s*currentColor;/s);
  assert.match(
    themeToggleCss,
    /header \.nav-theme-toggle-icon-glyph-auto\s*\{[^}]*mask-image:\s*url\("\/assets\/icons\/automatic\.svg"\);/s,
  );
  assert.match(
    themeToggleCss,
    /header \.nav-theme-toggle-icon-glyph-auto\s*\{[^}]*-webkit-mask-image:\s*url\("\/assets\/icons\/automatic\.svg"\);/s,
  );
  assert.doesNotMatch(themeToggleCss, /-webkit-mask-image:\s*url\("\/assets\/icons\/sun\.svg"\)/);
  assert.match(headerChromeCss, /-webkit-appearance:\s*none;/);
  assert.match(headerChromeCss, /-webkit-mask-image:\s*url\("\/assets\/icons\/menu\.svg"\);/);
  assert.match(
    sidebarCss,
    /header \.nav-theme-toggle-sidebar\s*\{[^}]*margin:\s*0 1rem 1\.25rem;[^}]*margin-top:\s*auto;/s,
  );
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle\s*\{[^}]*border:/s);
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle\s*\{[^}]*background:/s);
  assert.doesNotMatch(themeToggleCss, /header \.nav-theme-toggle\s*\{[^}]*box-shadow:/s);
  assert.doesNotMatch(
    themeToggleCss,
    /header \.nav-theme-toggle-button \+ \.nav-theme-toggle-button\s*\{[^}]*border-left:/s,
  );
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
