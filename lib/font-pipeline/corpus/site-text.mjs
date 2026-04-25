import { existsSync, readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

import { PAGES_DIR, POSTS_DIR } from '../../node/build/constants.mjs';
import { walkFiles } from '../../node/build/helpers.mjs';
import { collectPublishedPoemFrameCorpusText } from '../../node/poem-frame-corpus.mjs';
import { ALLOWED_TEXT_EXTENSIONS, STATIC_TEXT_SOURCES } from '../catalog/specs.mjs';

function readSourceText(sourcePath) {
  const extension = extname(sourcePath).toLowerCase();
  if (ALLOWED_TEXT_EXTENSIONS.has(extension) || basename(sourcePath) === 'site.config.json') {
    return readFileSync(sourcePath, 'utf8');
  }

  const files = walkFiles(sourcePath, (filePath) => ALLOWED_TEXT_EXTENSIONS.has(extname(filePath).toLowerCase()));
  return files.map((filePath) => readFileSync(filePath, 'utf8')).join('\n');
}

export function collectCorpusText() {
  const chunks = ['Groove Blog 标签 日期 分类 上一篇 下一篇 目录 关于 文章 诗歌 Typst HTML CSS JavaScript 你好世界'];

  for (const sourcePath of STATIC_TEXT_SOURCES) {
    if (existsSync(sourcePath)) {
      chunks.push(readSourceText(sourcePath));
    }
  }

  return chunks.join('\n');
}

export function collectPoemCorpusText() {
  return collectPublishedPoemFrameCorpusText({
    postsDir: POSTS_DIR,
    pagesDir: PAGES_DIR,
  });
}
