import { downloadPlatformCardPng } from "./export/png.mjs";
import { getPlatformLabel } from "./platforms.mjs";
import {
  getCachedSmartPreviewColors,
  prefetchSmartPreviewColors,
} from "./smart-colors.mjs";
import { usesSmartPreviewColors } from "./renderers/index.mjs";
import {
  createPreviewState,
  filterPages,
  getActiveEntry,
  syncActivePageId,
  syncActivePlatform,
} from "./ui/state.mjs";
import { renderError, renderPreview } from "./ui/render.mjs";

function getNodes() {
  return {
    root: document.body,
    listNode: document.getElementById("page-list"),
    canvasToggleHost: document.getElementById("canvas-toggle-host"),
    displayOptionsHost: document.getElementById("display-options-host"),
    stageNode: document.getElementById("card-stage"),
    stageMetaNode: document.getElementById("card-stage-meta"),
    payloadNode: document.getElementById("payload-view"),
    notesNode: document.getElementById("notes-view"),
    inspectorTabsNode: document.getElementById("inspector-tabs"),
    searchInput: document.getElementById("page-search"),
    openPageLink: document.getElementById("open-page-link"),
    exportButton: document.getElementById("export-button"),
  };
}

async function loadManifest() {
  const response = await fetch("./manifest.json");
  if (!response.ok) {
    throw new Error(`Failed to load preview manifest: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function bootstrap() {
  const nodes = getNodes();
  const manifest = await loadManifest();
  const state = createPreviewState(manifest, nodes.root.dataset.defaultPage);
  let renderToken = 0;

  function getSmartColorImageUrl(entry) {
    if (!entry || !usesSmartPreviewColors(state.activePlatform)) {
      return "";
    }

    return entry.imageUrl || entry.imagePath || "";
  }

  function render() {
    const currentToken = ++renderToken;
    const filteredPages = filterPages(manifest.pages, state.query);
    syncActivePageId(state, filteredPages);
    const activeEntry = getActiveEntry(state);
    syncActivePlatform(state, activeEntry);
    const imageUrl = getSmartColorImageUrl(activeEntry);
    const smartColors = imageUrl ? getCachedSmartPreviewColors(imageUrl) : null;

    renderPreview(nodes, state, filteredPages, activeEntry, smartColors);

    if (imageUrl && !smartColors) {
      prefetchSmartPreviewColors(imageUrl)
        .then(() => {
          if (currentToken === renderToken) {
            render();
          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }

  nodes.listNode.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page-id]");
    if (!button) {
      return;
    }

    state.activePageId = button.dataset.pageId;
    render();
  });

  nodes.inspectorTabsNode.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspector-panel]");
    if (!button) {
      return;
    }

    state.activeInspectorPanel = button.dataset.inspectorPanel;
    render();
  });
  nodes.searchInput.addEventListener("input", () => {
    state.query = nodes.searchInput.value;
    render();
  });

  nodes.canvasToggleHost.addEventListener("change", (event) => {
    const input = event.target.closest("#square-canvas-toggle");
    if (!input) {
      return;
    }

    state.squareCanvas = Boolean(input.checked);
    render();
  });

  nodes.displayOptionsHost.addEventListener("change", (event) => {
    const input = event.target.closest("[data-display-option]");
    if (input) {
      state.displayOptions[input.dataset.displayOption] = Boolean(input.checked);
      render();
      return;
    }

    const breakInput = event.target.closest("[data-description-break-input]");
    if (!breakInput) {
      return;
    }

    if (!breakInput.value) {
      state.descriptionBreakStartIndex = null;
      render();
      return;
    }

    const min = Number(breakInput.min || 1);
    const max = Number(breakInput.max || breakInput.value);
    const nextValue = Number.parseInt(breakInput.value, 10);
    state.descriptionBreakStartIndex = Math.min(Math.max(nextValue || min, min), max);
    render();
  });

  nodes.displayOptionsHost.addEventListener("click", (event) => {
    const resetButton = event.target.closest("[data-description-break-reset]");
    if (!resetButton) {
      return;
    }

    state.descriptionBreakStartIndex = null;
    render();
  });

  nodes.exportButton.addEventListener("click", async () => {
    const activeEntry = getActiveEntry(state);
    if (!activeEntry) {
      return;
    }

    nodes.exportButton.disabled = true;
    nodes.exportButton.textContent = "Exporting…";

    try {
      await downloadPlatformCardPng(activeEntry, state.activePlatform, {
        width: state.exportOptions.width,
        height: state.exportOptions.height,
        squareCanvas: state.squareCanvas,
        displayOptions: state.displayOptions,
        descriptionBreakStartIndex: state.descriptionBreakStartIndex,
      });
      nodes.exportButton.textContent = `Export ${getPlatformLabel(state.activePlatform)} PNG`;
    } catch (error) {
      console.error(error);
      nodes.exportButton.textContent = "Export Failed";
      window.alert(error instanceof Error ? error.message : String(error));
    } finally {
      nodes.exportButton.disabled = false;
      if (nodes.exportButton.textContent === "Export Failed") {
        window.setTimeout(() => {
          nodes.exportButton.textContent = `Export ${getPlatformLabel(state.activePlatform)} PNG`;
        }, 1600);
      }
    }
  });

  render();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  bootstrap().catch((error) => {
    console.error(error);
    const stageNode = document.getElementById("card-stage");
    if (stageNode) {
      renderError(stageNode, error);
    }
  });
}
