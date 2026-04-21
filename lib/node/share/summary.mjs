import { collapseWhitespace, stripHtml, truncateSummary } from './text.mjs';

export function extractArticleSummary(html) {
  const articleHtml = String(html || '').match(/<article\b[\s\S]*?<\/article>/i)?.[0] || '';
  if (!articleHtml) {
    return '';
  }

  const cleanedArticleHtml = articleHtml
    .replace(/<div[^>]*class="[^"]*post-cover[^"]*"[\s\S]*?<\/div>/gi, ' ')
    .replace(/<div[^>]*class="[^"]*post-meta[^"]*"[\s\S]*?<\/div>/gi, ' ');

  const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match = paragraphRegex.exec(cleanedArticleHtml);
  while (match) {
    const summary = truncateSummary(collapseWhitespace(stripHtml(match[1])));
    if (summary) {
      return summary;
    }
    match = paragraphRegex.exec(cleanedArticleHtml);
  }

  return '';
}
