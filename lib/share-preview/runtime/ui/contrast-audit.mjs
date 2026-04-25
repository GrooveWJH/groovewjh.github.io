import { GROUP_LABELS, PART_TO_SELECTION, TARGET_DEFINITIONS } from './contrast-audit-definitions.mjs';
import { buildStageGeometry } from './contrast-audit-geometry.mjs';
import { buildAuditResult, summarizeGroup } from './contrast-audit-results.mjs';
import { collapseWhitespace, parseSvgParts } from './contrast-audit-svg.mjs';

function resolveColorSamplingLabel(colorSamplingState) {
  if (colorSamplingState === 'loading') {
    return '采样中…';
  }
  if (colorSamplingState === 'error') {
    return '回退配色';
  }
  if (colorSamplingState === 'ready') {
    return '实时配色';
  }
  return '静态配色';
}

export function buildContrastAuditModel({
  entry,
  svgMarkup,
  displayOptions = null,
  colorSamplingState = 'unavailable',
  smartColors = null,
  squareCanvas = false,
} = {}) {
  const safeDisplayOptions = { ...(displayOptions || {}) };
  const parts = parseSvgParts(svgMarkup);
  const results = TARGET_DEFINITIONS.map((definition) => buildAuditResult(definition, safeDisplayOptions, parts));
  const groupSummaries = Object.keys(GROUP_LABELS).map((group) =>
    summarizeGroup(
      group,
      results.filter((result) => result.group === group),
    ),
  );
  const consideredResults = results.filter((result) => result.visibilityState !== 'hidden-by-toggle');
  const visibleResults = consideredResults.filter((result) => result.visibilityState === 'visible');
  const firstFailingGroup = groupSummaries.find((group) => group.failingCount > 0);
  const overallWorstRatio = visibleResults.length
    ? Math.min(...visibleResults.map((result) => result.ratio ?? Number.POSITIVE_INFINITY))
    : null;

  return {
    colorSamplingState,
    colorSamplingLabel: resolveColorSamplingLabel(colorSamplingState),
    activeGroup: firstFailingGroup?.group || 'context',
    groups: groupSummaries,
    results,
    summary: {
      overallWorstRatio,
      failingCount: consideredResults.filter((result) => result.visibilityState === 'missing' || !result.aaPlusPass)
        .length,
      aaCount: visibleResults.filter((result) => result.aaPass).length,
      aaPlusCount: visibleResults.filter((result) => result.aaPlusPass).length,
      aaaCount: visibleResults.filter((result) => result.aaaPass).length,
      consideredCount: consideredResults.length,
      groupSummaries,
    },
    stageGeometry: entry ? buildStageGeometry(entry, safeDisplayOptions, smartColors, squareCanvas) : null,
  };
}

export function resolveAuditSelectionFromPart(part) {
  return PART_TO_SELECTION[collapseWhitespace(part).toLowerCase()] || null;
}

export function resolveAuditSelection(auditModel, preferredGroup = null, preferredTarget = null) {
  const groups = new Set(auditModel?.groups?.map((group) => group.group) || []);
  const resultsByTarget = new Map((auditModel?.results || []).map((result) => [result.target, result]));
  const targetResult = preferredTarget ? resultsByTarget.get(preferredTarget) : null;
  if (targetResult) {
    return {
      activeGroup: targetResult.group,
      activeTarget: targetResult.target,
    };
  }

  if (preferredGroup && groups.has(preferredGroup)) {
    return {
      activeGroup: preferredGroup,
      activeTarget: null,
    };
  }

  return {
    activeGroup: auditModel?.activeGroup || 'context',
    activeTarget: null,
  };
}
