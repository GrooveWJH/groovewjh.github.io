import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { safeRead, upsertStatus } from "./helpers.mjs";

export const DEFAULT_SHARE_IMAGE_PATH = "/assets/og-default.png";
const SUMMARY_MAX_LENGTH = 160;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)));
}

function stripHtml(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function truncateSummary(value, maxLength = SUMMARY_MAX_LENGTH) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function normalizeHeadWhitespace(value) {
  return value
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n");
}

function buildAttrMatcher(prefix, key) {
  return new RegExp(`<meta\\s+${prefix}="${key}"[^>]*>\\s*`, "gi");
}

function getHeadInnerHtml(html) {
  const match = html.match(/<head>([\s\S]*?)<\/head>/i);
  return match ? match[1] : "";
}

function extractMetaContent(headHtml, type, key) {
  const regex = new RegExp(`<meta\\s+${type}="${key}"\\s+content="([^"]*)"[^>]*>`, "i");
  return regex.exec(headHtml)?.[1] || null;
}

function extractTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
}

function extractSiteName(html, siteInputs = {}) {
  const bodySiteTitle = html.match(/<div class="nav-body-upper-title">([\s\S]*?)<\/div>/i)?.[1];
  const linkSiteTitle = html.match(/<a class="nav-title-link" [^>]*>([\s\S]*?)<\/a>/i)?.[1];
  return collapseWhitespace(stripHtml(bodySiteTitle || linkSiteTitle || siteInputs.siteTitle || ""));
}

function extractCoverImagePathFromHtml(html) {
  const coverSrc = html.match(/<div class="post-cover">[\s\S]*?<img[^>]*src="([^"]+)"/i)?.[1] || "";
  if (!coverSrc || /^data:/i.test(coverSrc)) {
    return "";
  }

  return coverSrc;
}

function toAbsoluteUrl(siteUrl, path) {
  if (!siteUrl || !path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const cleanBase = String(siteUrl).replace(/\/+$/, "");
  const cleanPath = String(path).startsWith("/") ? String(path) : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

function toPublicUrl(pagePath) {
  const normalized = String(pagePath || "").replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}/` : "/";
}

function buildShareTitle(title, siteName) {
  const normalizedTitle = collapseWhitespace(title);
  const normalizedSiteName = collapseWhitespace(siteName);

  if (!normalizedTitle) {
    return normalizedSiteName;
  }

  if (!normalizedSiteName) {
    return normalizedTitle;
  }

  const suffixedTitle = `｢${normalizedTitle}｣ · ${normalizedSiteName}`;
  if (
    normalizedTitle === normalizedSiteName
    || normalizedTitle === suffixedTitle
    || normalizedTitle.endsWith(` · ${normalizedSiteName}`)
  ) {
    return normalizedTitle;
  }

  return suffixedTitle;
}

export function extractArticleSummary(html) {
  const articleHtml = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] || "";
  if (!articleHtml) {
    return "";
  }

  const cleanedArticleHtml = articleHtml
    .replace(/<div[^>]*class="[^"]*post-cover[^"]*"[\s\S]*?<\/div>/gi, " ")
    .replace(/<div[^>]*class="[^"]*post-meta[^"]*"[\s\S]*?<\/div>/gi, " ");

  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match = paragraphRegex.exec(cleanedArticleHtml);
  while (match) {
    const summary = truncateSummary(collapseWhitespace(stripHtml(match[1])));
    if (summary) {
      return summary;
    }
    match = paragraphRegex.exec(cleanedArticleHtml);
  }

  return "";
}

export function buildSharePayload({
  pageKind,
  title,
  description,
  pageUrl,
  activeOrigin,
  siteName,
  author,
  date,
  imagePath,
  articleHtml,
}) {
  const normalizedTitle = collapseWhitespace(title);
  const shareTitle = buildShareTitle(normalizedTitle, siteName);
  const explicitDescription = collapseWhitespace(description);
  const fallbackDescription = pageKind === "article" && !explicitDescription
    ? extractArticleSummary(articleHtml)
    : "";
  const normalizedDescription = explicitDescription || fallbackDescription || null;
  const canonicalUrl = toAbsoluteUrl(activeOrigin, pageUrl);
  const imageUrl = toAbsoluteUrl(activeOrigin, imagePath);

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    canonicalUrl,
    ogTitle: shareTitle,
    ogType: pageKind === "article" ? "article" : "website",
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    ogSiteName: collapseWhitespace(siteName) || null,
    twitterCard: imageUrl ? "summary_large_image" : "summary",
    twitterTitle: shareTitle,
    twitterDescription: normalizedDescription,
    twitterImage: imageUrl,
    articleAuthor: pageKind === "article" && author ? collapseWhitespace(author) : null,
    articlePublishedTime: pageKind === "article" && date ? collapseWhitespace(date) : null,
  };
}

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
  return normalizeHeadWhitespace(headHtml
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, "")
    .replace(buildAttrMatcher("name", "description"), "")
    .replace(buildAttrMatcher("property", 'og:[^"]+'), "")
    .replace(buildAttrMatcher("name", 'twitter:[^"]+'), "")
    .replace(buildAttrMatcher("property", 'article:[^"]+'), ""));
}

export function rewriteHtmlShareHead(html, payload) {
  return html.replace(/<head>([\s\S]*?)<\/head>/i, (_whole, headInner) => {
    const cleanedHead = stripManagedHeadTags(headInner);
    const managedHeadTags = renderManagedHeadTags(payload);

    if (/<title>[\s\S]*?<\/title>/i.test(cleanedHead)) {
      const nextHead = cleanedHead.replace(/(<title>[\s\S]*?<\/title>)/i, `$1\n${managedHeadTags}`);
      return `<head>${normalizeHeadWhitespace(nextHead)}</head>`;
    }

    return `<head>\n${managedHeadTags}${normalizeHeadWhitespace(cleanedHead)}</head>`;
  });
}

export function normalizeShareMetadataForSite({
  stagingSiteDir,
  compileTasks,
  posts,
  siteInputs,
  statusMap,
}) {
  const postsByOutputRel = new Map(
    posts.map((post) => [`posts/${post.slug}/index.html`, post]),
  );

  for (const task of compileTasks) {
    const htmlPath = join(stagingSiteDir, task.outputRel);
    const html = safeRead(htmlPath);
    if (!html) {
      continue;
    }

    const headHtml = getHeadInnerHtml(html);
    const title = extractTitle(html);
    const isArticleLike = task.kind === "post" || /<article class="post-article\b/i.test(html);
    const pageKind = isArticleLike ? "article" : "page";
    const post = pageKind === "article" ? postsByOutputRel.get(task.outputRel) || null : null;
    const siteName = extractSiteName(html, siteInputs);
    const author = extractMetaContent(headHtml, "name", "author") || siteInputs.author || null;
    const pageUrl = pageKind === "article" && post
      ? post.url
      : toPublicUrl(task.pagePath);
    const description = pageKind === "article"
      ? (post?.description || "")
      : (extractMetaContent(headHtml, "name", "description") || "");
    const imagePath = pageKind === "article"
      ? (post?.resolvedCoverPath || extractCoverImagePathFromHtml(html) || DEFAULT_SHARE_IMAGE_PATH)
      : DEFAULT_SHARE_IMAGE_PATH;

    const payload = buildSharePayload({
      pageKind,
      title,
      description,
      pageUrl,
      activeOrigin: siteInputs.activeSiteUrl,
      siteName,
      author,
      date: pageKind === "article" ? (post?.date || extractMetaContent(headHtml, "name", "date")) : null,
      imagePath,
      articleHtml: pageKind === "article" ? html : "",
    });

    const rewrittenHtml = rewriteHtmlShareHead(html, payload);
    if (rewrittenHtml !== html) {
      writeFileSync(htmlPath, rewrittenHtml, "utf8");
      upsertStatus(statusMap, task.outputRel, "updated");
    }
  }
}
