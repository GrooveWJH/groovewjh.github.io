import {
  getDomainLabel,
  measureTextMetrics,
  measureTextWidth,
  splitDisplayTitle,
  wrapTextByLineWidths,
  wrapTextByWidth,
  wrapTextPreservingLineBreaks,
} from '../svg-utils.mjs';

const CARD_WIDTH = 560;
const PANEL_X = 20;
const CONTENT_X = 42;
const PANEL_RIGHT_PADDING = 32;
const QR_SIZE = 128;
const QR_INSET = 22;
const QR_GUTTER = 22;

export { CARD_WIDTH, QR_SIZE };

export function buildMetadataLayout(showQr) {
  const panelRight = PANEL_X + CARD_WIDTH;
  const qrRailWidth = showQr ? QR_SIZE + QR_INSET + QR_GUTTER : 0;
  const titleFirstLineRight = panelRight - PANEL_RIGHT_PADDING;
  const contentColumnRight = showQr ? panelRight - qrRailWidth : panelRight - PANEL_RIGHT_PADDING;
  return {
    panelPadding: { top: 40, bottom: QR_INSET },
    qrRailInset: QR_INSET,
    qrGutter: QR_GUTTER,
    contentColumnX: CONTENT_X,
    titleFirstLineRight,
    titleFirstLineWidth: titleFirstLineRight - CONTENT_X,
    contentColumnRight,
    contentColumnWidth: contentColumnRight - CONTENT_X,
    qrRailWidth,
    qrFrame: showQr ? { x: panelRight - QR_INSET - QR_SIZE, size: QR_SIZE } : null,
  };
}

export function resolveCoverHeight(entry) {
  const width = Number(entry?.imageWidth || 0);
  const height = Number(entry?.imageHeight || 0);
  return width > 0 && height > 0 ? Math.round(CARD_WIDTH * (height / width)) : Math.round(CARD_WIDTH * 0.62);
}

export function resolveBottomAlignedY(text, bottomY, textOptions) {
  return Number(bottomY || 0) - measureTextMetrics(text, textOptions).descent;
}

export function buildTextModel(lines, x, y, fontSize, lineHeight, fontWeight, fill, attributes) {
  return lines.length ? { lines, x, y, fontSize, lineHeight, fontWeight, fill, attributes } : null;
}

export function buildTitleAndDescription(entry, includeDescription, displayOptions, layout) {
  const titleParts = splitDisplayTitle(entry);
  const showDescription = includeDescription && displayOptions?.description !== false;
  const titleFontSize = showDescription ? 19 : 20;
  const titleLineWidths =
    displayOptions?.qr !== false && Boolean(entry?.qrUrl)
      ? [layout.titleFirstLineWidth, layout.contentColumnWidth]
      : [layout.contentColumnWidth];

  return {
    titleParts,
    showDescription,
    titleFontSize,
    titleLines: wrapTextByLineWidths(titleParts.title, {
      lineWidths: titleLineWidths,
      maxLines: 2,
      fontSize: titleFontSize,
      fontWeight: 700,
    }),
    descriptionLines: showDescription
      ? wrapTextPreservingLineBreaks(entry?.descriptionText || entry?.description, {
          maxWidth: layout.contentColumnWidth,
          fontSize: 16,
          fontWeight: 400,
        })
      : [],
  };
}

export function buildMetadataText(entry, displayOptions, layout, titleParts) {
  const domainLabel = displayOptions?.url !== false ? getDomainLabel(entry) : '';
  const dateLabel = displayOptions?.date && entry?.publishedTime ? String(entry.publishedTime) : '';
  const dateLines = wrapTextByWidth(dateLabel, {
    maxWidth: layout.contentColumnWidth,
    maxLines: 1,
    fontSize: 16,
    fontWeight: 500,
  });
  const dateWidth = dateLines[0] ? measureTextWidth(dateLines[0], { fontSize: 16, fontWeight: 500 }) : 0;
  const siteNameLines = wrapTextByWidth(titleParts.siteName || entry.siteName || '', {
    maxWidth: dateLines[0] ? Math.max(96, layout.contentColumnWidth - dateWidth - 18) : layout.contentColumnWidth,
    maxLines: 1,
    fontSize: 17,
    fontWeight: 600,
  });

  return {
    siteNameLines,
    dateLines,
    domainLines: wrapTextByWidth(domainLabel, {
      maxWidth: layout.contentColumnWidth,
      maxLines: 1,
      fontSize: 16,
      fontWeight: 500,
    }),
    dateX: dateLines[0]
      ? layout.contentColumnX +
        ((siteNameLines[0] ? measureTextWidth(siteNameLines[0], { fontSize: 17, fontWeight: 600 }) : 0) + 18)
      : 0,
  };
}
