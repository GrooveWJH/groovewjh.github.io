import { escapeXml, renderTextBlock } from "../svg-utils.mjs";
import { renderQrOverlay } from "../qr-code.mjs";
import { buildIMessageCardModel, resolveIMessageDescriptionBreakState } from "./imessage-model.mjs";

function renderIMessageCover(href, width, height) {
  const clipPath = ["M20 48", "A30 30 0 0 1 50 18", `H${20 + width - 30}`, `A30 30 0 0 1 ${20 + width} 48`, `V${18 + height}`, "H20", "Z"].join(" ");
  const clip = `<clipPath id="imessage-cover"><path d="${clipPath}"></path></clipPath>`;
  const background = `<path d="${clipPath}" fill="#ececf2"></path>`;
  if (!href) {
    return `${clip}${background}<text x="${20 + (width / 2)}" y="${18 + (height / 2)}" text-anchor="middle" fill="#8c8f96" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif" font-size="22" font-weight="600">Preview</text>`;
  }
  return `${clip}${background}<image href="${escapeXml(href)}" x="20" y="18" width="${width}" height="${height}" preserveAspectRatio="xMidYMin slice" clip-path="url(#imessage-cover)"></image>`;
}

function renderOptionalTextBlock(block) {
  return block ? renderTextBlock(block) : "";
}

export { resolveIMessageDescriptionBreakState };

export function renderIMessageCard(entry, imageHref, options = {}) {
  const model = buildIMessageCardModel(entry, options);
  return `<svg xmlns="http://www.w3.org/2000/svg" data-part="imessage-card" aria-label="iMessage Share Card" viewBox="0 0 600 ${model.cardHeight}" width="600" height="${model.cardHeight}">
    <defs>
      <filter id="imessage-shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#10131a" flood-opacity="0.18"></feDropShadow>
      </filter>
      <clipPath id="imessage-card">
        <rect x="20" y="18" width="${model.cardWidth}" height="${model.cardBodyHeight}" rx="30" ry="30"></rect>
      </clipPath>
      <clipPath id="imessage-content-column-clip">
        <rect x="${model.layout.contentColumnX}" y="${model.infoY}" width="${model.layout.contentColumnWidth}" height="${model.infoHeight}"></rect>
      </clipPath>
    </defs>
    <rect width="600" height="${model.cardHeight}" fill="#edf1f7"></rect>
    <rect x="20" y="18" width="${model.cardWidth}" height="${model.cardBodyHeight}" rx="30" ry="30" fill="#f2f2f7" filter="url(#imessage-shadow)"></rect>
    ${renderIMessageCover(imageHref, model.cardWidth, model.coverHeight)}
    <rect x="20" y="${model.infoY}" width="${model.cardWidth}" height="${model.infoHeight}" data-part="imessage-metadata-panel" aria-label="iMessage Metadata Panel" fill="${model.colors.backgroundColor}" clip-path="url(#imessage-card)"></rect>
    <g ${model.contentColumnAttributes} clip-path="url(#imessage-content-column-clip)">
    ${renderOptionalTextBlock(model.title)}
    ${renderOptionalTextBlock(model.description)}
    ${renderOptionalTextBlock(model.siteName)}
    ${renderOptionalTextBlock(model.date)}
    ${renderOptionalTextBlock(model.domain)}
    </g>
    ${model.qrGeometry ? `<g ${model.qrRailAttributes}>${renderQrOverlay(model.qrGeometry, model.colors)}</g>` : ""}
  </svg>`;
}
