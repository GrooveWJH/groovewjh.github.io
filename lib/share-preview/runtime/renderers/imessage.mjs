import { DEFAULT_SHARE_CARD_CORNER_SIZE } from '../config.mjs';
import { renderQrOverlay } from '../qr-code.mjs';
import { escapeXml, renderTextBlock } from '../svg-utils.mjs';
import { getSvgPath } from '../vendor/figma-squircle.mjs';
import { buildIMessageCardModel } from './imessage-model.mjs';

const CARD_X = 20;
const CARD_Y = 18;
const CARD_CORNER_SMOOTHING = 1;
const CARD_PRESERVE_SMOOTHING = true;

function resolveCornerSize(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return DEFAULT_SHARE_CARD_CORNER_SIZE;
  }

  return Math.max(0, numericValue);
}

function buildSquirclePath(width, height, cornerSize) {
  return getSvgPath({
    width,
    height,
    cornerRadius: resolveCornerSize(cornerSize),
    cornerSmoothing: CARD_CORNER_SMOOTHING,
    preserveSmoothing: CARD_PRESERVE_SMOOTHING,
  });
}

function renderIMessageCover(href, width, height) {
  const background = `<rect x="${CARD_X}" y="${CARD_Y}" width="${width}" height="${height}" data-part="imessage-cover-background" fill="#ececf2" clip-path="url(#imessage-card)"></rect>`;
  if (!href) {
    return `${background}<text x="${CARD_X + width / 2}" y="${CARD_Y + height / 2}" text-anchor="middle" fill="#8c8f96" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif" font-size="22" font-weight="600">预览</text>`;
  }
  return `${background}<image href="${escapeXml(href)}" x="${CARD_X}" y="${CARD_Y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMin slice" clip-path="url(#imessage-card)"></image>`;
}

function renderOptionalTextBlock(block) {
  return block ? renderTextBlock(block) : '';
}

export function renderIMessageCard(entry, imageHref, options = {}) {
  const model = buildIMessageCardModel(entry, options);
  const cardPath = buildSquirclePath(model.cardWidth, model.cardBodyHeight, options.cornerSize);
  const outerCanvasBackground = options.squareCanvas
    ? `<rect width="600" height="${model.cardHeight}" fill="#edf1f7"></rect>`
    : '';
  const edgeFeatherFilter = options.squareCanvas
    ? ''
    : `<filter id="imessage-edge-feather" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="expanded-alpha"></feMorphology>
        <feGaussianBlur in="expanded-alpha" stdDeviation="2.2" result="expanded-blur"></feGaussianBlur>
        <feComposite in="expanded-blur" in2="SourceAlpha" operator="out" result="outer-feather"></feComposite>
        <feFlood flood-color="#f2f2f7" flood-opacity="0.24" result="feather-color"></feFlood>
        <feComposite in="feather-color" in2="outer-feather" operator="in" result="colored-feather"></feComposite>
      </filter>`;
  const edgeFeatherPath = options.squareCanvas
    ? ''
    : `<path d="${cardPath}" transform="translate(${CARD_X} ${CARD_Y})" data-part="imessage-card-feather" fill="#f2f2f7" filter="url(#imessage-edge-feather)"></path>`;
  const titleClipRects = model.titleClipRects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"></rect>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" data-part="imessage-card" aria-label="iMessage 分享卡片" viewBox="0 0 600 ${model.cardHeight}" width="600" height="${model.cardHeight}">
    <defs>
      <filter id="imessage-shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#10131a" flood-opacity="0.18"></feDropShadow>
      </filter>
      ${edgeFeatherFilter}
      <clipPath id="imessage-card">
        <path d="${cardPath}" transform="translate(${CARD_X} ${CARD_Y})" data-part="imessage-card-clip-path"></path>
      </clipPath>
      <clipPath id="imessage-content-column-clip">
        <rect x="${model.layout.contentColumnX}" y="${model.infoY}" width="${model.layout.contentColumnWidth}" height="${model.infoHeight}"></rect>
      </clipPath>
      <clipPath id="imessage-title-clip">
        ${titleClipRects}
      </clipPath>
    </defs>
    ${outerCanvasBackground}
    ${edgeFeatherPath}
    <path d="${cardPath}" transform="translate(${CARD_X} ${CARD_Y})" data-part="imessage-card-shell" fill="#f2f2f7" filter="url(#imessage-shadow)"></path>
    ${renderIMessageCover(imageHref, model.cardWidth, model.coverHeight)}
    <rect x="${CARD_X}" y="${model.infoY}" width="${model.cardWidth}" height="${model.infoHeight}" data-part="imessage-metadata-panel" aria-label="iMessage 信息面板" fill="${model.colors.backgroundColor}" clip-path="url(#imessage-card)"></rect>
    <g ${model.titleGroupAttributes} clip-path="url(#imessage-title-clip)">
    ${renderOptionalTextBlock(model.title)}
    </g>
    <g ${model.contentColumnAttributes} clip-path="url(#imessage-content-column-clip)">
    ${renderOptionalTextBlock(model.description)}
    ${renderOptionalTextBlock(model.siteName)}
    ${renderOptionalTextBlock(model.date)}
    ${renderOptionalTextBlock(model.domain)}
    </g>
    ${model.qrGeometry ? `<g ${model.qrRailAttributes}>${renderQrOverlay(model.qrGeometry, model.colors)}</g>` : ''}
  </svg>`;
}
