import { getAuditGroupNarrative } from './render-audit-copy.mjs';
import { renderStageDecorations } from './render-audit-stage.mjs';
import { escapeHtml, formatContrastRatio, renderContrastChip, renderIcon } from './render-markup.mjs';

function getAuditTone(statusLevel) {
  if (statusLevel === 'complete') {
    return 'ready';
  }
  if (statusLevel === 'partial') {
    return 'warning';
  }
  if (statusLevel === 'fail') {
    return 'error';
  }
  return 'muted';
}

function getAuditResultTone(result) {
  if (result.visibilityState === 'hidden-by-toggle') {
    return 'warning';
  }
  if (result.visibilityState === 'missing') {
    return 'error';
  }
  return result.aaPlusPass ? 'ready' : 'error';
}

function getAuditToneIcon(tone) {
  return tone === 'ready' ? 'ready' : tone === 'warning' ? 'warning' : tone === 'error' ? 'error' : 'warning';
}

function renderAuditStatusIcon(tone) {
  return `<span class="carbon-preview-stage-audit-rail__status-icon is-${tone}" aria-hidden="true">${renderIcon(getAuditToneIcon(tone))}</span>`;
}

function renderAuditThresholdSummary(result) {
  if (result.visibilityState === 'hidden-by-toggle') {
    return [
      renderContrastChip('AA', 'muted'),
      renderContrastChip('AA+', 'muted'),
      renderContrastChip('AAA', 'muted'),
    ].join('');
  }

  return [
    renderContrastChip('AA', result.aaPass ? 'pass' : 'fail'),
    renderContrastChip('AA+', result.aaPlusPass ? 'pass' : 'fail'),
    renderContrastChip('AAA', result.aaaPass ? 'pass' : 'fail'),
  ].join('');
}

function renderAuditGroupButton(groupSummary, selection) {
  const isActive = selection.activeTarget == null && selection.activeGroup === groupSummary.group;
  const tone = getAuditTone(groupSummary.statusLevel);
  const ratioLabel =
    groupSummary.consideredCount === 0
      ? '已隐藏'
      : groupSummary.worstRatio == null
        ? '缺失'
        : formatContrastRatio(groupSummary.worstRatio);

  return `<button
    class="carbon-preview-stage-audit-rail__group-button${isActive ? ' is-active' : ''} is-${tone}"
    type="button"
    data-audit-group-select="${escapeHtml(groupSummary.group)}"
    data-audit-hover-group="${escapeHtml(groupSummary.group)}"
  >
    <span class="carbon-preview-stage-audit-rail__group-label">${renderAuditStatusIcon(tone)}<span>${escapeHtml(groupSummary.label)}</span></span>
    <span class="carbon-preview-stage-audit-rail__group-ratio">${escapeHtml(ratioLabel)}</span>
    <span class="carbon-preview-stage-audit-rail__group-state">${escapeHtml(groupSummary.statusLevel === 'complete' ? '全部通过' : groupSummary.statusLevel === 'partial' ? '部分通过' : groupSummary.statusLevel === 'fail' ? '未通过' : '已隐藏')}</span>
  </button>`;
}

function renderAuditDetailRow(result, selection) {
  const isActive = selection.activeTarget === result.target;
  const tone = getAuditResultTone(result);
  const ratioLabel =
    result.visibilityState === 'hidden-by-toggle'
      ? '已隐藏'
      : result.visibilityState === 'missing'
        ? '缺失'
        : formatContrastRatio(result.ratio);

  return `<button
    class="carbon-preview-stage-audit-rail__detail-row${isActive ? ' is-active' : ''} is-${tone}"
    type="button"
    data-audit-target-select="${escapeHtml(result.target)}"
    data-audit-group="${escapeHtml(result.group)}"
    data-audit-hover-group="${escapeHtml(result.group)}"
    data-audit-hover-target="${escapeHtml(result.target)}"
  >
    <span class="carbon-preview-stage-audit-rail__detail-main">
      <span class="carbon-preview-stage-audit-rail__detail-label">${renderAuditStatusIcon(tone)}<span>${escapeHtml(result.label)}</span></span>
      <span class="carbon-preview-stage-audit-rail__detail-value">${escapeHtml(ratioLabel)}</span>
    </span>
    <span class="carbon-preview-stage-audit-rail__detail-meta">
      ${renderAuditThresholdSummary(result)}
      <span class="carbon-preview-stage-audit-rail__detail-standard">${escapeHtml(result.standardLabel)}</span>
    </span>
  </button>`;
}

function renderContrastAuditRail(auditModel, selection) {
  const activeGroupSummary =
    auditModel.groups.find((group) => group.group === selection.activeGroup) || auditModel.groups[0];
  const visibleDetailItems = activeGroupSummary.items.filter((result) => result.visibilityState !== 'hidden-by-toggle');
  const narrative = getAuditGroupNarrative(activeGroupSummary);
  const worstLabel = Number.isFinite(auditModel.summary.overallWorstRatio)
    ? formatContrastRatio(auditModel.summary.overallWorstRatio)
    : '无';
  const activeTone = getAuditTone(activeGroupSummary.statusLevel);

  return `<aside class="carbon-preview-stage-audit-rail" aria-label="对比度审计">
    <div class="carbon-preview-stage-audit-rail__header">
      <strong>对比度审计</strong>
      <span>${escapeHtml(auditModel.colorSamplingLabel)}</span>
    </div>
    <div class="carbon-preview-stage-audit-rail__policies">
      ${renderContrastChip('WCAG 2.x')}
      ${renderContrastChip('AA+ ≥ 5.5', 'policy')}
    </div>
    <div class="carbon-preview-stage-audit-rail__summary">
      <span class="carbon-preview-contrast-summary-chip">AA+ ${auditModel.summary.aaPlusCount}/${auditModel.summary.consideredCount}</span>
      <span class="carbon-preview-contrast-summary-chip">最低 ${escapeHtml(worstLabel)}</span>
    </div>
    <div class="carbon-preview-stage-audit-rail__body">
      <div class="carbon-preview-stage-audit-rail__nav">
        ${auditModel.groups.map((groupSummary) => renderAuditGroupButton(groupSummary, selection)).join('')}
      </div>
      <section class="carbon-preview-stage-audit-rail__panel">
        <div class="carbon-preview-stage-audit-rail__detail-header">
          <div class="carbon-preview-stage-audit-rail__detail-title">
            <strong>${escapeHtml(activeGroupSummary.label)}</strong>
            <span>${escapeHtml(activeGroupSummary.worstItemLabel || '当前无审计目标')}</span>
          </div>
          <span class="carbon-preview-stage-audit-rail__detail-status is-${activeTone}">${escapeHtml(
            activeGroupSummary.statusLevel === 'complete'
              ? '全部通过'
              : activeGroupSummary.statusLevel === 'partial'
                ? '部分通过'
                : activeGroupSummary.statusLevel === 'fail'
                  ? '未通过'
                  : '已隐藏',
          )}</span>
        </div>
        <div class="carbon-preview-stage-audit-rail__detail-copy">
          <p class="carbon-preview-stage-audit-rail__detail-kicker">该分组判定方式</p>
          <p class="carbon-preview-stage-audit-rail__detail-description">${escapeHtml(narrative.description)}</p>
          <div class="carbon-preview-stage-audit-rail__detail-rules">
            ${narrative.rules.map((rule) => renderContrastChip(rule, 'muted')).join('')}
          </div>
        </div>
        <div class="carbon-preview-stage-audit-rail__detail-list">
          ${visibleDetailItems.length ? visibleDetailItems.map((result) => renderAuditDetailRow(result, selection)).join('') : '<div class="carbon-preview-empty-state">当前分组没有可见审计项。</div>'}
        </div>
      </section>
    </div>
  </aside>`;
}

export function renderStageWithAudit(svgMarkup, auditModel, selection) {
  return `<div class="carbon-preview-stage-stack" data-audit-stage-root>
    ${renderContrastAuditRail(auditModel, selection)}
    <div class="carbon-preview-stage-main">
      <div class="carbon-preview-stage-canvas">
        ${svgMarkup}
        ${renderStageDecorations(auditModel)}
      </div>
    </div>
  </div>`;
}
