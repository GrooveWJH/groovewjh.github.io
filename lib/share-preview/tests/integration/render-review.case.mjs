import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import test from 'node:test';
import { createProjectTempDir } from '../../../foundation/temp-dir.mjs';
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

test('renderPreview renders a corner size slider with the current value', () => {
  const entry = createPreludeEntry();
  const state = createPreviewState(
    {
      pages: [entry],
    },
    null,
  );
  state.cornerSize = 44;
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

  renderPreview(nodes, state, [entry], entry, null);

  assert.match(nodes.displayOptionsHost.innerHTML, /for="corner-size-input">圆角大小<\/label>/);
  assert.match(nodes.displayOptionsHost.innerHTML, /type="range"/);
  assert.match(nodes.displayOptionsHost.innerHTML, /data-corner-size-input/);
  assert.match(nodes.displayOptionsHost.innerHTML, /value="44"/);
  assert.doesNotMatch(nodes.displayOptionsHost.innerHTML, /description-break-input/);
});

test('renderPreview renders review and payload tabs without article and platform noise in stage chrome', () => {
  const entry = createPreludeEntry();
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

  renderPreview(nodes, state, [entry], entry, null);

  assert.match(nodes.inspectorTabsNode.innerHTML, />检查</);
  assert.match(nodes.inspectorTabsNode.innerHTML, />负载</);
  assert.doesNotMatch(nodes.inspectorTabsNode.innerHTML, /Preview Notes/);
  assert.doesNotMatch(nodes.stageMetaNode.innerHTML, /Article/);
  assert.doesNotMatch(nodes.stageMetaNode.innerHTML, /iMessage\+/);
});

test('renderPreview surfaces missing metadata as review issues instead of filler text', () => {
  const entry = createPreludeEntry({ includeDescription: false, includePublishedTime: false });
  entry.imagePath = null;
  entry.imageUrl = null;

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

  renderPreview(nodes, state, [entry], entry, null);

  assert.match(nodes.listNode.innerHTML, /3 项问题/);
  assert.match(nodes.reviewNode.innerHTML, /描述缺失/);
  assert.match(nodes.reviewNode.innerHTML, /封面缺失/);
  assert.match(nodes.reviewNode.innerHTML, /发布日期缺失/);
  assert.doesNotMatch(nodes.reviewNode.innerHTML, /Article/);
});

test('renderPreview renders checklist details on their own full-width line', () => {
  const entry = createPreludeEntry();
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

  renderPreview(nodes, state, [entry], entry, null);

  assert.match(nodes.reviewNode.innerHTML, /carbon-preview-checklist__header/);
  assert.match(nodes.reviewNode.innerHTML, /carbon-preview-checklist__detail/);
  assert.doesNotMatch(nodes.reviewNode.innerHTML, /carbon-preview-checklist__meta/);
});
