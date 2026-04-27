import { collapseWhitespace } from './smart-color-space.mjs';

export const DEFAULT_PANEL_INTENT = 'auto';

const PANEL_INTENT_ALIASES = Object.freeze({
  auto: 'auto',
  'dark-anchor': 'dark-anchor',
  darkanchor: 'dark-anchor',
  dark: 'dark-anchor',
  'light-air': 'light-air',
  lightair: 'light-air',
  light: 'light-air',
  'neutral-balance': 'neutral-balance',
  neutralbalance: 'neutral-balance',
  neutral: 'neutral-balance',
  'surface-match': 'surface-match',
  surfacematch: 'surface-match',
  surface: 'surface-match',
});

const INTENT_LABELS = Object.freeze({
  auto: '自动',
  'dark-anchor': '深色锚点',
  'light-air': '轻盈浅面',
  'neutral-balance': '中性配重',
  'surface-match': '表面延续',
});

export function normalizePanelIntent(value) {
  const normalized = collapseWhitespace(value).toLowerCase().replace(/[_\s]+/g, '-');
  return PANEL_INTENT_ALIASES[normalized] || DEFAULT_PANEL_INTENT;
}

export function getPanelIntentLabel(intent) {
  return INTENT_LABELS[normalizePanelIntent(intent)] || INTENT_LABELS.auto;
}

export function getPanelIntentBias(intent) {
  const normalized = normalizePanelIntent(intent);
  if (normalized === 'dark-anchor') {
    return { anchorDark: 0.9, atmosphereMid: 0.25, surfaceLight: -0.4, accent: -0.15, toneMode: 'dark-panel' };
  }
  if (normalized === 'light-air') {
    return { anchorDark: -0.35, atmosphereMid: 0.1, surfaceLight: 0.8, accent: -0.05, toneMode: 'light-panel' };
  }
  if (normalized === 'surface-match') {
    return { anchorDark: 0.1, atmosphereMid: 0.75, surfaceLight: 0.15, accent: -0.1, toneMode: 'auto' };
  }
  if (normalized === 'neutral-balance') {
    return { anchorDark: 0.2, atmosphereMid: 0.55, surfaceLight: 0.2, accent: -0.08, toneMode: 'auto' };
  }
  return { anchorDark: 0, atmosphereMid: 0, surfaceLight: 0, accent: 0, toneMode: 'auto' };
}

export function formatSelectionReason({ family = 'atmosphereMid', sourceLabel = '图像主体', toneMode = 'light-panel' } = {}) {
  const toneLabel = toneMode === 'dark-panel' ? 'dark-panel' : 'light-panel';
  if (family === 'anchorDark') {
    return `信息面板继承 ${sourceLabel} 的深色锚点，以补足下半部配重并延续整体情绪。(${toneLabel})`;
  }
  if (family === 'surfaceLight') {
    return `信息面板延续 ${sourceLabel} 的浅色表面，让卡片保持更轻的呼吸感。(${toneLabel})`;
  }
  if (family === 'accent') {
    return `信息面板参考 ${sourceLabel} 的强调色家族，但已压低饱和度以保持阅读舒适。(${toneLabel})`;
  }
  return `信息面板参考 ${sourceLabel} 的环境色，优先保持图像上下衔接与整体平衡。(${toneLabel})`;
}
