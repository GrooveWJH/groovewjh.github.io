import { renderPlatformCardSvg } from '../renderers/index.mjs';
import { buildContrastAuditModel, resolveAuditSelection } from './contrast-audit.mjs';
import { renderStageWithAudit } from './render-audit.mjs';
import {
  renderCanvasToggle,
  renderDisplayOptions,
  renderExportButton,
  renderInspectorTabs,
  renderPageList,
  renderPageResults,
  renderPayloadPanel,
  renderStageMeta,
} from './render-controls.mjs';
import { escapeHtml } from './render-markup.mjs';
import { renderReviewPanel } from './render-review.mjs';
import { buildReviewModel } from './state.mjs';

function normalizeRuntimeMeta(runtimeMeta) {
  if (
    runtimeMeta &&
    typeof runtimeMeta === 'object' &&
    ('smartColors' in runtimeMeta || 'colorSamplingState' in runtimeMeta)
  ) {
    return runtimeMeta;
  }

  return {
    smartColors: runtimeMeta || null,
    colorSamplingState: 'unavailable',
  };
}

export function renderPreview(nodes, state, filteredPages, activeEntry, runtimeMeta = null) {
  const { smartColors, colorSamplingState } = normalizeRuntimeMeta(runtimeMeta);
  const reviewById = new Map(filteredPages.map((page) => [page.id, buildReviewModel(page)]));
  const activeReviewModel = activeEntry
    ? buildReviewModel(activeEntry, {
        colorSamplingState,
        exportStatus: state.exportStatus,
      })
    : null;

  nodes.listNode.innerHTML = renderPageList(filteredPages, state.activePageId, reviewById);
  if (nodes.pageResultsNode) {
    nodes.pageResultsNode.textContent = renderPageResults(filteredPages, state.manifest.pages.length, state.query);
  }
  nodes.canvasToggleHost.innerHTML = renderCanvasToggle(state.squareCanvas);
  nodes.exportButton.innerHTML = renderExportButton(state.exportStatus);
  nodes.exportButton.disabled = state.exportStatus === 'busy';
  nodes.inspectorTabsNode.innerHTML = renderInspectorTabs(state.activeInspectorPanel);

  if (!activeEntry) {
    nodes.stageMetaNode.innerHTML = renderStageMeta(state, 'unavailable');
    nodes.stageNode.innerHTML = '<div class="carbon-preview-empty-state">没有可供预览的分享页面。</div>';
    nodes.reviewNode.innerHTML = '<div class="carbon-preview-empty-state">请选择一篇文章来检查它的分享卡片。</div>';
    nodes.payloadNode.innerHTML = '';
    nodes.displayOptionsHost.innerHTML = '';
    nodes.payloadNode.hidden = state.activeInspectorPanel !== 'payload';
    nodes.reviewNode.hidden = state.activeInspectorPanel !== 'review';
    nodes.openPageLink.href = '/';
    if (nodes.notesNode) {
      nodes.notesNode.innerHTML = '';
      nodes.notesNode.hidden = true;
    }
    return;
  }

  nodes.displayOptionsHost.innerHTML = renderDisplayOptions(activeEntry, state.displayOptions, state.cornerSize);
  nodes.stageMetaNode.innerHTML = renderStageMeta(state, colorSamplingState);
  const svgMarkup = renderPlatformCardSvg(activeEntry, state.activePlatform, {
    smartColors,
    squareCanvas: state.squareCanvas,
    displayOptions: state.displayOptions,
    cornerSize: state.cornerSize,
  });
  const auditModel = buildContrastAuditModel({
    entry: activeEntry,
    svgMarkup,
    displayOptions: state.displayOptions,
    colorSamplingState,
    smartColors,
    squareCanvas: state.squareCanvas,
  });
  const auditSelection = resolveAuditSelection(auditModel, state.activeAuditGroup, state.activeAuditTarget);
  state.activeAuditGroup = auditSelection.activeGroup;
  state.activeAuditTarget = auditSelection.activeTarget;
  nodes.stageNode.innerHTML = renderStageWithAudit(svgMarkup, auditModel, auditSelection);
  nodes.reviewNode.innerHTML = renderReviewPanel(activeEntry, activeReviewModel);
  nodes.payloadNode.innerHTML = renderPayloadPanel(activeEntry);
  nodes.reviewNode.hidden = state.activeInspectorPanel !== 'review';
  nodes.payloadNode.hidden = state.activeInspectorPanel !== 'payload';
  nodes.openPageLink.href = activeEntry.pagePath;

  if (nodes.notesNode) {
    nodes.notesNode.innerHTML = '';
    nodes.notesNode.hidden = true;
  }
}

export function renderError(stageNode, error) {
  stageNode.innerHTML = `<div class="carbon-preview-empty-state">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
}
