import {
  DEFAULT_SHARE_CARD_CORNER_SIZE,
  DEFAULT_SHARE_CARD_DISPLAY_OPTIONS,
  DEFAULT_SHARE_CARD_EDGE_FEATHER_ENABLED,
  DEFAULT_SHARE_CARD_EDGE_FEATHER_SIZE,
  DEFAULT_SHARE_CARD_EXPORT_OPTIONS,
  DEFAULT_SHARE_CARD_SQUARE_CANVAS,
} from '../config.mjs';
import { buildCustomPreviewEntry, createCustomDraft } from '../custom-entry.mjs';

export function normalizeLookupValue(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase();
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
  const defaultEntry = resolveDefaultEntry(manifest.pages, defaultPageValue) || manifest.pages[0] || null;

  return {
    manifest,
    query: '',
    activeMode: 'library',
    activePlatform: 'imessagePlus',
    activePageId: defaultEntry?.id || null,
    activeInspectorPanel: 'review',
    activeAuditGroup: null,
    activeAuditTarget: null,
    cornerSize: DEFAULT_SHARE_CARD_CORNER_SIZE,
    edgeFeatherEnabled: DEFAULT_SHARE_CARD_EDGE_FEATHER_ENABLED,
    edgeFeatherSize: DEFAULT_SHARE_CARD_EDGE_FEATHER_SIZE,
    squareCanvas: DEFAULT_SHARE_CARD_SQUARE_CANVAS,
    exportStatus: 'idle',
    displayOptions: {
      ...DEFAULT_SHARE_CARD_DISPLAY_OPTIONS,
    },
    exportOptions: {
      ...DEFAULT_SHARE_CARD_EXPORT_OPTIONS,
    },
    customDraft: createCustomDraft(defaultEntry),
    colorSamplingByImage: Object.create(null),
  };
}

export function getActiveEntry(state) {
  if (state.activeMode === 'custom') {
    return buildCustomPreviewEntry(state.customDraft);
  }

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
  if (!filteredPages[0] || filteredPages.some((page) => page.id === state.activePageId)) {
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
