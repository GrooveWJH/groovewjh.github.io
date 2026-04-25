export function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeColor(value) {
  const normalized = collapseWhitespace(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'transparent') {
    return 'transparent';
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized
      .slice(1)
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  const rgbMatch = normalized.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (rgbMatch) {
    return `#${[rgbMatch[1], rgbMatch[2], rgbMatch[3]]
      .map((part) => Number(part).toString(16).padStart(2, '0'))
      .join('')}`;
  }

  return normalized;
}

function parseAttributes(source) {
  const attributes = Object.create(null);
  for (const match of String(source || '').matchAll(/([:\w-]+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

export function parseSvgParts(svgMarkup) {
  const parts = new Map();
  for (const match of String(svgMarkup || '').matchAll(/<([a-z]+)\b([^>]*\bdata-part="([^"]+)"[^>]*)>/gi)) {
    const [, tagName, rawAttributes, part] = match;
    parts.set(part, {
      tagName: tagName.toLowerCase(),
      attributes: parseAttributes(rawAttributes),
    });
  }
  return parts;
}

export function getNormalizedPartColor(parts, partName, attrName = 'fill') {
  return normalizeColor(parts.get(partName)?.attributes?.[attrName]);
}
