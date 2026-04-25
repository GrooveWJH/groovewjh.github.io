export const BODY_TEXT_THRESHOLDS = { aa: 4.5, aaPlus: 5.5, aaa: 7 };
export const LARGE_TEXT_THRESHOLDS = { aa: 3, aaPlus: 5.5, aaa: 4.5 };
export const QR_HEURISTIC_THRESHOLDS = { aa: 4.5, aaPlus: 5.5, aaa: 7 };
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
    profile: 'largeText',
    standardLabel: '大号文本',
  },
  {
    target: 'descriptionBlock',
    group: 'description',
    label: '描述',
    part: 'imessage-description-text',
    backgroundPart: 'imessage-metadata-panel',
    profile: 'bodyText',
    standardLabel: '正文文本',
    toggleKey: 'description',
  },
  {
    target: 'siteNameText',
    group: 'context',
    label: '站点名',
    part: 'imessage-site-name-text',
    backgroundPart: 'imessage-metadata-panel',
    profile: 'bodyText',
    standardLabel: '正文文本',
  },
  {
    target: 'dateText',
    group: 'context',
    label: '发布日期',
    part: 'imessage-date-text',
    backgroundPart: 'imessage-metadata-panel',
    profile: 'bodyText',
    standardLabel: '正文文本',
    toggleKey: 'date',
  },
  {
    target: 'domainText',
    group: 'context',
    label: '链接',
    part: 'imessage-domain-text',
    backgroundPart: 'imessage-metadata-panel',
    profile: 'bodyText',
    standardLabel: '正文文本',
    toggleKey: 'url',
  },
  {
    target: 'qrSymbol',
    group: 'qr',
    label: '二维码图形与底板',
    part: 'imessage-qr-symbol',
    backgroundPart: 'imessage-qr-mask',
    fallbackBackgroundPart: 'imessage-metadata-panel',
    profile: 'qrHeuristic',
    standardLabel: 'QR 启发式',
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

export function getThresholds(profile) {
  if (profile === 'largeText') {
    return LARGE_TEXT_THRESHOLDS;
  }
  if (profile === 'qrHeuristic') {
    return QR_HEURISTIC_THRESHOLDS;
  }
  return BODY_TEXT_THRESHOLDS;
}
