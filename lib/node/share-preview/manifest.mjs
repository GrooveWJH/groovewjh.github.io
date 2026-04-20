import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ROOT_DIR } from "../build/constants.mjs";
import { normalizePosixPath, walkFiles } from "../build/helpers.mjs";
import {
  DEFAULT_SHARE_IMAGE_PATH,
  collapseWhitespace,
  extractCanonicalUrl,
  extractCoverImagePathFromHtml,
  extractMetaContent,
  extractTitle,
  getHeadInnerHtml,
  toAbsoluteUrl,
} from "../share/index.mjs";
import { PLATFORM_ORDER, buildPlatformDescriptors } from "./runtime/platforms.mjs";
import { resolvePreviewImageSize } from "./image-size.mjs";

const PREVIEW_QR_SITE_URL = readPreviewQrSiteUrl();

function readPreviewQrSiteUrl() {
  try {
    const parsed = JSON.parse(readFileSync(join(ROOT_DIR, "site.config.json"), "utf8"));
    const siteUrl = collapseWhitespace(parsed?.siteUrl || "").replace(/\/+$/, "");
    return siteUrl || null;
  } catch {
    return null;
  }
}

function normalizePagePathFromOutputRel(outputRel) {
  if (outputRel === "index.html") {
    return "/";
  }

  const normalized = normalizePosixPath(outputRel).replace(/\/index\.html$/i, "");
  return `/${normalized}/`;
}

function normalizePageId(pagePath) {
  const trimmed = String(pagePath || "").replace(/^\/+|\/+$/g, "");
  return trimmed ? trimmed.replace(/[/.]+/g, "-") : "home";
}

function pathFromImageUrl(imageUrl) {
  const normalized = collapseWhitespace(imageUrl);
  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      return new URL(normalized).pathname || "";
    } catch {
      return "";
    }
  }

  return normalized.startsWith("/") ? normalized : "";
}

function comparePages(a, b) {
  if (a.pageKind !== b.pageKind) {
    return a.pageKind === "article" ? -1 : 1;
  }

  if (a.pageKind === "article" && a.publishedTime && b.publishedTime && a.publishedTime !== b.publishedTime) {
    return b.publishedTime.localeCompare(a.publishedTime);
  }

  if (a.pagePath === "/" && b.pagePath !== "/") {
    return -1;
  }

  if (b.pagePath === "/" && a.pagePath !== "/") {
    return 1;
  }

  return a.pagePath.localeCompare(b.pagePath);
}

function shouldIncludeOutputRel(outputRel) {
  return outputRel.endsWith(".html") && outputRel.startsWith("posts/articles/");
}

export function buildSharePreviewEntry({ outputRel, html, outputSiteDir = null }) {
  const headHtml = getHeadInnerHtml(html);
  const pagePath = normalizePagePathFromOutputRel(outputRel);
  const sourceTitle = extractTitle(html);
  const shareTitle = extractMetaContent(headHtml, "property", "og:title") || sourceTitle;
  const description = extractMetaContent(headHtml, "name", "description")
    || extractMetaContent(headHtml, "property", "og:description")
    || null;
  const imageUrl = extractMetaContent(headHtml, "property", "og:image")
    || extractMetaContent(headHtml, "name", "twitter:image")
    || "";
  const imagePath = pathFromImageUrl(imageUrl)
    || extractCoverImagePathFromHtml(html)
    || DEFAULT_SHARE_IMAGE_PATH;
  const imageSize = outputSiteDir ? resolvePreviewImageSize(outputSiteDir, imagePath) : null;
  const extractedCanonicalUrl = extractCanonicalUrl(headHtml) || "";
  const siteName = extractMetaContent(headHtml, "property", "og:site_name") || "";
  const pageKind = extractMetaContent(headHtml, "property", "og:type") === "article" ? "article" : "page";
  const publishedTime = pageKind === "article"
    ? (extractMetaContent(headHtml, "property", "article:published_time") || null)
    : null;
  const canonicalUrl = toAbsoluteUrl(PREVIEW_QR_SITE_URL, pagePath) || extractedCanonicalUrl;
  const qrUrl = toAbsoluteUrl(PREVIEW_QR_SITE_URL, pagePath);
  const entry = {
    id: normalizePageId(pagePath),
    pageKind,
    pagePath,
    sourceTitle,
    shareTitle,
    description,
    imagePath,
    imageUrl: imageUrl || null,
    imageWidth: imageSize?.width || null,
    imageHeight: imageSize?.height || null,
    canonicalUrl: canonicalUrl || null,
    siteName: siteName || null,
    publishedTime,
    qrUrl,
  };

  return {
    ...entry,
    platforms: buildPlatformDescriptors({
      description,
      imageUrl: entry.imageUrl,
      imagePath,
      qrUrl,
    }),
  };
}

export function collectSharePreviewManifestSync(outputSiteDir) {
  const htmlFiles = walkFiles(outputSiteDir, (filePath) => filePath.endsWith(".html"));
  const pages = htmlFiles
    .map((filePath) => normalizePosixPath(relative(outputSiteDir, filePath)))
    .filter(shouldIncludeOutputRel)
    .map((outputRel) => buildSharePreviewEntry({
      outputRel,
      html: readFileSync(join(outputSiteDir, outputRel), "utf8"),
      outputSiteDir,
    }));
  pages.sort(comparePages);

  return {
    generatedAt: new Date().toISOString(),
    platforms: PLATFORM_ORDER,
    pages,
  };
}
