function getAuditStageRoot(stageNode) {
  return stageNode?.querySelector?.('[data-audit-stage-root]') || null;
}

export function clearAuditHoverState(stageNode) {
  const stageRoot = getAuditStageRoot(stageNode);
  if (!stageRoot) {
    return;
  }

  for (const node of stageRoot.querySelectorAll('.carbon-preview-stage-highlight.is-hovered')) {
    node.classList.remove('is-hovered');
  }
}

export function setAuditHoverState(stageNode, { group = null, target = null } = {}) {
  const stageRoot = getAuditStageRoot(stageNode);
  if (!stageRoot) {
    return;
  }

  clearAuditHoverState(stageNode);

  if (target) {
    for (const node of stageRoot.querySelectorAll(`[data-audit-highlight-target="${target}"]`)) {
      node.classList.add('is-hovered');
    }
    return;
  }

  if (!group) {
    return;
  }

  for (const node of stageRoot.querySelectorAll(`[data-audit-highlight-group="${group}"]`)) {
    node.classList.add('is-hovered');
  }
}

export function resolveAuditHoverSelection(target) {
  const control = target?.closest?.('[data-audit-hover-group], [data-audit-hover-target]');
  if (!control) {
    return null;
  }

  return {
    group: control.dataset.auditHoverGroup || null,
    target: control.dataset.auditHoverTarget || null,
  };
}

export function shouldShowAuditFocusHighlight(target) {
  const control = target?.closest?.('[data-audit-hover-group], [data-audit-hover-target]');
  return Boolean(control && typeof control.matches === 'function' && control.matches(':focus-visible'));
}
