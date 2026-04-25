import { collapseWhitespace } from './shared.mjs';
import { measureTextWidth } from './text-metrics.mjs';

function fitLineToWidth(line, maxWidth, textOptions) {
  const ellipsis = '…';
  let fitted = String(line || '').replace(/[.…]+$/u, '');

  while (fitted && measureTextWidth(`${fitted}${ellipsis}`, textOptions) > maxWidth) {
    fitted = Array.from(fitted).slice(0, -1).join('');
  }

  return fitted ? `${fitted}${ellipsis}` : ellipsis;
}

function wrapNormalizedTextByWidth(
  normalized,
  { maxWidth, maxLines = Number.POSITIVE_INFINITY, fontSize, fontWeight = 400 } = {},
) {
  const width = Number(maxWidth || 0);
  const limit = Number.isFinite(Number(maxLines))
    ? Math.max(0, Math.floor(Number(maxLines)))
    : Number.POSITIVE_INFINITY;
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
  if (hasOverflow && Number.isFinite(limit) && lines.length === limit) {
    lines[limit - 1] = fitLineToWidth(lines[limit - 1], width, textOptions);
  }

  return lines.slice(0, limit);
}

export function wrapTextByWidth(text, { maxWidth, maxLines, fontSize, fontWeight = 400 } = {}) {
  return wrapNormalizedTextByWidth(collapseWhitespace(text), {
    maxWidth,
    maxLines: Number(maxLines || 1),
    fontSize,
    fontWeight,
  });
}

export function wrapTextPreservingLineBreaks(
  text,
  { maxWidth, maxLines = Number.POSITIVE_INFINITY, fontSize, fontWeight = 400 } = {},
) {
  const raw = String(text || '').replace(/\r\n?/g, '\n');
  const limit = Number.isFinite(Number(maxLines))
    ? Math.max(0, Math.floor(Number(maxLines)))
    : Number.POSITIVE_INFINITY;

  if (!raw || limit <= 0) {
    return [];
  }

  const segments = raw.split('\n');
  const lines = [];

  for (let index = 0; index < segments.length; index += 1) {
    if (lines.length >= limit) {
      break;
    }

    const segment = collapseWhitespace(segments[index]);
    if (!segment) {
      lines.push('');
      continue;
    }

    const remaining = Number.isFinite(limit) ? limit - lines.length : Number.POSITIVE_INFINITY;
    lines.push(
      ...wrapNormalizedTextByWidth(segment, {
        maxWidth,
        maxLines: remaining,
        fontSize,
        fontWeight,
      }),
    );
  }

  return Number.isFinite(limit) ? lines.slice(0, limit) : lines;
}

export function wrapTextByLineWidths(text, { lineWidths = [], maxLines, fontSize, fontWeight = 400 } = {}) {
  const normalized = collapseWhitespace(text);
  const widths = Array.isArray(lineWidths) ? lineWidths.map((width) => Number(width || 0)) : [];
  const limit = Number(maxLines || widths.length || 1);
  const textOptions = {
    fontSize: Number(fontSize || 16),
    fontWeight: Number(fontWeight || 400),
  };

  if (!normalized || !widths.length || limit <= 0 || widths.every((width) => width <= 0)) {
    return [];
  }

  const chars = Array.from(normalized);
  const lines = [];
  let current = '';
  let consumed = 0;

  for (const char of chars) {
    const lineIndex = Math.min(lines.length, widths.length - 1);
    const width = widths[lineIndex];
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

  const lastLineIndex = Math.min(Math.max(lines.length - 1, 0), widths.length - 1);
  const hasOverflow =
    consumed < chars.length || (current && measureTextWidth(current, textOptions) > widths[lastLineIndex]);
  if (hasOverflow && lines.length === limit) {
    lines[limit - 1] = fitLineToWidth(lines[limit - 1], widths[lastLineIndex], textOptions);
  }

  return lines.slice(0, limit);
}
