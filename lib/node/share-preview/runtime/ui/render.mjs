import { getPlatformLabel } from '../platforms.mjs';
import { getPlatformDescriptionBreakState, renderPlatformCardSvg } from '../renderers/index.mjs';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatPayloadRows(entry) {
  return [
    ['sourceTitle', entry.sourceTitle || '—'],
    ['shareTitle', entry.shareTitle || '—'],
    ['description', entry.description || '—'],
    ['canonicalUrl', entry.canonicalUrl || '—'],
    ['qrUrl', entry.qrUrl || '—'],
    ['imagePath', entry.imagePath || '—'],
    ['imageUrl', entry.imageUrl || '—'],
    ['siteName', entry.siteName || '—'],
    ['publishedTime', entry.publishedTime || '—'],
    ['og:type', entry.pageKind === 'article' ? 'article' : 'website'],
    ['twitter:card', entry.imageUrl ? 'summary_large_image' : 'summary'],
  ];
}

function renderPageList(pages, activeId) {
  return pages
    .map(
      (page) => `
    <button class="carbon-preview-page-list__item${page.id === activeId ? ' is-active' : ''}" type="button" data-page-id="${escapeHtml(page.id)}">
      <strong class="carbon-preview-page-list__title">${escapeHtml(page.sourceTitle || page.shareTitle || page.pagePath)}</strong>
      <span class="carbon-preview-page-list__path">${escapeHtml(page.pagePath)}</span>
    </button>
  `,
    )
    .join('');
}

function renderNotes(entry, platformKey) {
  const platform = entry.platforms?.[platformKey];
  const notes = [platform?.note || '—'];

  if (!entry.imageUrl && entry.imagePath) {
    notes.push('当前图片只有相对路径，预览仍可在本地显示，但它不是可直接外链的绝对分享图。');
  }

  return notes.map((note) => `<p>${escapeHtml(note)}</p>`).join('');
}

function renderStageMeta(entry, platformKey) {
  return `
    <div class="carbon-preview-toolbar__context">
      <p class="carbon-preview-toolbar__eyebrow">${escapeHtml(getPlatformLabel(platformKey))}</p>
      <h2>${escapeHtml(entry.shareTitle || entry.sourceTitle)}</h2>
      <p class="carbon-preview-toolbar__path">${escapeHtml(entry.pagePath)}</p>
    </div>
    <div class="carbon-preview-toolbar__chips">
      <span>${escapeHtml(entry.pageKind === 'article' ? 'Article' : 'Page')}</span>
      <span>${escapeHtml(getPlatformLabel(platformKey))}</span>
    </div>
  `;
}

function renderCanvasToggle(squareCanvas) {
  return `<label class="carbon-preview-toggle">
    <input id="square-canvas-toggle" type="checkbox" ${squareCanvas ? 'checked' : ''}>
    <span class="carbon-preview-toggle__label">Square Canvas</span>
  </label>`;
}

function renderDescriptionBreakControl(descriptionBreakState, manualBreakStartIndex) {
  const maxValue = descriptionBreakState?.maxBreakStartIndex || 1;
  const effectiveValue = descriptionBreakState?.effectiveBreakStartIndex ?? '';
  const resetDisabled = manualBreakStartIndex == null;

  return `<div class="carbon-preview-break-control${descriptionBreakState?.maxBreakStartIndex ? '' : ' is-disabled'}">
    <label class="carbon-preview-break-control__label" for="description-break-input">Desc Break</label>
    <div class="carbon-preview-break-control__row">
      <input
        id="description-break-input"
        class="carbon-preview-break-control__input"
        type="number"
        min="1"
        max="${maxValue}"
        step="1"
        value="${effectiveValue}"
        data-description-break-input
        ${descriptionBreakState?.maxBreakStartIndex ? '' : 'disabled'}
      >
      <button
        class="carbon-preview-break-control__reset"
        type="button"
        data-description-break-reset
        ${resetDisabled || !descriptionBreakState?.maxBreakStartIndex ? 'disabled' : ''}
      >Reset</button>
    </div>
  </div>`;
}

function renderDisplayOptions(entry, displayOptions, descriptionBreakState, manualBreakStartIndex) {
  const controls = [
    ['description', 'Description', Boolean(entry?.description)],
    ['url', 'URL', Boolean(entry?.canonicalUrl || entry?.pagePath || entry?.siteName)],
    ['date', 'Date', Boolean(entry?.publishedTime)],
    ['qr', 'QR', Boolean(entry?.qrUrl)],
  ];

  return `<fieldset class="carbon-preview-option-group">
    <legend class="carbon-preview-option-group__label">Visible Fields</legend>
    <div class="carbon-preview-option-list">
      ${controls
        .map(([key, label, available]) => {
          const checked = available && Boolean(displayOptions?.[key]);
          return `<label class="carbon-preview-segment${available ? '' : ' is-disabled'}">
          <input type="checkbox" data-display-option="${escapeHtml(key)}" ${checked ? 'checked' : ''} ${available ? '' : 'disabled'}>
          <span>${escapeHtml(label)}</span>
        </label>`;
        })
        .join('')}
    </div>
    ${renderDescriptionBreakControl(descriptionBreakState, manualBreakStartIndex)}
  </fieldset>`;
}

function renderInspectorTabs(activeInspectorPanel) {
  return [
    ['payload', 'Share Payload'],
    ['notes', 'Preview Notes'],
  ]
    .map(
      ([key, label]) => `
    <button
      class="carbon-preview-bottom-sheet__tab${key === activeInspectorPanel ? ' is-active' : ''}"
      type="button"
      role="tab"
      aria-selected="${key === activeInspectorPanel ? 'true' : 'false'}"
      data-inspector-panel="${escapeHtml(key)}"
    >${escapeHtml(label)}</button>
  `,
    )
    .join('');
}

export function renderPreview(nodes, state, filteredPages, activeEntry, smartColors = null) {
  nodes.listNode.innerHTML = renderPageList(filteredPages, state.activePageId);

  if (!activeEntry) {
    nodes.stageNode.innerHTML = '<div class="carbon-preview-empty-state">No shareable pages were found.</div>';
    nodes.stageMetaNode.innerHTML = '';
    nodes.inspectorTabsNode.innerHTML = '';
    nodes.payloadNode.innerHTML = '';
    nodes.notesNode.innerHTML = '';
    nodes.openPageLink.href = '/';
    nodes.canvasToggleHost.innerHTML = renderCanvasToggle(state.squareCanvas);
    nodes.displayOptionsHost.innerHTML = '';
    nodes.payloadNode.hidden = false;
    nodes.notesNode.hidden = true;
    return;
  }

  const descriptionBreakState = getPlatformDescriptionBreakState(activeEntry, state.activePlatform, {
    displayOptions: state.displayOptions,
    descriptionBreakStartIndex: state.descriptionBreakStartIndex,
  });
  nodes.canvasToggleHost.innerHTML = renderCanvasToggle(state.squareCanvas);
  nodes.displayOptionsHost.innerHTML = renderDisplayOptions(
    activeEntry,
    state.displayOptions,
    descriptionBreakState,
    state.descriptionBreakStartIndex,
  );
  nodes.stageMetaNode.innerHTML = renderStageMeta(activeEntry, state.activePlatform);
  nodes.stageNode.innerHTML = renderPlatformCardSvg(activeEntry, state.activePlatform, {
    smartColors,
    squareCanvas: state.squareCanvas,
    displayOptions: state.displayOptions,
    descriptionBreakStartIndex: state.descriptionBreakStartIndex,
  });
  nodes.inspectorTabsNode.innerHTML = renderInspectorTabs(state.activeInspectorPanel);
  nodes.payloadNode.innerHTML = `<dl class="carbon-preview-payload-grid">${formatPayloadRows(activeEntry)
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('')}</dl>`;
  nodes.notesNode.innerHTML = `<div class="carbon-preview-notes">${renderNotes(activeEntry, state.activePlatform)}</div>`;
  nodes.payloadNode.hidden = state.activeInspectorPanel !== 'payload';
  nodes.notesNode.hidden = state.activeInspectorPanel !== 'notes';
  nodes.openPageLink.href = activeEntry.pagePath;
  nodes.exportButton.textContent = `Export ${getPlatformLabel(state.activePlatform)} PNG`;
}

export function renderError(stageNode, error) {
  stageNode.innerHTML = `<div class="carbon-preview-empty-state">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
}
