import { splitDisplayTitle } from './svg-utils.mjs';

function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMultilineText(value) {
  const raw = String(value || '').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n').map((line) => collapseWhitespace(line));

  while (lines[0] === '') {
    lines.shift();
  }
  while (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

function buildCustomShareTitle(title, siteName) {
  const safeTitle = collapseWhitespace(title);
  const safeSiteName = collapseWhitespace(siteName);

  if (safeTitle && safeSiteName) {
    return `${safeTitle} · ${safeSiteName}`;
  }

  return safeTitle || safeSiteName;
}

function inferImageName(value) {
  const source = collapseWhitespace(value);
  if (!source) {
    return '';
  }

  if (source.startsWith('data:')) {
    return '';
  }

  const normalized = source.split(/[?#]/, 1)[0];
  const parts = normalized.split('/');
  return collapseWhitespace(parts[parts.length - 1]);
}

export function createCustomDraft(seedEntry = null) {
  const titleParts = splitDisplayTitle(seedEntry || {}, { includeBrackets: false });
  const seedCover = collapseWhitespace(seedEntry?.imageUrl || seedEntry?.imagePath);

  return {
    coverImageHref: seedCover,
    coverImageWidth: Number(seedEntry?.imageWidth || 0) || null,
    coverImageHeight: Number(seedEntry?.imageHeight || 0) || null,
    coverImageName: inferImageName(seedCover),
    title: collapseWhitespace(titleParts.title || seedEntry?.sourceTitle),
    description: normalizeMultilineText(seedEntry?.descriptionText || seedEntry?.description),
    siteName: collapseWhitespace(titleParts.siteName || seedEntry?.siteName || 'Groove Blog'),
    url: collapseWhitespace(seedEntry?.canonicalUrl || seedEntry?.qrUrl),
  };
}

export function buildCustomPreviewEntry(customDraft = {}) {
  const title = collapseWhitespace(customDraft.title);
  const descriptionText = normalizeMultilineText(customDraft.description);
  const description = collapseWhitespace(descriptionText);
  const siteName = collapseWhitespace(customDraft.siteName);
  const url = collapseWhitespace(customDraft.url);
  const coverImageHref = collapseWhitespace(customDraft.coverImageHref);
  const coverImageWidth = Number(customDraft.coverImageWidth || 0) || null;
  const coverImageHeight = Number(customDraft.coverImageHeight || 0) || null;

  return {
    id: 'custom-preview',
    pageKind: 'article',
    pagePath: '/__custom__/',
    rawPagePath: 'Custom Preview',
    sourceTitle: title,
    shareTitle: buildCustomShareTitle(title, siteName),
    description: description || null,
    descriptionText: descriptionText || null,
    imagePath: coverImageHref || null,
    imageUrl: coverImageHref || null,
    imageWidth: coverImageWidth,
    imageHeight: coverImageHeight,
    canonicalUrl: url || null,
    siteName: siteName || null,
    publishedTime: null,
    panelIntent: 'auto',
    qrUrl: url || null,
    isCustom: true,
    platforms: {
      imessagePlus: {
        displayDescription: Boolean(description),
      },
    },
  };
}
