import { resolveDescriptionBreakState } from '../description-break.mjs';
import { buildQrGeometry } from '../qr-code.mjs';
import {
  getDomainLabel,
  measureTextMetrics,
  measureTextWidth,
  splitDisplayTitle,
  wrapTextByWidth,
} from '../svg-utils.mjs';

const CARD_WIDTH = 560;
const PANEL_X = 20;
const CONTENT_X = 42;
const PANEL_RIGHT_PADDING = 32;
const QR_SIZE = 128;
const QR_INSET = 22;
const QR_GUTTER = 22;

function buildMetadataLayout(showQr) {
  const panelRight = PANEL_X + CARD_WIDTH;
  const qrRailWidth = showQr ? QR_SIZE + QR_INSET + QR_GUTTER : 0;
  const contentColumnRight = showQr ? panelRight - qrRailWidth : panelRight - PANEL_RIGHT_PADDING;
  return {
    panelPadding: { top: 40, bottom: QR_INSET },
    qrRailInset: QR_INSET,
    qrGutter: QR_GUTTER,
    contentColumnX: CONTENT_X,
    contentColumnRight,
    contentColumnWidth: contentColumnRight - CONTENT_X,
    qrRailWidth,
    qrFrame: showQr ? { x: panelRight - QR_INSET - QR_SIZE, size: QR_SIZE } : null,
  };
}

function resolveCoverHeight(entry) {
  const width = Number(entry?.imageWidth || 0);
  const height = Number(entry?.imageHeight || 0);
  return width > 0 && height > 0 ? Math.round(CARD_WIDTH * (height / width)) : Math.round(CARD_WIDTH * 0.62);
}

function resolveBottomAlignedY(text, bottomY, textOptions) {
  return Number(bottomY || 0) - measureTextMetrics(text, textOptions).descent;
}

function buildTextModel(lines, x, y, fontSize, lineHeight, fontWeight, fill, attributes) {
  return lines.length ? { lines, x, y, fontSize, lineHeight, fontWeight, fill, attributes } : null;
}

function buildTitleAndDescription(entry, includeDescription, displayOptions, layout) {
  const titleParts = splitDisplayTitle(entry);
  const showDescription = includeDescription && displayOptions?.description !== false;
  const titleFontSize = showDescription ? 19 : 20;
  return {
    titleParts,
    showDescription,
    titleFontSize,
    titleLines: wrapTextByWidth(titleParts.title, {
      maxWidth: layout.contentColumnWidth,
      maxLines: 2,
      fontSize: titleFontSize,
      fontWeight: 700,
    }),
    descriptionLines: showDescription
      ? resolveDescriptionBreakState(entry?.description, {
          maxWidth: layout.contentColumnWidth,
          fontSize: 16,
          fontWeight: 400,
          breakStartIndex: displayOptions?.descriptionBreakStartIndex,
        }).lines
      : [],
  };
}

function buildMetadataText(entry, displayOptions, layout, titleParts) {
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

export function resolveIMessageDescriptionBreakState(
  entry,
  { includeDescription = false, displayOptions = null } = {},
) {
  const showDescription = includeDescription && displayOptions?.description !== false;
  if (!showDescription) {
    return { lines: [], defaultBreakStartIndex: null, effectiveBreakStartIndex: null, maxBreakStartIndex: null };
  }
  const layout = buildMetadataLayout(displayOptions?.qr !== false && Boolean(entry?.qrUrl));
  return resolveDescriptionBreakState(entry?.description, {
    maxWidth: layout.contentColumnWidth,
    fontSize: 16,
    fontWeight: 400,
    breakStartIndex: displayOptions?.descriptionBreakStartIndex,
  });
}

export function buildIMessageCardModel(
  entry,
  { includeDescription = false, smartColors = null, displayOptions = null } = {},
) {
  const coverHeight = resolveCoverHeight(entry);
  const showQr = displayOptions?.qr !== false && Boolean(entry?.qrUrl);
  const layout = buildMetadataLayout(showQr);
  const title = buildTitleAndDescription(entry, includeDescription, displayOptions, layout);
  const metadata = buildMetadataText(entry, displayOptions, layout, title.titleParts);
  const colors = smartColors || { backgroundColor: '#d7d7dc', titleColor: '#111111', urlColor: '#74747a' };
  const titleBlockHeight = title.titleLines.length ? (title.titleLines.length - 1) * 24 + 22 : 0;
  const descriptionBlockHeight = title.descriptionLines.length ? (title.descriptionLines.length - 1) * 22 + 18 : 0;
  let topContentHeight = layout.panelPadding.top + titleBlockHeight;
  if (descriptionBlockHeight > 0) {
    topContentHeight += 10 + descriptionBlockHeight;
  }
  let bottomMetaHeight = metadata.siteNameLines.length || metadata.dateLines.length ? 18 : 0;
  if (metadata.domainLines.length) {
    bottomMetaHeight += bottomMetaHeight > 0 ? 30 : 18;
  }
  const textRequiredHeight =
    topContentHeight + (bottomMetaHeight > 0 ? 18 + bottomMetaHeight : 0) + layout.panelPadding.bottom;
  const infoHeight = Math.max(
    title.showDescription ? 148 : 112,
    textRequiredHeight,
    showQr ? layout.panelPadding.top + QR_SIZE + layout.qrRailInset : 0,
  );
  const infoY = 18 + coverHeight;
  const qrGeometry = showQr
    ? buildQrGeometry(entry.qrUrl, {
        x: layout.qrFrame.x,
        y: infoY + infoHeight - QR_SIZE - layout.qrRailInset,
        size: layout.qrFrame.size,
      })
    : null;
  const metadataBottomY = qrGeometry?.symbolBounds.bottom || infoY + infoHeight - layout.panelPadding.bottom;
  const domainBottomY = metadata.domainLines.length ? metadataBottomY : 0;
  const metaRowBottomY =
    metadata.siteNameLines.length || metadata.dateLines.length
      ? metadata.domainLines.length
        ? domainBottomY - 30
        : metadataBottomY
      : 0;
  return {
    cardWidth: CARD_WIDTH,
    coverHeight,
    cardBodyHeight: coverHeight + infoHeight,
    cardHeight: coverHeight + infoHeight + 36,
    infoY,
    infoHeight,
    layout,
    colors,
    qrGeometry,
    contentColumnAttributes: `data-part="imessage-content-column" aria-label="iMessage Content Column" data-layout-right="${layout.contentColumnRight}" data-layout-width="${layout.contentColumnWidth}"`,
    qrRailAttributes: qrGeometry
      ? `data-part="imessage-qr-rail" aria-label="iMessage QR Rail" data-layout-left="${layout.contentColumnRight + layout.qrGutter}" data-layout-width="${layout.qrRailWidth - layout.qrGutter}"`
      : '',
    title: buildTextModel(
      title.titleLines,
      layout.contentColumnX,
      infoY + layout.panelPadding.top,
      title.titleFontSize,
      24,
      700,
      colors.titleColor,
      'data-part="imessage-title-block" aria-label="iMessage Title Block"',
    ),
    description: buildTextModel(
      title.descriptionLines,
      layout.contentColumnX,
      infoY + layout.panelPadding.top + titleBlockHeight + 10,
      16,
      22,
      400,
      colors.urlColor,
      'data-part="imessage-description-text" aria-label="iMessage Description"',
    ),
    siteName: buildTextModel(
      metadata.siteNameLines,
      layout.contentColumnX,
      metadata.siteNameLines[0]
        ? resolveBottomAlignedY(metadata.siteNameLines[0], metaRowBottomY, { fontSize: 17, fontWeight: 600 })
        : 0,
      17,
      18,
      600,
      colors.urlColor,
      'data-part="imessage-site-name-text" aria-label="iMessage Site Name"',
    ),
    date: buildTextModel(
      metadata.dateLines,
      metadata.dateX,
      metadata.dateLines[0]
        ? resolveBottomAlignedY(metadata.dateLines[0], metaRowBottomY, { fontSize: 16, fontWeight: 500 })
        : 0,
      16,
      18,
      500,
      colors.urlColor,
      'data-part="imessage-date-text" aria-label="iMessage Published Date"',
    ),
    domain: buildTextModel(
      metadata.domainLines,
      layout.contentColumnX,
      metadata.domainLines[0]
        ? resolveBottomAlignedY(metadata.domainLines[0], domainBottomY, { fontSize: 16, fontWeight: 500 })
        : 0,
      16,
      18,
      500,
      colors.urlColor,
      'data-part="imessage-domain-text" aria-label="iMessage Domain Label"',
    ),
  };
}
