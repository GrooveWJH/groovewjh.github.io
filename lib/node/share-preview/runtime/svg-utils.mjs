export const SVG_FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Helvetica Neue', sans-serif";

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

function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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

function fitLineToWidth(line, maxWidth, textOptions) {
  const ellipsis = '…';
  let fitted = String(line || '').replace(/[.…]+$/u, '');

  while (fitted && measureTextWidth(`${fitted}${ellipsis}`, textOptions) > maxWidth) {
    fitted = Array.from(fitted).slice(0, -1).join('');
  }

  return fitted ? `${fitted}${ellipsis}` : ellipsis;
}

export function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function getDomainLabel(entry) {
  const canonicalUrl = collapseWhitespace(entry?.canonicalUrl);
  if (canonicalUrl) {
    try {
      return new URL(canonicalUrl).host.replace(/^www\./i, '');
    } catch {
      return collapseWhitespace(entry?.siteName);
    }
  }

  return collapseWhitespace(entry?.siteName);
}

export function getImageHref(entry, override) {
  return collapseWhitespace(override || entry?.imagePath || entry?.imageUrl || '');
}

export function getDisplayTitle(entry) {
  return collapseWhitespace(entry?.shareTitle || entry?.sourceTitle || '');
}

export function splitDisplayTitle(entry) {
  const siteName = collapseWhitespace(entry?.siteName || '');
  const rawTitle = getDisplayTitle(entry);

  if (siteName) {
    const suffixPattern = new RegExp(`\\s*·\\s*${siteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    if (suffixPattern.test(rawTitle)) {
      return {
        title: collapseWhitespace(rawTitle.replace(suffixPattern, '')),
        siteName,
      };
    }
  }

  const genericMatch = rawTitle.match(/^(.*?)(?:\s*·\s*)([^·]+)$/);
  if (genericMatch) {
    return {
      title: collapseWhitespace(genericMatch[1]),
      siteName: collapseWhitespace(siteName || genericMatch[2]),
    };
  }

  return {
    title: rawTitle,
    siteName,
  };
}

export function wrapTextByWidth(text, { maxWidth, maxLines, fontSize, fontWeight = 400 } = {}) {
  const normalized = collapseWhitespace(text);
  const width = Number(maxWidth || 0);
  const limit = Number(maxLines || 1);
  const textOptions = {
    fontSize: Number(fontSize || 16),
    fontWeight: Number(fontWeight || 400),
  };

  if (!normalized || width <= 0 || limit <= 0) {
    return [];
  }

  const chars = Array.from(normalized);
  const lines = [];
  let current = '';
  let consumed = 0;

  for (const char of chars) {
    const candidate = `${current}${char}`;
    if (current && measureTextWidth(candidate, textOptions) > width) {
      lines.push(current);
      current = char.trimStart();
      if (lines.length >= limit) {
        break;
      }
    } else {
      current = candidate;
    }
    consumed += 1;
  }

  if (lines.length < limit && current) {
    lines.push(current);
  }

  const hasOverflow = consumed < chars.length || (current && measureTextWidth(current, textOptions) > width);
  if (hasOverflow && lines.length === limit) {
    lines[limit - 1] = fitLineToWidth(lines[limit - 1], width, textOptions);
  }

  return lines.slice(0, limit);
}

export function renderTextBlock({ attributes = '', lines, x, y, fontSize, lineHeight, fill, fontWeight = 400 }) {
  if (!lines.length) {
    return '';
  }

  const extraAttributes = collapseWhitespace(attributes);
  return `<text x="${x}" y="${y}" ${extraAttributes} fill="${fill}" font-family="${SVG_FONT_STACK}" font-size="${fontSize}" font-weight="${fontWeight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}
