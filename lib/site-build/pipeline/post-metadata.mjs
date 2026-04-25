import { rmSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

import { ensureDirForFile, normalizePosixPath, safeRead } from '../../foundation/fs.mjs';
import { POSTS_DIR, ROOT_DIR } from '../../foundation/paths.mjs';
import { encodePublicPath, toPublicUrl } from '../../foundation/public-path.mjs';
import { runPool } from './pool.mjs';
import { createProgressBar } from './progress.mjs';
import { makeTypstCompileArgs, parseJsonFromMetadataHtml, runTypstCompile } from './typst.mjs';

const EXCLUDED_POST_ROOT_DIRS = new Set(['_hidden', '_drafts']);

export function derivePagePathFromIndexTyp(baseDir, typFilePath) {
  if (basename(typFilePath).toLowerCase() !== 'index.typ') {
    throw new Error(`Only index.typ is supported: ${normalizePosixPath(relative(baseDir, typFilePath))}`);
  }

  const rel = normalizePosixPath(relative(baseDir, typFilePath));
  return rel === 'index.typ' ? '' : normalizePosixPath(dirname(rel));
}

function isExcludedPostFile(filePath) {
  const rel = normalizePosixPath(relative(POSTS_DIR, filePath));
  const [rootSegment = ''] = rel.split('/');
  return EXCLUDED_POST_ROOT_DIRS.has(rootSegment);
}

export function filterPostSourceFiles(source) {
  return {
    typFiles: source.typFiles.filter((filePath) => !isExcludedPostFile(filePath)),
    assetFiles: source.assetFiles.filter((filePath) => !isExcludedPostFile(filePath)),
  };
}

export async function collectPostMetadata(postTypFiles, jobs, paths) {
  const tasks = postTypFiles.map((typFile) => {
    const rel = normalizePosixPath(relative(POSTS_DIR, typFile));
    return {
      typFile,
      cacheHtmlPath: join(paths.metadataCacheDir, 'posts', rel.replace(/\/index\.typ$/i, ''), 'meta.html'),
    };
  });

  const progressBar = createProgressBar('metadata    ', tasks.length);
  const results = await runPool(
    tasks,
    jobs,
    async (task) => {
      ensureDirForFile(task.cacheHtmlPath);

      const pagePath = derivePagePathFromIndexTyp(POSTS_DIR, task.typFile);
      const metadataPagePath = `posts/${pagePath}`.replace(/^posts\/$/, 'posts');
      const args = makeTypstCompileArgs(ROOT_DIR, task.typFile, task.cacheHtmlPath, [
        ['page-path', metadataPagePath],
        ['public-page-path', encodePublicPath(metadataPagePath)],
        ['emit-post-meta', 'true'],
      ]);

      const compiled = await runTypstCompile(ROOT_DIR, task.typFile, args, 'metadata');
      if (!compiled.ok) {
        return { ok: false, message: compiled.message };
      }

      const parsed = parseJsonFromMetadataHtml(ROOT_DIR, safeRead(task.cacheHtmlPath), task.typFile);
      rmSync(task.cacheHtmlPath, { force: true });

      return {
        ok: true,
        post: {
          slug: pagePath,
          url: toPublicUrl(`posts/${pagePath}`),
          title: String(parsed.title || '').trim(),
          description: String(parsed.description || '').trim(),
          descriptionText: String(parsed.descriptionText || '').trim(),
          cover: String(parsed.cover || '').trim(),
          resolvedCoverPath: String(parsed.resolvedCoverPath || '').trim(),
          resolvedPublicCoverPath: String(parsed.resolvedPublicCoverPath || '').trim(),
          tags: Array.isArray(parsed.tags) ? parsed.tags.map((tag) => String(tag).trim()).filter(Boolean) : [],
          category: String(parsed.category || '').trim(),
          date: String(parsed.date || '').trim(),
        },
      };
    },
    progressBar,
  );

  const errors = results.filter((item) => !item.ok);
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.message).join('\n\n'));
  }

  const posts = results.map((item) => item.post);
  posts.sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date));
    return byDate !== 0 ? byDate : String(a.slug).localeCompare(String(b.slug));
  });
  return posts;
}
