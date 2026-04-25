import { escapeHtml } from './render-markup.mjs';

function formatStageBoxStyle(box, viewBoxWidth, viewBoxHeight) {
  if (!box || !viewBoxWidth || !viewBoxHeight) {
    return '';
  }

  return [
    `left:${((box.x / viewBoxWidth) * 100).toFixed(4)}%`,
    `top:${((box.y / viewBoxHeight) * 100).toFixed(4)}%`,
    `width:${((box.width / viewBoxWidth) * 100).toFixed(4)}%`,
    `height:${((box.height / viewBoxHeight) * 100).toFixed(4)}%`,
  ].join(';');
}

function renderStageHighlightLayer(auditModel) {
  const geometry = auditModel.stageGeometry;
  if (!geometry) {
    return '';
  }

  const groupHighlights = auditModel.groups
    .map((groupSummary) => {
      const box = geometry.groupBoxes[groupSummary.group];
      if (!box) {
        return '';
      }
      return `<div
        class="carbon-preview-stage-highlight is-group"
        data-audit-highlight-group="${escapeHtml(groupSummary.group)}"
        style="${formatStageBoxStyle(box, geometry.viewBoxWidth, geometry.viewBoxHeight)}"
      ></div>`;
    })
    .join('');
  const targetHighlights = auditModel.results
    .map((result) => {
      const box = geometry.targetBoxes[result.target];
      if (!box) {
        return '';
      }
      return `<div
        class="carbon-preview-stage-highlight is-target"
        data-audit-highlight-target="${escapeHtml(result.target)}"
        style="${formatStageBoxStyle(box, geometry.viewBoxWidth, geometry.viewBoxHeight)}"
      ></div>`;
    })
    .join('');

  return `<div class="carbon-preview-stage-highlights" aria-hidden="true">${groupHighlights}${targetHighlights}</div>`;
}

function renderStageHotspots(auditModel) {
  const geometry = auditModel.stageGeometry;
  if (!geometry) {
    return '';
  }

  return `<div class="carbon-preview-stage-hotspots">
    ${auditModel.results
      .map((result) => {
        const box = geometry.targetBoxes[result.target];
        if (!box) {
          return '';
        }
        return `<button
          class="carbon-preview-stage-hotspot"
          type="button"
          aria-label="${escapeHtml(result.label)}"
          data-audit-stage-hotspot="${escapeHtml(result.target)}"
          data-audit-target-select="${escapeHtml(result.target)}"
          data-audit-group="${escapeHtml(result.group)}"
          data-audit-hover-group="${escapeHtml(result.group)}"
          data-audit-hover-target="${escapeHtml(result.target)}"
          style="${formatStageBoxStyle(box, geometry.viewBoxWidth, geometry.viewBoxHeight)}"
        ></button>`;
      })
      .join('')}
  </div>`;
}

export function renderStageDecorations(auditModel) {
  return `${renderStageHighlightLayer(auditModel)}${renderStageHotspots(auditModel)}`;
}
