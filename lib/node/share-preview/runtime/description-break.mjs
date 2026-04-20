import { measureTextWidth } from "./svg-utils.mjs";

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateLineToWidth(text, maxWidth, textOptions) {
  const normalized = String(text || "");
  if (!normalized) {
    return "";
  }

  if (measureTextWidth(normalized, textOptions) <= maxWidth) {
    return normalized;
  }

  let fitted = normalized.replace(/[.…]+$/u, "");
  while (fitted && measureTextWidth(`${fitted}…`, textOptions) > maxWidth) {
    fitted = Array.from(fitted).slice(0, -1).join("");
  }

  return fitted ? `${fitted}…` : "…";
}

function resolveDefaultBreakStartIndex(chars, maxWidth, textOptions) {
  let current = "";

  for (let index = 0; index < chars.length; index += 1) {
    const candidate = `${current}${chars[index]}`;
    if (current && measureTextWidth(candidate, textOptions) > maxWidth) {
      return index;
    }
    current = candidate;
  }

  return null;
}

export function resolveDescriptionBreakState(text, {
  maxWidth,
  fontSize = 16,
  fontWeight = 400,
  breakStartIndex = null,
} = {}) {
  const normalized = collapseWhitespace(text);
  const chars = Array.from(normalized);
  const width = Number(maxWidth || 0);
  const textOptions = {
    fontSize: Number(fontSize || 16),
    fontWeight: Number(fontWeight || 400),
  };

  if (!normalized || width <= 0) {
    return {
      lines: [],
      defaultBreakStartIndex: null,
      effectiveBreakStartIndex: null,
      maxBreakStartIndex: null,
    };
  }

  const maxBreakStartIndex = chars.length > 1 ? chars.length - 1 : null;
  const defaultBreakStartIndex = resolveDefaultBreakStartIndex(chars, width, textOptions);
  const requestedBreakStartIndex = breakStartIndex == null
    ? defaultBreakStartIndex
    : Math.min(Math.max(Number.parseInt(breakStartIndex, 10) || 1, 1), maxBreakStartIndex || 1);

  if (requestedBreakStartIndex == null) {
    return {
      lines: [truncateLineToWidth(normalized, width, textOptions)],
      defaultBreakStartIndex: null,
      effectiveBreakStartIndex: null,
      maxBreakStartIndex,
    };
  }

  return {
    lines: [
      chars.slice(0, requestedBreakStartIndex).join(""),
      truncateLineToWidth(chars.slice(requestedBreakStartIndex).join(""), width, textOptions),
    ].filter(Boolean),
    defaultBreakStartIndex,
    effectiveBreakStartIndex: requestedBreakStartIndex,
    maxBreakStartIndex,
  };
}
