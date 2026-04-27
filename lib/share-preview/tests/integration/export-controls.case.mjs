import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePngExportSize } from '../../runtime/export/png.mjs';
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

test('resolvePngExportSize preserves the non-square renderer ratio while keeping square exports square', () => {
  assert.deepEqual(resolvePngExportSize({ width: 600, height: 383 }, { width: 4000, height: 4000 }), {
    width: 4000,
    height: 2553,
  });
  assert.deepEqual(resolvePngExportSize({ width: 600, height: 383 }, { width: 4000, squareCanvas: true }), {
    width: 4000,
    height: 4000,
  });
});

test('renderPreview exposes edge feather controls and reuses the hero status card style for the no-issues section', () => {
  const entry = createPreludeEntry();
  entry.qrUrl = 'https://groovewjh.github.io/posts/articles/prelude/';
  const state = createPreviewState({ pages: [entry] }, null);
  const nodes = createNodes();

  renderPreview(nodes, state, [entry], getActiveEntry(state), {
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

  assert.match(nodes.displayOptionsHost.innerHTML, /data-edge-feather-toggle/);
  assert.match(nodes.displayOptionsHost.innerHTML, /data-edge-feather-size-input/);
  assert.match(nodes.reviewNode.innerHTML, /carbon-preview-review-note carbon-preview-review-hero__status is-ready/);
});
