export function getNodes() {
  const railBodyNode = document.getElementById('rail-body') || document.getElementById('page-list');

  return {
    root: document.body,
    listNode: railBodyNode,
    railBodyNode,
    pageResultsNode: document.getElementById('page-results'),
    previewModeHost: document.getElementById('preview-mode-host'),
    searchShell: document.getElementById('page-search-shell'),
    canvasToggleHost: document.getElementById('canvas-toggle-host'),
    displayOptionsHost: document.getElementById('display-options-host'),
    stageNode: document.getElementById('card-stage'),
    stageMetaNode: document.getElementById('card-stage-meta'),
    reviewNode: document.getElementById('review-view'),
    payloadNode: document.getElementById('payload-view'),
    inspectorTabsNode: document.getElementById('inspector-tabs'),
    searchInput: document.getElementById('page-search'),
    openPageLink: document.getElementById('open-page-link'),
    exportButton: document.getElementById('export-button'),
  };
}

export async function loadManifest() {
  const manifestUrl = document.body?.dataset?.manifestUrl || './manifest.json';
  const response = await fetch(manifestUrl);
  if (!response.ok) {
    throw new Error(`Failed to load preview manifest: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
