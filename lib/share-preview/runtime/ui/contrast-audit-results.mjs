import { contrastRatio, normalizeSmartColorTokens } from '../smart-colors-core.mjs';
import { GROUP_LABELS, ROLE_RELEASE_THRESHOLDS, getWcagReference } from './contrast-audit-definitions.mjs';
import { getNormalizedPartColor } from './contrast-audit-svg.mjs';

function resolveVisibilityState(definition, displayOptions, parts) {
  if (definition.toggleKey && displayOptions?.[definition.toggleKey] === false) {
    return 'hidden-by-toggle';
  }
  return parts.has(definition.part) ? 'visible' : 'missing';
}

function resolveSvgBackgroundColor(definition, parts) {
  const directColor = getNormalizedPartColor(parts, definition.backgroundPart);
  if (directColor && directColor !== 'transparent') {
    return directColor;
  }
  if (definition.fallbackBackgroundPart) {
    const fallbackColor = getNormalizedPartColor(parts, definition.fallbackBackgroundPart);
    if (fallbackColor && fallbackColor !== 'transparent') {
      return fallbackColor;
    }
  }
  return directColor || null;
}

function resolveTokenColors(definition, smartColors, parts) {
  if (!smartColors) {
    return {
      foreground: getNormalizedPartColor(parts, definition.part),
      background: resolveSvgBackgroundColor(definition, parts),
    };
  }
  const tokens = normalizeSmartColorTokens(smartColors);
  return {
    foreground: tokens[definition.token] || null,
    background: tokens[definition.backgroundToken] || resolveSvgBackgroundColor(definition, parts),
  };
}

function buildFailureReason(result) {
  if (result.visibilityState === 'hidden-by-toggle') return '当前被字段开关隐藏';
  if (result.visibilityState === 'missing') return '渲染结果缺少这个角色节点';
  if (result.releasePass) return '达到内部发布线';
  return `低于 ${result.releaseThreshold.toFixed(1)}:1 的内部发布线`;
}

export function buildAuditResult(definition, displayOptions, parts, smartColors = null) {
  const visibilityState = resolveVisibilityState(definition, displayOptions, parts);
  const wcagReference = getWcagReference(definition.wcagProfile);
  const colors = resolveTokenColors(definition, smartColors, parts);
  const ratio =
    visibilityState === 'visible' && colors.foreground && colors.background && colors.background !== 'transparent'
      ? contrastRatio(colors.foreground, colors.background)
      : null;
  const releaseThreshold = ROLE_RELEASE_THRESHOLDS[definition.group];

  const result = {
    target: definition.target,
    group: definition.group,
    label: definition.label,
    token: definition.token,
    backgroundToken: definition.backgroundToken,
    ratio,
    foreground: colors.foreground,
    background: colors.background,
    wcagReference,
    releaseThreshold,
    releasePass: ratio != null && ratio >= releaseThreshold,
    aaPass: ratio != null && ratio >= wcagReference.aa,
    aaPlusPass: ratio != null && ratio >= releaseThreshold,
    aaaPass: ratio != null && ratio >= wcagReference.aaa,
    visibilityState,
  };

  return {
    ...result,
    failureReason: buildFailureReason(result),
  };
}

export function summarizeGroup(group, items) {
  const consideredItems = items.filter((item) => item.visibilityState !== 'hidden-by-toggle');
  const visibleItems = consideredItems.filter((item) => item.visibilityState === 'visible');
  const passingItems = visibleItems.filter((item) => item.releasePass);
  const missingItem = consideredItems.find((item) => item.visibilityState === 'missing') || null;
  const worstVisibleItem =
    visibleItems.reduce((worst, item) => {
      if (!worst || (item.ratio ?? Number.POSITIVE_INFINITY) < (worst.ratio ?? Number.POSITIVE_INFINITY)) {
        return item;
      }
      return worst;
    }, null) || null;
  const worstItem = missingItem || worstVisibleItem || items[0] || null;
  const statusLevel =
    consideredItems.length === 0
      ? 'muted'
      : passingItems.length === consideredItems.length
        ? 'complete'
        : passingItems.length === 0
          ? 'fail'
          : 'partial';

  return {
    group,
    label: GROUP_LABELS[group],
    items,
    consideredCount: consideredItems.length,
    passCount: passingItems.length,
    failingCount: consideredItems.filter((item) => item.visibilityState === 'missing' || !item.releasePass).length,
    worstTarget: worstItem?.target || null,
    worstItemLabel: worstItem?.label || '',
    worstRatio: worstVisibleItem?.ratio ?? null,
    statusLevel,
    statusIcon: statusLevel === 'complete' ? 'ready' : statusLevel === 'partial' ? 'warning' : 'error',
    aaPass:
      consideredItems.length > 0 && consideredItems.every((item) => item.visibilityState === 'visible' && item.aaPass),
    aaPlusPass:
      consideredItems.length > 0 &&
      consideredItems.every((item) => item.visibilityState === 'visible' && item.releasePass),
    aaaPass:
      consideredItems.length > 0 && consideredItems.every((item) => item.visibilityState === 'visible' && item.aaaPass),
  };
}
