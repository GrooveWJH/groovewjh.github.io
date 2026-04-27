import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../../foundation/temp-dir.mjs';
import { renderPreviewIcon } from '../../runtime/ui/icons.mjs';
import { renderPreview } from '../../runtime/ui/render.mjs';
import { createPreviewState } from '../../runtime/ui/state.mjs';
import { createPreludeEntry } from '../helpers.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function createTempDir(prefix) {
  return createProjectTempDir(ROOT_DIR, prefix);
}

function _buildSiteTemp({ shareOrigin = 'local' } = {}) {
  const outDirPath = createTempDir('.tmp-share-preview-site-');
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir('.tmp-share-preview-cache-');
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync(
    'node',
    ['lib/node/build-html.mjs', '--out', outDirName, '--cache-root', cacheRootName, '--share-origin', shareOrigin],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    },
  );

  return {
    outDirName,
    outDirPath,
    cacheRootPath,
    result,
  };
}

function _extractPreviewAssetPath(indexHtml, pattern, label) {
  const matched = indexHtml.match(pattern)?.[1];
  assert.ok(matched, `Expected preview index to include ${label}`);
  return matched;
}

function readStyleBundle(relativeDir) {
  const dir = join(ROOT_DIR, relativeDir);
  return readdirSync(dir)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n');
}

test('renderPreview mounts a left audit rail inside the stage without overlaying the canvas center', () => {
  const entry = createPreludeEntry();
  entry.qrUrl = 'https://groovewjh.github.io/posts/articles/prelude/';

  const state = createPreviewState(
    {
      pages: [entry],
    },
    null,
  );
  const nodes = {
    listNode: { innerHTML: '' },
    stageNode: { innerHTML: '' },
    stageMetaNode: { innerHTML: '' },
    inspectorTabsNode: { innerHTML: '' },
    reviewNode: { innerHTML: '', hidden: false },
    payloadNode: { innerHTML: '', hidden: false },
    notesNode: { innerHTML: '', hidden: false },
    openPageLink: { href: '' },
    canvasToggleHost: { innerHTML: '' },
    displayOptionsHost: { innerHTML: '' },
    exportButton: { textContent: '' },
  };

  renderPreview(nodes, state, [entry], entry, {
    smartColors: {
      panelBg: '#ffffff',
      titleFg: '#202020',
      bodyFg: '#404040',
      contextFg: '#404040',
      qrMaskBg: '#f3f3f3',
      qrFg: '#404040',
    },
    colorSamplingState: 'ready',
  });

  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-audit-rail/);
  assert.match(nodes.stageNode.innerHTML, />对比度审计</);
  assert.match(nodes.stageNode.innerHTML, />角色 token</);
  assert.match(nodes.stageNode.innerHTML, />WCAG 作为参考</);
  assert.match(nodes.stageNode.innerHTML, /data-audit-group-select="title"/);
  assert.match(nodes.stageNode.innerHTML, /data-audit-group-select="description"/);
  assert.match(nodes.stageNode.innerHTML, /data-audit-group-select="context"/);
  assert.match(nodes.stageNode.innerHTML, /data-audit-group-select="qr"/);
  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-main/);
  assert.doesNotMatch(nodes.stageNode.innerHTML, />Metadata</);
  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-audit-rail__body/);
  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-audit-rail__nav/);
  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-audit-rail__panel/);
  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-audit-rail__detail-list/);
  assert.match(nodes.stageNode.innerHTML, /carbon-preview-stage-audit-rail__detail-row/);
  assert.match(nodes.stageNode.innerHTML, />该角色组判定方式</);
  assert.match(nodes.stageNode.innerHTML, /data-audit-target-select="siteNameText"/);
  assert.match(nodes.stageNode.innerHTML, /data-audit-stage-hotspot="titleBlock"/);
  assert.doesNotMatch(nodes.stageNode.innerHTML, />已隐藏</);
  assert.doesNotMatch(nodes.stageNode.innerHTML, /carbon-preview-stage-highlight[^"]*is-active/);
});

test('desktop inspector tabs split the full width evenly', () => {
  const styles = readStyleBundle('lib/share-preview/runtime/styles-panels');

  assert.match(
    styles,
    /\.carbon-preview-inspector__tabs\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s,
  );
  assert.match(styles, /\.carbon-preview-inspector__tab\s*\{[^}]*justify-content:\s*center;/s);
});

test('contrast audit rail styles reserve a left stage column and vertically stack audit groups', () => {
  const styles = `${readStyleBundle('lib/share-preview/runtime/styles-shell')}\n${readStyleBundle('lib/share-preview/runtime/styles-panels')}`;

  assert.match(styles, /\.carbon-preview-stage-surface\s*\{[^}]*padding:\s*1rem;/s);
  assert.match(styles, /\.carbon-preview-card-stage\s*\{[^}]*width:\s*min\(100%,\s*1560px\);/s);
  assert.match(
    styles,
    /\.carbon-preview-stage-stack\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*1560px;[^}]*display:\s*grid;[^}]*grid-template-columns:\s*520px\s+minmax\(0,\s*1fr\)/s,
  );
  assert.match(
    styles,
    /\.carbon-preview-stage-audit-rail__body\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*176px\s+minmax\(0,\s*1fr\)/s,
  );
  assert.match(
    styles,
    /\.carbon-preview-stage-audit-rail__nav\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
  );
  assert.match(
    styles,
    /\.carbon-preview-stage-audit-rail__detail-list\s*\{[^}]*display:\s*grid;[^}]*gap:\s*0\.5rem;[^}]*align-content:\s*start;[^}]*grid-auto-rows:\s*minmax\(132px,\s*max-content\)/s,
  );
  assert.match(
    styles,
    /\.carbon-preview-stage-audit-rail__detail-row\s*\{[^}]*min-height:\s*132px;[^}]*display:\s*grid;[^}]*align-content:\s*start;/s,
  );
  assert.match(styles, /\.carbon-preview-stage-stack\s*\{[^}]*height:\s*760px;[^}]*align-items:\s*stretch;/s);
  assert.match(styles, /\.carbon-preview-stage-audit-rail\s*\{[^}]*overflow:\s*hidden;/s);
  assert.match(styles, /\.carbon-preview-stage-audit-rail\s*\{[^}]*position:\s*relative;[^}]*height:\s*100%/s);
  assert.match(
    styles,
    /\.carbon-preview-stage-audit-rail__group-button:focus,\s*\.carbon-preview-stage-audit-rail__detail-row:focus,\s*\.carbon-preview-stage-hotspot:focus\s*\{[^}]*outline:\s*none;/s,
  );
  assert.match(
    styles,
    /\.carbon-preview-stage-audit-rail__group-button:focus-visible,\s*\.carbon-preview-stage-audit-rail__detail-row:focus-visible\s*\{[^}]*outline:\s*var\(--carbon-focus\);/s,
  );
  assert.match(styles, /\.carbon-preview-stage-main\s*\{[^}]*display:\s*flex;[^}]*justify-content:\s*flex-start;/s);
  assert.match(styles, /\.carbon-preview-stage-canvas\s*\{[^}]*width:\s*min\(100%,\s*780px\);/s);
  assert.doesNotMatch(styles, /\.carbon-preview-contrast-dock\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*24px/s);
});

test('renderPreview uses Carbon icon markup for preview controls and audit severity states', () => {
  const entry = createPreludeEntry();
  entry.qrUrl = 'https://groovewjh.github.io/posts/articles/prelude/';
  entry.publishedTime = null;
  const state = createPreviewState({ pages: [entry] }, null);
  state.displayOptions.date = true;
  const nodes = {
    listNode: { innerHTML: '' },
    stageNode: { innerHTML: '' },
    stageMetaNode: { innerHTML: '' },
    inspectorTabsNode: { innerHTML: '' },
    reviewNode: { innerHTML: '', hidden: false },
    payloadNode: { innerHTML: '', hidden: false },
    notesNode: { innerHTML: '', hidden: false },
    openPageLink: { href: '' },
    canvasToggleHost: { innerHTML: '' },
    displayOptionsHost: { innerHTML: '' },
    exportButton: { innerHTML: '', textContent: '' },
  };

  renderPreview(nodes, state, [entry], entry, {
    smartColors: {
      panelBg: '#ffffff',
      titleFg: '#202020',
      bodyFg: '#202020',
      contextFg: '#202020',
      qrMaskBg: '#ededed',
      qrFg: '#767676',
    },
    colorSamplingState: 'ready',
  });

  assert.match(nodes.stageNode.innerHTML, /data-carbon-icon="warning--filled"/);
  assert.match(nodes.stageNode.innerHTML, /data-carbon-icon="close--filled"/);
  assert.match(nodes.stageNode.innerHTML, /data-carbon-icon="checkmark--filled"/);
  assert.match(nodes.displayOptionsHost.innerHTML, /data-carbon-icon="settings--adjust"/);
});

test('renderPreviewIcon renders Carbon-backed icon markup instead of local hand-drawn paths', () => {
  const iconMarkup = renderPreviewIcon('search');

  assert.match(iconMarkup, /data-carbon-icon="search"/);
  assert.match(iconMarkup, /class="carbon-icon"/);
  assert.match(iconMarkup, /data-carbon-size="16"/);
});
