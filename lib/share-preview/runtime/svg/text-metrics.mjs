import { SVG_FONT_STACK } from './shared.mjs';

let measureContext = null;

function getMeasureContext() {
  if (measureContext) {
    return measureContext;
  }

  if (typeof document === 'undefined' || !document.createElement) {
    return null;
  }

  measureContext = document.createElement('canvas').getContext('2d');
  return measureContext;
}

function isSingleByteCodePoint(char) {
  return (char.codePointAt(0) ?? Number.POSITIVE_INFINITY) <= 0xff;
}

function containsSingleByteCodePoint(text) {
  return Array.from(String(text || '')).some((char) => isSingleByteCodePoint(char));
}

function estimateTextWidth(text, { fontSize, fontWeight }) {
  const weightFactor = Number(fontWeight) >= 700 ? 1.08 : 1;
  let width = 0;

  for (const char of Array.from(String(text || ''))) {
    if (/\s/.test(char)) {
      width += fontSize * 0.34;
    } else if (isSingleByteCodePoint(char)) {
      width += fontSize * 0.64;
    } else {
      width += fontSize * 1.04;
    }
  }

  return width * weightFactor;
}

function estimateTextMetrics(text, { fontSize, fontWeight }) {
  const safeFontSize = Number(fontSize || 16);
  const hasSingleByteCodePoint = containsSingleByteCodePoint(text);

  return {
    width: estimateTextWidth(text, { fontSize: safeFontSize, fontWeight }),
    ascent: safeFontSize * (hasSingleByteCodePoint ? 0.74 : 0.82),
    descent: safeFontSize * (hasSingleByteCodePoint ? 0.22 : 0.18),
  };
}

export function measureTextWidth(text, { fontSize, fontWeight = 400 } = {}) {
  const context = getMeasureContext();
  const safeFontSize = Number(fontSize || 16);
  const safeFontWeight = Number(fontWeight || 400);

  if (!context) {
    return estimateTextWidth(text, {
      fontSize: safeFontSize,
      fontWeight: safeFontWeight,
    });
  }

  context.font = `${safeFontWeight} ${safeFontSize}px ${SVG_FONT_STACK}`;
  return context.measureText(String(text || '')).width;
}

export function measureTextMetrics(text, { fontSize, fontWeight = 400 } = {}) {
  const context = getMeasureContext();
  const safeFontSize = Number(fontSize || 16);
  const safeFontWeight = Number(fontWeight || 400);
  const fallback = estimateTextMetrics(text, {
    fontSize: safeFontSize,
    fontWeight: safeFontWeight,
  });

  if (!context) {
    return fallback;
  }

  context.font = `${safeFontWeight} ${safeFontSize}px ${SVG_FONT_STACK}`;
  const metrics = context.measureText(String(text || ''));
  return {
    width: metrics.width || fallback.width,
    ascent: metrics.actualBoundingBoxAscent || fallback.ascent,
    descent: metrics.actualBoundingBoxDescent || fallback.descent,
  };
}
