import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { normalizePosixPath, walkFiles } from '../../foundation/fs.mjs';
import { ROOT_DIR } from '../../foundation/paths.mjs';
import { normalizePublicUrl, toAbsoluteUrl, toPublicPath, toPublicUrl } from '../../foundation/public-path.mjs';
import {
  collapseWhitespace,
  DEFAULT_SHARE_IMAGE_PATH,
  extractCanonicalUrl,
  extractCoverImagePathFromHtml,
  extractMetaContent,
  extractTitle,
  getHeadInnerHtml,
} from '../../site-build/publish/share/index.mjs';
import { buildPlatformDescriptors, PLATFORM_ORDER } from '../runtime/platforms.mjs';
import { resolvePreviewImageSize } from './image-size.mjs';

const PREVIEW_QR_SITE_URL = readPreviewQrSiteUrl();

function readPreviewQrSiteUrl() {
  try {
    const parsed = JSON.parse(readFileSync(join(ROOT_DIR, 'site.config.json'), 'utf8'));
    const siteUrl = collapseWhitespace(parsed?.siteUrl || '').replace(/\/+$/, '');
    return siteUrl || null;
  } catch {
    return null;
  }
}

function normalizePagePathFromOutputRel(outputRel) {
  if (outputRel === 'index.html') {
    return '/';
  }

  const normalized = normalizePosixPath(outputRel).replace(/\/index\.html$/i, '');
  return `/${normalized}/`;
}

function normalizePageId(pagePath) {
  const trimmed = String(pagePath || '').replace(/^\/+|\/+$/g, '');
  return trimmed ? trimmed.replace(/[/.]+/g, '-') : 'home';
}

function pathFromImageUrl(imageUrl) {
  const normalized = normalizePublicUrl(collapseWhitespace(imageUrl));
  if (!normalized) {
    return '';
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      return new URL(normalized).pathname || '';
    } catch {
      return '';
    }
  }

  return normalized.startsWith('/') ? normalized : '';
}

function comparePages(a, b) {
  if (a.pageKind !== b.pageKind) {
    return a.pageKind === 'article' ? -1 : 1;
  }

  if (a.pageKind === 'article' && a.publishedTime && b.publishedTime && a.publishedTime !== b.publishedTime) {
    return b.publishedTime.localeCompare(a.publishedTime);
  }

  if (a.pagePath === '/' && b.pagePath !== '/') {
    return -1;
  }

  if (b.pagePath === '/' && a.pagePath !== '/') {
    return 1;
  }

  return a.pagePath.localeCompare(b.pagePath);
}

function shouldIncludeOutputRel(outputRel) {
  return outputRel.endsWith('.html') && outputRel.startsWith('posts/articles/');
}

function resolveArticleCoverFromMetadata(post, headHtml) {
  if (!post) {
    return {
      imagePath: '',
      imageUrl: '',
    };
  }

  const publicCoverPath = collapseWhitespace(post.resolvedPublicCoverPath || post.resolvedCoverPath || '');
  if (!publicCoverPath) {
    return {
      imagePath: '',
      imageUrl: '',
    };
  }

  const originSource =
    extractCanonicalUrl(headHtml) ||
    extractMetaContent(headHtml, 'property', 'og:url') ||
    extractMetaContent(headHtml, 'property', 'og:image') ||
    '';
  let origin = '';
  try {
    origin = originSource ? new URL(originSource).origin : '';
  } catch {}

  return {
    imagePath: toPublicPath(publicCoverPath),
    imageUrl: origin ? toAbsoluteUrl(origin, publicCoverPath) || '' : '',
  };
}

export function buildSharePreviewEntry({ outputRel, html, outputSiteDir = null, post = null }) {
  const headHtml = getHeadInnerHtml(html);
  const rawPagePath = normalizePagePathFromOutputRel(outputRel);
  const pagePath = post?.url ? collapseWhitespace(post.url) : toPublicUrl(rawPagePath);
  const sourceTitle = extractTitle(html);
  const shareTitle = extractMetaContent(headHtml, 'property', 'og:title') || sourceTitle;
  const description =
    extractMetaContent(headHtml, 'name', 'description') ||
    extractMetaContent(headHtml, 'property', 'og:description') ||
    collapseWhitespace(post?.description || '') ||
    null;
  const rawDescriptionText = String(post?.descriptionText || '').trim();
  const descriptionText = rawDescriptionText || description || null;
  const htmlImageUrl = normalizePublicUrl(
    extractMetaContent(headHtml, 'property', 'og:image') || extractMetaContent(headHtml, 'name', 'twitter:image') || '',
  );
  const metadataCover = resolveArticleCoverFromMetadata(post, headHtml);
  const imagePath = metadataCover.imagePath
    ? metadataCover.imagePath
    : toPublicPath(pathFromImageUrl(htmlImageUrl) || extractCoverImagePathFromHtml(html) || DEFAULT_SHARE_IMAGE_PATH);
  const imageUrl = metadataCover.imageUrl || htmlImageUrl || '';
  const imageSize = outputSiteDir ? resolvePreviewImageSize(outputSiteDir, imagePath) : null;
  const extractedCanonicalUrl = extractCanonicalUrl(headHtml) || '';
  const siteName = extractMetaContent(headHtml, 'property', 'og:site_name') || '';
  const pageKind = extractMetaContent(headHtml, 'property', 'og:type') === 'article' ? 'article' : 'page';
  const publishedTime =
    pageKind === 'article' ? extractMetaContent(headHtml, 'property', 'article:published_time') || null : null;
  const canonicalUrl = toAbsoluteUrl(PREVIEW_QR_SITE_URL, rawPagePath) || normalizePublicUrl(extractedCanonicalUrl);
  const qrUrl = toAbsoluteUrl(PREVIEW_QR_SITE_URL, rawPagePath);
  const entry = {
    id: normalizePageId(pagePath),
    pageKind,
    pagePath,
    rawPagePath,
    sourceTitle,
    shareTitle,
    description,
    descriptionText,
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
      description: descriptionText || description,
      imageUrl: entry.imageUrl,
      imagePath,
      qrUrl,
    }),
  };
}

export function collectSharePreviewManifestSync(outputSiteDir) {
  return collectSharePreviewManifestSyncWithOptions(outputSiteDir, {});
}

export function collectSharePreviewManifestSyncWithOptions(outputSiteDir, { posts = null } = {}) {
  const htmlFiles = walkFiles(outputSiteDir, (filePath) => filePath.endsWith('.html'));
  const postsByOutputRel = new Map(
    Array.isArray(posts)
      ? posts.map((post) => [`posts/${String(post.slug || '').replace(/^\/+|\/+$/g, '')}/index.html`, post])
      : [],
  );
  const pages = htmlFiles
    .map((filePath) => normalizePosixPath(relative(outputSiteDir, filePath)))
    .filter(shouldIncludeOutputRel)
    .map((outputRel) =>
      buildSharePreviewEntry({
        outputRel,
        html: readFileSync(join(outputSiteDir, outputRel), 'utf8'),
        outputSiteDir,
        post: postsByOutputRel.get(outputRel) || null,
      }),
    );
  pages.sort(comparePages);

  return {
    generatedAt: new Date().toISOString(),
    platforms: PLATFORM_ORDER,
    pages,
  };
}
