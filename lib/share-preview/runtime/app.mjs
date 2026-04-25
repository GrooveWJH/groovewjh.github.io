import {
  clearAuditHoverState,
  resolveAuditHoverSelection,
  setAuditHoverState,
  shouldShowAuditFocusHighlight,
} from './app/audit-hover.mjs';
import { getNodes, loadManifest } from './app/nodes.mjs';
import { downloadPlatformCardPng } from './export/png.mjs';
import { usesSmartPreviewColors } from './renderers/index.mjs';
import { getCachedSmartPreviewColors, prefetchSmartPreviewColors } from './smart-colors.mjs';
import { renderError, renderPreview } from './ui/render.mjs';
import { createPreviewState, filterPages, getActiveEntry, syncActivePageId, syncActivePlatform } from './ui/state.mjs';

async function bootstrap() {
  const nodes = getNodes();
  const manifest = await loadManifest();
  const state = createPreviewState(manifest, nodes.root.dataset.defaultPage);
  let renderToken = 0;
  let exportResetTimer = 0;

  function getSmartColorImageUrl(entry) {
    if (!entry || !usesSmartPreviewColors(state.activePlatform)) {
      return '';
    }

    return entry.imageUrl || entry.imagePath || '';
  }

  function resolveColorSamplingState(entry, smartColors) {
    const imageUrl = getSmartColorImageUrl(entry);
    if (!imageUrl) {
      return 'unavailable';
    }

    if (smartColors) {
      return 'ready';
    }

    return state.colorSamplingByImage[imageUrl] === 'error' ? 'error' : 'loading';
  }

  function scheduleExportReset() {
    if (exportResetTimer) {
      window.clearTimeout(exportResetTimer);
    }

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
    const smartColors = imageUrl ? getCachedSmartPreviewColors(imageUrl) : null;
    const colorSamplingState = resolveColorSamplingState(activeEntry, smartColors);

    if (imageUrl && smartColors) {
      state.colorSamplingByImage[imageUrl] = 'ready';
    }

    renderPreview(nodes, state, filteredPages, activeEntry, {
      smartColors,
      colorSamplingState,
    });

    if (
      imageUrl &&
      !smartColors &&
      state.colorSamplingByImage[imageUrl] !== 'loading' &&
      state.colorSamplingByImage[imageUrl] !== 'error'
    ) {
      state.colorSamplingByImage[imageUrl] = 'loading';
      prefetchSmartPreviewColors(imageUrl)
        .then(() => {
          state.colorSamplingByImage[imageUrl] = 'ready';
          if (currentToken === renderToken) {
            render();
          }
        })
        .catch((error) => {
          state.colorSamplingByImage[imageUrl] = 'error';
          console.error(error);
          if (currentToken === renderToken) {
            render();
          }
        });
    }
  }

  nodes.listNode.addEventListener('click', (event) => {
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
  nodes.canvasToggleHost.addEventListener('change', (event) => {
    const input = event.target.closest('#square-canvas-toggle');
    if (input) {
      state.squareCanvas = Boolean(input.checked);
      render();
    }
  });

  nodes.displayOptionsHost.addEventListener('change', (event) => {
    const input = event.target.closest('[data-display-option]');
    if (input) {
      state.displayOptions[input.dataset.displayOption] = Boolean(input.checked);
      render();
    }
  });
  nodes.displayOptionsHost.addEventListener('input', (event) => {
    const cornerInput = event.target.closest('[data-corner-size-input]');
    if (cornerInput) {
      state.cornerSize = Number.parseInt(cornerInput.value, 10) || 0;
      render();
    }
  });

  nodes.exportButton.addEventListener('click', async () => {
    const activeEntry = getActiveEntry(state);
    if (!activeEntry) {
      return;
    }

    state.exportStatus = 'busy';
    render();

    try {
      await downloadPlatformCardPng(activeEntry, state.activePlatform, {
        width: state.exportOptions.width,
        height: state.exportOptions.height,
        squareCanvas: state.squareCanvas,
        displayOptions: state.displayOptions,
        cornerSize: state.cornerSize,
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
