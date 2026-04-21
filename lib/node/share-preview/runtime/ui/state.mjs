import {
  DEFAULT_SHARE_CARD_DISPLAY_OPTIONS,
  DEFAULT_SHARE_CARD_EXPORT_OPTIONS,
  DEFAULT_SHARE_CARD_SQUARE_CANVAS,
} from '../config.mjs';

function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLookupValue(value) {
  return collapseWhitespace(value).replace(/^\/+/, '').toLowerCase();
}

export function resolveDefaultEntry(pages, defaultPageValue) {
  const normalized = normalizeLookupValue(defaultPageValue || '');
  if (!normalized) {
    return pages[0] || null;
  }

  return (
    pages.find((page) => normalizeLookupValue(page.pagePath) === normalized) ||
    pages.find((page) => normalizeLookupValue(page.id) === normalized) ||
    pages.find((page) => normalizeLookupValue(page.pagePath).endsWith(normalized)) ||
    pages.find((page) => normalizeLookupValue(page.pagePath).endsWith(`${normalized}/`)) ||
    pages[0] ||
    null
  );
}

export function createPreviewState(manifest, defaultPageValue) {
  return {
    manifest,
    query: '',
    activePlatform: 'imessagePlus',
    activePageId: resolveDefaultEntry(manifest.pages, defaultPageValue)?.id || manifest.pages[0]?.id || null,
    activeInspectorPanel: 'payload',
    descriptionBreakStartIndex: null,
    squareCanvas: DEFAULT_SHARE_CARD_SQUARE_CANVAS,
    displayOptions: {
      ...DEFAULT_SHARE_CARD_DISPLAY_OPTIONS,
    },
    exportOptions: {
      ...DEFAULT_SHARE_CARD_EXPORT_OPTIONS,
    },
  };
}

export function getActiveEntry(state) {
  return state.manifest.pages.find((page) => page.id === state.activePageId) || null;
}

export function filterPages(pages, query) {
  const normalized = normalizeLookupValue(query);
  if (!normalized) {
    return pages;
  }

  return pages.filter((page) => {
    const haystack = [page.sourceTitle, page.shareTitle, page.pagePath, page.id].join(' ').toLowerCase();

    return haystack.includes(normalized);
  });
}

export function syncActivePageId(state, filteredPages) {
  if (filteredPages.some((page) => page.id === state.activePageId) || !filteredPages[0]) {
    return;
  }

  state.activePageId = filteredPages[0].id;
}

export function syncActivePlatform(state, entry) {
  if (entry?.platforms?.[state.activePlatform]) {
    return;
  }

  state.activePlatform = Object.keys(entry?.platforms || {})[0] || 'imessagePlus';
}
