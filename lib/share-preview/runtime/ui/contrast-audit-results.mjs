import { contrastRatio } from '../smart-colors-core.mjs';
import { GROUP_LABELS, getThresholds } from './contrast-audit-definitions.mjs';
import { getNormalizedPartColor } from './contrast-audit-svg.mjs';

function resolveVisibilityState(definition, displayOptions, parts) {
  if (definition.toggleKey && displayOptions?.[definition.toggleKey] === false) {
    return 'hidden-by-toggle';
  }

  return parts.has(definition.part) ? 'visible' : 'missing';
}

function resolveBackgroundColor(definition, parts) {
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

export function buildAuditResult(definition, displayOptions, parts) {
  const visibilityState = resolveVisibilityState(definition, displayOptions, parts);
  const thresholds = getThresholds(definition.profile);
  const foreground = getNormalizedPartColor(parts, definition.part);
  const background = resolveBackgroundColor(definition, parts);
  const ratio =
    visibilityState === 'visible' && foreground && background && background !== 'transparent'
      ? contrastRatio(foreground, background)
      : null;

  return {
    target: definition.target,
    group: definition.group,
    label: definition.label,
    ratio,
    foreground,
    background,
    thresholds,
    standardLabel: definition.standardLabel,
    aaPass: ratio != null && ratio >= thresholds.aa,
    aaPlusPass: ratio != null && ratio >= thresholds.aaPlus,
    aaaPass: ratio != null && ratio >= thresholds.aaa,
    visibilityState,
  };
}

export function summarizeGroup(group, items) {
  const consideredItems = items.filter((item) => item.visibilityState !== 'hidden-by-toggle');
  const visibleItems = consideredItems.filter((item) => item.visibilityState === 'visible');
  const passingItems = visibleItems.filter((item) => item.aaPlusPass);
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
  const statusIcon =
    statusLevel === 'complete'
      ? 'ready'
      : statusLevel === 'partial'
        ? 'warning'
        : statusLevel === 'fail'
          ? 'error'
          : 'warning';

  return {
    group,
    label: GROUP_LABELS[group],
    items,
    consideredCount: consideredItems.length,
    passCount: passingItems.length,
    failingCount: consideredItems.filter((item) => item.visibilityState === 'missing' || !item.aaPlusPass).length,
    worstTarget: worstItem?.target || null,
    worstItemLabel: worstItem?.label || '',
    worstRatio: worstVisibleItem?.ratio ?? null,
    statusLevel,
    statusIcon,
    aaPass:
      consideredItems.length > 0 && consideredItems.every((item) => item.visibilityState === 'visible' && item.aaPass),
    aaPlusPass:
      consideredItems.length > 0 &&
      consideredItems.every((item) => item.visibilityState === 'visible' && item.aaPlusPass),
    aaaPass:
      consideredItems.length > 0 && consideredItems.every((item) => item.visibilityState === 'visible' && item.aaaPass),
  };
}
