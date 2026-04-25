import { renderPreviewIcon } from './icons.mjs';

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderIcon(icon) {
  return `<span class="carbon-preview-inline-icon" aria-hidden="true">${renderPreviewIcon(icon)}</span>`;
}

export function renderStatusChip({ icon, label, tone = 'neutral' }) {
  return `<span class="carbon-preview-status-chip is-${tone}">${renderIcon(icon)}<span>${escapeHtml(label)}</span></span>`;
}

export function renderContrastChip(label, tone = 'neutral') {
  return `<span class="carbon-preview-contrast-chip is-${tone}">${escapeHtml(label)}</span>`;
}

export function formatContrastRatio(ratio) {
  return Number.isFinite(ratio) ? `${Number(ratio).toFixed(2)}:1` : '—';
}
