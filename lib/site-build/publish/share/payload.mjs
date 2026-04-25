import { toAbsoluteUrl, toPublicUrl } from '../../../foundation/public-path.mjs';
import { extractArticleSummary } from './summary.mjs';
import { collapseWhitespace } from './text.mjs';

export { toAbsoluteUrl, toPublicUrl };

export function buildShareTitle(title, siteName) {
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
    normalizedTitle === normalizedSiteName ||
    normalizedTitle === suffixedTitle ||
    normalizedTitle.endsWith(` · ${normalizedSiteName}`)
  ) {
    return normalizedTitle;
  }

  return suffixedTitle;
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
  const fallbackDescription = pageKind === 'article' && !explicitDescription ? extractArticleSummary(articleHtml) : '';
  const normalizedDescription = explicitDescription || fallbackDescription || null;
  const canonicalUrl = toAbsoluteUrl(activeOrigin, pageUrl);
  const imageUrl = toAbsoluteUrl(activeOrigin, imagePath);

  return {
    title: normalizedTitle,
    description: normalizedDescription,
    canonicalUrl,
    ogTitle: shareTitle,
    ogType: pageKind === 'article' ? 'article' : 'website',
    ogUrl: canonicalUrl,
    ogImage: imageUrl,
    ogSiteName: collapseWhitespace(siteName) || null,
    twitterCard: imageUrl ? 'summary_large_image' : 'summary',
    twitterTitle: shareTitle,
    twitterDescription: normalizedDescription,
    twitterImage: imageUrl,
    articleAuthor: pageKind === 'article' && author ? collapseWhitespace(author) : null,
    articlePublishedTime: pageKind === 'article' && date ? collapseWhitespace(date) : null,
  };
}
