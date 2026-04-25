export function formatDurationMs(durationMs) {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

export async function runTimedStep(label, operation) {
  const startedAt = Date.now();
  const result = await operation();
  return {
    label,
    result,
    durationMs: Date.now() - startedAt,
  };
}

export function runTimedStepSync(label, operation) {
  const startedAt = Date.now();
  const result = operation();
  return {
    label,
    result,
    durationMs: Date.now() - startedAt,
  };
}

export function logPhase(label, durationMs, extra = '') {
  const suffix = extra ? ` ${extra}` : '';
  console.log(`[${label}] ${formatDurationMs(durationMs)}${suffix}`);
}
