import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import test from 'node:test';
import { splitBasicAndNonBasicText } from './font-subset.mjs';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';
const PUBLISHED_ROOTS = ['posts/articles', 'posts/poems', 'pages'];
const ALLOWED_EXTENSIONS = new Set(['.typ', '.md', '.txt']);
const SKIPPED_SEGMENTS = new Set(['_drafts', '_hidden']);

function walkPublishedTextFiles(relativeDir) {
  const absoluteDir = join(ROOT_DIR, relativeDir);
  const results = [];

  for (const entry of readdirSync(absoluteDir)) {
    if (SKIPPED_SEGMENTS.has(entry)) continue;
    const absolutePath = join(absoluteDir, entry);
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      results.push(...walkPublishedTextFiles(join(relativeDir, entry)));
      continue;
    }
    if (ALLOWED_EXTENSIONS.has(extname(entry).toLowerCase())) {
      results.push(absolutePath);
    }
  }

  return results;
}

function collectPublishedCorpusText() {
  return PUBLISHED_ROOTS.flatMap(walkPublishedTextFiles)
    .map((filePath) => readFileSync(filePath, 'utf8'))
    .join('\n');
}

test('published content audit keeps representative punctuation in the non-basic route', () => {
  const corpusText = collectPublishedCorpusText();
  const { basicText, nonBasicText } = splitBasicAndNonBasicText(corpusText);

  for (const char of ['—', '“', '”', '…']) {
    assert.ok(nonBasicText.includes(char), `Expected published corpus to include ${char} in non-basic coverage.`);
    assert.ok(!basicText.includes(char), `Did not expect published corpus to route ${char} through the basic subset.`);
  }

  assert.ok(nonBasicText.includes('美'));
  assert.ok(nonBasicText.includes('诗'));
});
