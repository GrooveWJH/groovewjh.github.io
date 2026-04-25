import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { safeRead } from '../../../foundation/fs.mjs';
import { upsertStatus } from '../../pipeline/output.mjs';
import { DEFAULT_SHARE_IMAGE_PATH } from './constants.mjs';
import {
  extractCoverImagePathFromHtml,
  extractMetaContent,
  extractSiteName,
  extractTitle,
  getHeadInnerHtml,
} from './html-meta.mjs';
import { buildSharePayload, toPublicUrl } from './payload.mjs';
import { rewriteHtmlShareHead } from './rewrite-head.mjs';

export function normalizeShareMetadataForSite({ stagingSiteDir, compileTasks, posts, siteInputs, statusMap }) {
  const postsByOutputRel = new Map(posts.map((post) => [`posts/${post.slug}/index.html`, post]));

  for (const task of compileTasks) {
    const htmlPath = join(stagingSiteDir, task.outputRel);
    const html = safeRead(htmlPath);
    if (!html) {
      continue;
    }

    const headHtml = getHeadInnerHtml(html);
    const title = extractTitle(html);
    const isArticleLike = task.kind === 'post' || /<article class="post-article\b/i.test(html);
    const pageKind = isArticleLike ? 'article' : 'page';
    const post = pageKind === 'article' ? postsByOutputRel.get(task.outputRel) || null : null;
    const siteName = extractSiteName(html, siteInputs);
    const author = extractMetaContent(headHtml, 'name', 'author') || siteInputs.author || null;
    const pageUrl = pageKind === 'article' && post ? post.url : toPublicUrl(task.pagePath);
    const description =
      pageKind === 'article' ? post?.description || '' : extractMetaContent(headHtml, 'name', 'description') || '';
    const imagePath =
      pageKind === 'article'
        ? post?.resolvedPublicCoverPath ||
          post?.resolvedCoverPath ||
          extractCoverImagePathFromHtml(html) ||
          DEFAULT_SHARE_IMAGE_PATH
        : DEFAULT_SHARE_IMAGE_PATH;

    const payload = buildSharePayload({
      pageKind,
      title,
      description,
      pageUrl,
      activeOrigin: siteInputs.activeSiteUrl,
      siteName,
      author,
      date: pageKind === 'article' ? post?.date || extractMetaContent(headHtml, 'name', 'date') : null,
      imagePath,
      articleHtml: pageKind === 'article' ? html : '',
    });

    const rewrittenHtml = rewriteHtmlShareHead(html, payload);
    if (rewrittenHtml !== html) {
      writeFileSync(htmlPath, rewrittenHtml, 'utf8');
      upsertStatus(statusMap, task.outputRel, 'updated');
    }
  }
}
