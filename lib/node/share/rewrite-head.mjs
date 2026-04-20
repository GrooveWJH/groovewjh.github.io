import { buildAttrMatcher } from "./html-meta.mjs";
import { escapeHtml, normalizeHeadWhitespace } from "./text.mjs";

function renderManagedHeadTags(payload) {
  const lines = [];

  if (payload.canonicalUrl) {
    lines.push(`<link rel="canonical" href="${escapeHtml(payload.canonicalUrl)}">`);
  }

  if (payload.description) {
    lines.push(`<meta name="description" content="${escapeHtml(payload.description)}">`);
  }

  lines.push(`<meta property="og:title" content="${escapeHtml(payload.ogTitle)}">`);
  lines.push(`<meta property="og:type" content="${escapeHtml(payload.ogType)}">`);

  if (payload.description) {
    lines.push(`<meta property="og:description" content="${escapeHtml(payload.description)}">`);
  }
  if (payload.ogUrl) {
    lines.push(`<meta property="og:url" content="${escapeHtml(payload.ogUrl)}">`);
  }
  if (payload.ogImage) {
    lines.push(`<meta property="og:image" content="${escapeHtml(payload.ogImage)}">`);
  }
  if (payload.ogSiteName) {
    lines.push(`<meta property="og:site_name" content="${escapeHtml(payload.ogSiteName)}">`);
  }

  lines.push(`<meta name="twitter:card" content="${escapeHtml(payload.twitterCard)}">`);
  lines.push(`<meta name="twitter:title" content="${escapeHtml(payload.twitterTitle)}">`);

  if (payload.twitterDescription) {
    lines.push(`<meta name="twitter:description" content="${escapeHtml(payload.twitterDescription)}">`);
  }
  if (payload.twitterImage) {
    lines.push(`<meta name="twitter:image" content="${escapeHtml(payload.twitterImage)}">`);
  }

  if (payload.articleAuthor) {
    lines.push(`<meta property="article:author" content="${escapeHtml(payload.articleAuthor)}">`);
  }
  if (payload.articlePublishedTime) {
    lines.push(`<meta property="article:published_time" content="${escapeHtml(payload.articlePublishedTime)}">`);
  }

  return `    ${lines.join("\n    ")}`;
}

function stripManagedHeadTags(headHtml) {
  return normalizeHeadWhitespace(String(headHtml || "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(buildAttrMatcher("name", "description"), "")
    .replace(buildAttrMatcher("property", 'og:[^"]+'), "")
    .replace(buildAttrMatcher("name", 'twitter:[^"]+'), "")
    .replace(buildAttrMatcher("property", 'article:[^"]+'), ""));
}

export function rewriteHtmlShareHead(html, payload) {
  return String(html || "").replace(/<head>([\s\S]*?)<\/head>/i, (_whole, headInner) => {
    const cleanedHead = stripManagedHeadTags(headInner);
    const managedHeadTags = renderManagedHeadTags(payload);

    if (/<title>[\s\S]*?<\/title>/i.test(cleanedHead)) {
      const nextHead = cleanedHead.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n${managedHeadTags}`);
      return `<head>${normalizeHeadWhitespace(nextHead)}</head>`;
    }

    return `<head>\n${managedHeadTags}${normalizeHeadWhitespace(cleanedHead)}</head>`;
  });
}
