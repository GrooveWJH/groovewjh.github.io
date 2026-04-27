import {
  clearAuditHoverState,
  resolveAuditHoverSelection,
  setAuditHoverState,
  shouldShowAuditFocusHighlight,
} from './app/audit-hover.mjs';
import { bindCustomDraftEditor, bindPreviewModeSwitcher } from './app/custom-controls.mjs';
import { getNodes, loadManifest } from './app/nodes.mjs';
import { startPreviewVersionGuard } from './app/version-check.mjs';
import { downloadPlatformCardPng } from './export/png.mjs';
import { usesSmartPreviewColors } from './renderers/index.mjs';
import { getCachedSmartPreviewColors, prefetchSmartPreviewColors } from './smart-colors.mjs';
import { renderError, renderPreview } from './ui/render.mjs';
import { createPreviewState, filterPages, getActiveEntry, syncActivePageId, syncActivePlatform } from './ui/state.mjs';

async function bootstrap() {
  const nodes = getNodes();
  startPreviewVersionGuard(nodes.root);
  const manifest = await loadManifest();
  const state = createPreviewState(manifest, nodes.root.dataset.defaultPage);
  let renderToken = 0;
  let exportResetTimer = 0;

  function getSmartColorImageUrl(entry) {
    return !entry || !usesSmartPreviewColors(state.activePlatform) ? '' : entry.imageUrl || entry.imagePath || '';
  }

  function getSmartColorOptions(entry) {
    return { panelIntent: entry?.panelIntent || 'auto' };
  }

  function getSmartColorStateKey(entry) {
    const imageUrl = getSmartColorImageUrl(entry);
    return imageUrl ? `${imageUrl}::${entry?.panelIntent || 'auto'}` : '';
  }

  function resolveColorSamplingState(entry, smartColors) {
    const samplingKey = getSmartColorStateKey(entry);
    if (!samplingKey) return 'unavailable';
    if (smartColors) return 'ready';
    return state.colorSamplingByImage[samplingKey] === 'error' ? 'error' : 'loading';
  }

  function scheduleExportReset() {
    if (exportResetTimer) window.clearTimeout(exportResetTimer);
    exportResetTimer = window.setTimeout(() => {
      state.exportStatus = 'idle';
      render();
    }, 1800);
  }

  function render() {
    const currentToken = ++renderToken;
    const filteredPages = filterPages(manifest.pages, state.query);
    syncActivePageId(state, filteredPages);
    const activeEntry = getActiveEntry(state);
    syncActivePlatform(state, activeEntry);
    const imageUrl = getSmartColorImageUrl(activeEntry);
    const samplingKey = getSmartColorStateKey(activeEntry);
    const colorOptions = getSmartColorOptions(activeEntry);
    const smartColors = imageUrl ? getCachedSmartPreviewColors(imageUrl, colorOptions) : null;
    const colorSamplingState = resolveColorSamplingState(activeEntry, smartColors);

    if (samplingKey && smartColors) {
      state.colorSamplingByImage[samplingKey] = 'ready';
    }

    renderPreview(nodes, state, filteredPages, activeEntry, {
      smartColors,
      colorSamplingState,
    });

    if (
      imageUrl &&
      !smartColors &&
      state.colorSamplingByImage[samplingKey] !== 'loading' &&
      state.colorSamplingByImage[samplingKey] !== 'error'
    ) {
      state.colorSamplingByImage[samplingKey] = 'loading';
      prefetchSmartPreviewColors(imageUrl, colorOptions)
        .then(() => {
          state.colorSamplingByImage[samplingKey] = 'ready';
          if (currentToken === renderToken) {
            render();
          }
        })
        .catch((error) => {
          state.colorSamplingByImage[samplingKey] = 'error';
          console.error(error);
          if (currentToken === renderToken) {
            render();
          }
        });
    }
  }

  nodes.listNode.addEventListener('click', (event) => {
    if (state.activeMode !== 'library') {
      return;
    }

    const button = event.target.closest('[data-page-id]');
    if (!button) {
      return;
    }

    state.activePageId = button.dataset.pageId;
    state.activeAuditGroup = null;
    state.activeAuditTarget = null;
    state.exportStatus = 'idle';
    render();
  });
  bindPreviewModeSwitcher(nodes, state, render);

  nodes.stageNode.addEventListener('click', (event) => {
    const targetButton = event.target.closest('[data-audit-target-select]');
    if (targetButton) {
      state.activeAuditGroup = targetButton.dataset.auditGroup || state.activeAuditGroup;
      state.activeAuditTarget = targetButton.dataset.auditTargetSelect;
      render();
      return;
    }

    const groupButton = event.target.closest('[data-audit-group-select]');
    if (!groupButton) {
      return;
    }

    state.activeAuditGroup = groupButton.dataset.auditGroupSelect;
    state.activeAuditTarget = null;
    render();
  });

  nodes.stageNode.addEventListener('mouseover', (event) => {
    setAuditHoverState(nodes.stageNode, resolveAuditHoverSelection(event.target) || {});
  });
  nodes.stageNode.addEventListener('mouseleave', () => clearAuditHoverState(nodes.stageNode));
  nodes.stageNode.addEventListener('focusin', (event) => {
    if (!shouldShowAuditFocusHighlight(event.target)) {
      clearAuditHoverState(nodes.stageNode);
      return;
    }

    setAuditHoverState(nodes.stageNode, resolveAuditHoverSelection(event.target) || {});
  });
  nodes.stageNode.addEventListener('focusout', (event) => {
    if (!nodes.stageNode.contains(event.relatedTarget)) {
      clearAuditHoverState(nodes.stageNode);
    }
  });

  nodes.inspectorTabsNode.addEventListener('click', (event) => {
    const button = event.target.closest('[data-inspector-panel]');
    if (button) {
      state.activeInspectorPanel = button.dataset.inspectorPanel;
      render();
    }
  });
  nodes.searchInput.addEventListener('input', () => {
    state.query = nodes.searchInput.value;
    render();
  });
  bindCustomDraftEditor(nodes, state, render);
  nodes.canvasToggleHost.addEventListener('change', (event) => {
    const input = event.target.closest('#square-canvas-toggle');
    if (input) {
      state.squareCanvas = Boolean(input.checked);
      render();
    }
  });

  nodes.displayOptionsHost.addEventListener('change', (event) => {
    const featherToggle = event.target.closest('[data-edge-feather-toggle]');
    if (featherToggle) {
      state.edgeFeatherEnabled = Boolean(featherToggle.checked);
      render();
      return;
    }
    const input = event.target.closest('[data-display-option]');
    if (input) {
      state.displayOptions[input.dataset.displayOption] = Boolean(input.checked);
      render();
    }
  });
  nodes.displayOptionsHost.addEventListener('input', (event) => {
    const featherInput = event.target.closest('[data-edge-feather-size-input]');
    if (featherInput) {
      state.edgeFeatherSize = Number.parseFloat(featherInput.value) || 0;
      render();
      return;
    }
    const cornerInput = event.target.closest('[data-corner-size-input]');
    if (cornerInput) {
      state.cornerSize = Number.parseInt(cornerInput.value, 10) || 0;
      render();
    }
  });

  nodes.exportButton.addEventListener('click', async () => {
    const activeEntry = getActiveEntry(state);
    if (!activeEntry) return;

    state.exportStatus = 'busy';
    render();

    try {
      await downloadPlatformCardPng(activeEntry, state.activePlatform, {
        width: state.exportOptions.width,
        height: state.exportOptions.height,
        squareCanvas: state.squareCanvas,
        displayOptions: state.displayOptions,
        cornerSize: state.cornerSize,
        edgeFeatherEnabled: state.edgeFeatherEnabled,
        edgeFeatherSize: state.edgeFeatherSize,
      });
      state.exportStatus = 'success';
      render();
      scheduleExportReset();
    } catch (error) {
      console.error(error);
      state.exportStatus = 'error';
      render();
      scheduleExportReset();
      window.alert(error instanceof Error ? error.message : String(error));
    }
  });

  render();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  bootstrap().catch((error) => {
    console.error(error);
    const stageNode = document.getElementById('card-stage');
    if (stageNode) {
      renderError(stageNode, error);
    }
  });
}
