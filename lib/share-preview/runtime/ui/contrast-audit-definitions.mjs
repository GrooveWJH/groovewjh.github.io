export const WCAG_REFERENCE_THRESHOLDS = Object.freeze({
  largeText: { aa: 3, aaa: 4.5, label: 'WCAG 大号文本参考' },
  bodyText: { aa: 4.5, aaa: 7, label: 'WCAG 正文文本参考' },
  qr: { aa: 4.5, aaa: 7, label: 'QR 可扫描参考' },
});

export const ROLE_RELEASE_THRESHOLDS = Object.freeze({
  title: 5.5,
  description: 5.5,
  context: 5.5,
  qr: 7.0,
});

export const GROUP_LABELS = {
  title: '标题',
  description: '描述',
  context: '信息区',
  qr: '二维码',
};

export const TARGET_DEFINITIONS = [
  {
    target: 'titleBlock',
    group: 'title',
    label: '标题区块',
    part: 'imessage-title-block',
    backgroundPart: 'imessage-metadata-panel',
    token: 'titleFg',
    backgroundToken: 'panelBg',
    wcagProfile: 'largeText',
  },
  {
    target: 'descriptionBlock',
    group: 'description',
    label: '描述',
    part: 'imessage-description-text',
    backgroundPart: 'imessage-metadata-panel',
    token: 'bodyFg',
    backgroundToken: 'panelBg',
    wcagProfile: 'bodyText',
    toggleKey: 'description',
  },
  {
    target: 'siteNameText',
    group: 'context',
    label: '站点名',
    part: 'imessage-site-name-text',
    backgroundPart: 'imessage-metadata-panel',
    token: 'contextFg',
    backgroundToken: 'panelBg',
    wcagProfile: 'bodyText',
  },
  {
    target: 'dateText',
    group: 'context',
    label: '发布日期',
    part: 'imessage-date-text',
    backgroundPart: 'imessage-metadata-panel',
    token: 'contextFg',
    backgroundToken: 'panelBg',
    wcagProfile: 'bodyText',
    toggleKey: 'date',
  },
  {
    target: 'domainText',
    group: 'context',
    label: '链接',
    part: 'imessage-domain-text',
    backgroundPart: 'imessage-metadata-panel',
    token: 'contextFg',
    backgroundToken: 'panelBg',
    wcagProfile: 'bodyText',
    toggleKey: 'url',
  },
  {
    target: 'qrSymbol',
    group: 'qr',
    label: '二维码图形与底板',
    part: 'imessage-qr-symbol',
    backgroundPart: 'imessage-qr-mask',
    fallbackBackgroundPart: 'imessage-metadata-panel',
    token: 'qrFg',
    backgroundToken: 'qrMaskBg',
    wcagProfile: 'qr',
    toggleKey: 'qr',
  },
];

export const PART_TO_SELECTION = Object.freeze({
  'imessage-title-block': { group: 'title', target: 'titleBlock' },
  'imessage-title-group': { group: 'title', target: 'titleBlock' },
  'imessage-description-text': { group: 'description', target: 'descriptionBlock' },
  'imessage-site-name-text': { group: 'context', target: 'siteNameText' },
  'imessage-date-text': { group: 'context', target: 'dateText' },
  'imessage-domain-text': { group: 'context', target: 'domainText' },
  'imessage-qr-symbol': { group: 'qr', target: 'qrSymbol' },
  'imessage-qr-mask': { group: 'qr', target: 'qrSymbol' },
  'imessage-qr-overlay': { group: 'qr', target: 'qrSymbol' },
  'imessage-qr-rail': { group: 'qr', target: 'qrSymbol' },
});

export function getWcagReference(profile) {
  return WCAG_REFERENCE_THRESHOLDS[profile] || WCAG_REFERENCE_THRESHOLDS.bodyText;
}
