import { collapseWhitespace, decodeHtmlEntities, stripHtml } from './text.mjs';

export function buildAttrMatcher(prefix, key) {
  return new RegExp(`<meta\\s+${prefix}="${key}"[^>]*>\\s*`, 'gi');
}

export function getHeadInnerHtml(html) {
  const match = String(html || '').match(/<head>([\s\S]*?)<\/head>/i);
  return match ? match[1] : '';
}

export function extractMetaContent(headHtml, type, key) {
  const regex = new RegExp(`<meta\\s+${type}="${key}"\\s+content="([^"]*)"[^>]*>`, 'i');
  return collapseWhitespace(regex.exec(headHtml)?.[1] || '');
}

export function extractRawMetaContent(headHtml, type, key) {
  const regex = new RegExp(`<meta\\s+${type}="${key}"\\s+content="([^"]*)"[^>]*>`, 'i');
  return decodeHtmlEntities(regex.exec(headHtml)?.[1] || '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

export function extractTitle(html) {
  return collapseWhitespace(String(html || '').match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
}

export function extractCanonicalUrl(headHtml) {
  return collapseWhitespace(String(headHtml || '').match(/<link\s+rel="canonical"\s+href="([^"]*)"[^>]*>/i)?.[1] || '');
}

export function extractSiteName(html, siteInputs = {}) {
  const bodySiteTitle = String(html || '').match(/<div class="nav-body-upper-title">([\s\S]*?)<\/div>/i)?.[1];
  const linkSiteTitle = String(html || '').match(/<a class="nav-title-link" [^>]*>([\s\S]*?)<\/a>/i)?.[1];
  return collapseWhitespace(stripHtml(bodySiteTitle || linkSiteTitle || siteInputs.siteTitle || ''));
}

export function extractCoverImagePathFromHtml(html) {
  const coverSrc = String(html || '').match(/<div class="post-cover">[\s\S]*?<img[^>]*src="([^"]+)"/i)?.[1] || '';
  if (!coverSrc || /^data:/i.test(coverSrc)) {
    return '';
  }

  return collapseWhitespace(coverSrc);
}
