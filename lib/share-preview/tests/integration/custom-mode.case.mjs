import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPlatformCardSvg } from '../../runtime/renderers/index.mjs';
import { renderCustomEditor } from '../../runtime/ui/render-custom.mjs';
import { renderPreview } from '../../runtime/ui/render.mjs';
import { createPreviewState, getActiveEntry } from '../../runtime/ui/state.mjs';
import { createPreludeEntry } from '../helpers.mjs';

function createNodes() {
  return {
    listNode: { innerHTML: '' },
    pageResultsNode: { textContent: '' },
    stageNode: { innerHTML: '' },
    stageMetaNode: { innerHTML: '' },
    inspectorTabsNode: { innerHTML: '' },
    reviewNode: { innerHTML: '', hidden: false },
    payloadNode: { innerHTML: '', hidden: false },
    notesNode: { innerHTML: '', hidden: false },
    openPageLink: { href: '' },
    canvasToggleHost: { innerHTML: '' },
    displayOptionsHost: { innerHTML: '' },
    exportButton: { innerHTML: '', textContent: '', disabled: false },
    previewModeHost: { innerHTML: '' },
    railBodyNode: { innerHTML: '' },
  };
}

function createRailBodyNode() {
  let innerHTML = '';
  let writeCount = 0;

  return {
    dataset: {},
    get innerHTML() {
      return innerHTML;
    },
    set innerHTML(value) {
      writeCount += 1;
      innerHTML = value;
    },
    get writeCount() {
      return writeCount;
    },
  };
}

test('getActiveEntry returns a synthetic custom entry in custom mode', () => {
  const libraryEntry = createPreludeEntry();
  const state = createPreviewState({ pages: [libraryEntry] }, null);

  state.activeMode = 'custom';
  state.customDraft.title = '自定义标题';
  state.customDraft.description = '自定义描述';
  state.customDraft.siteName = 'My Source';
  state.customDraft.url = 'https://example.com/posts/custom/';
  state.customDraft.coverImageHref = 'data:image/png;base64,abc';

  const entry = getActiveEntry(state);

  assert.equal(entry.sourceTitle, '自定义标题');
  assert.equal(entry.shareTitle, '自定义标题 · My Source');
  assert.equal(entry.description, '自定义描述');
  assert.equal(entry.siteName, 'My Source');
  assert.equal(entry.canonicalUrl, 'https://example.com/posts/custom/');
  assert.equal(entry.qrUrl, 'https://example.com/posts/custom/');
  assert.equal(entry.imageUrl, 'data:image/png;base64,abc');
  assert.equal(entry.pageKind, 'article');
});

test('getActiveEntry preserves custom cover dimensions so the renderer uses the uploaded aspect ratio', () => {
  const libraryEntry = createPreludeEntry();
  const state = createPreviewState({ pages: [libraryEntry] }, null);

  state.activeMode = 'custom';
  state.customDraft.title = '宽图测试';
  state.customDraft.siteName = 'My Source';
  state.customDraft.coverImageHref = 'data:image/png;base64,abc';
  state.customDraft.coverImageWidth = 1200;
  state.customDraft.coverImageHeight = 400;

  const entry = getActiveEntry(state);
  const svg = renderPlatformCardSvg(entry, 'imessagePlus');

  assert.equal(entry.imageWidth, 1200);
  assert.equal(entry.imageHeight, 400);
  assert.match(svg, /<rect x="20" y="18" width="560" height="187"/);
  assert.match(svg, /<image href="data:image\/png;base64,abc" x="20" y="18" width="560" height="187"/);
});

test('renderPreview swaps the left rail into a custom editor when custom mode is active', () => {
  const entry = createPreludeEntry();
  const state = createPreviewState({ pages: [entry] }, null);
  const nodes = createNodes();

  state.activeMode = 'custom';
  state.customDraft.title = '手工卡片标题';
  state.customDraft.description = '手工卡片描述';
  state.customDraft.siteName = 'Alt Source';
  state.customDraft.url = 'https://example.com/alt/';

  const activeEntry = getActiveEntry(state);
  renderPreview(nodes, state, [entry], activeEntry, null);

  assert.match(nodes.previewModeHost.innerHTML, />文章库</);
  assert.match(nodes.previewModeHost.innerHTML, />自定义</);
  assert.match(nodes.previewModeHost.innerHTML, /is-active[^>]*>自定义/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-cover-shell/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-cover-trigger/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-cover-clear/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-cover-input/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-field="title"/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-field="description"/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-field="siteName"/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-field="url"/);
  assert.match(nodes.railBodyNode.innerHTML, /data-custom-field="cover"/);
  assert.match(nodes.stageNode.innerHTML, /手工卡片标题/);
  assert.match(nodes.payloadNode.innerHTML, /Alt Source/);
  assert.equal(nodes.openPageLink.href, 'https://example.com/alt/');
});

test('renderCustomEditor shows a loaded cover state with ratio-preserving copy', () => {
  const markup = renderCustomEditor({
    coverImageHref: 'data:image/png;base64,abc',
    coverImageWidth: 1440,
    coverImageHeight: 900,
    coverImageName: 'cover-shot.png',
  });

  assert.match(markup, />Loaded</);
  assert.match(markup, />封面已就绪</);
  assert.match(markup, /cover-shot\.png/);
  assert.match(markup, /1440 x 900px/);
  assert.match(markup, />替换封面</);
});

test('renderPreview keeps the mounted custom editor across draft refreshes', () => {
  const entry = createPreludeEntry();
  const state = createPreviewState({ pages: [entry] }, null);
  const nodes = createNodes();
  nodes.railBodyNode = createRailBodyNode();

  state.activeMode = 'custom';
  state.customDraft.title = 'a';

  renderPreview(nodes, state, [entry], getActiveEntry(state), null);
  state.customDraft.title = 'ab';
  renderPreview(nodes, state, [entry], getActiveEntry(state), null);

  assert.equal(nodes.railBodyNode.writeCount, 1);
  assert.match(nodes.stageNode.innerHTML, /ab/);
});
