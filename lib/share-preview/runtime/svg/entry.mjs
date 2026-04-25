import { collapseWhitespace, escapeXml, SVG_FONT_STACK } from './shared.mjs';

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

export function renderTextBlock({ attributes = '', lines, x, y, fontSize, lineHeight, fill, fontWeight = 400 }) {
  if (!lines.length) {
    return '';
  }

  const extraAttributes = collapseWhitespace(attributes);
  return `<text x="${x}" y="${y}" ${extraAttributes} fill="${fill}" font-family="${SVG_FONT_STACK}" font-size="${fontSize}" font-weight="${fontWeight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}
