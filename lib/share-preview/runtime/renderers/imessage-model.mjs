import { buildQrGeometry } from '../qr-code.mjs';
import {
  buildMetadataLayout,
  buildMetadataText,
  buildTextModel,
  buildTitleAndDescription,
  CARD_WIDTH,
  QR_SIZE,
  resolveBottomAlignedY,
  resolveCoverHeight,
} from './imessage-layout.mjs';

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
  const titleY = infoY + layout.panelPadding.top;
  const titleFirstLineClipHeight = layout.panelPadding.top + 28;
  const titleContinuationClipY = titleY + 24;
  const titleContinuationClipHeight = Math.max(infoY + infoHeight - titleContinuationClipY, 0);

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
    contentColumnAttributes: `data-part="imessage-content-column" aria-label="iMessage 内容列" data-layout-right="${layout.contentColumnRight}" data-layout-width="${layout.contentColumnWidth}"`,
    titleGroupAttributes: 'data-part="imessage-title-group" aria-label="iMessage 标题组"',
    titleClipRects: [
      {
        x: layout.contentColumnX,
        y: infoY,
        width: layout.titleFirstLineWidth,
        height: titleFirstLineClipHeight,
      },
      {
        x: layout.contentColumnX,
        y: titleContinuationClipY,
        width: layout.contentColumnWidth,
        height: titleContinuationClipHeight,
      },
    ],
    qrRailAttributes: qrGeometry
      ? `data-part="imessage-qr-rail" aria-label="iMessage 二维码区域" data-layout-left="${layout.contentColumnRight + layout.qrGutter}" data-layout-width="${layout.qrRailWidth - layout.qrGutter}"`
      : '',
    title: buildTextModel(
      title.titleLines,
      layout.contentColumnX,
      titleY,
      title.titleFontSize,
      24,
      700,
      colors.titleColor,
      'data-part="imessage-title-block" aria-label="iMessage 标题区块"',
    ),
    description: buildTextModel(
      title.descriptionLines,
      layout.contentColumnX,
      infoY + layout.panelPadding.top + titleBlockHeight + 10,
      16,
      22,
      400,
      colors.urlColor,
      'data-part="imessage-description-text" aria-label="iMessage 描述"',
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
      'data-part="imessage-site-name-text" aria-label="iMessage 站点名"',
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
      'data-part="imessage-date-text" aria-label="iMessage 发布日期"',
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
      'data-part="imessage-domain-text" aria-label="iMessage 链接标签"',
    ),
  };
}
