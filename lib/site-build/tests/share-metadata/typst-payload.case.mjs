import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { buildTypstHtml, extractMetadataJson, ROOT_DIR } from '../../../testing/share-site.mjs';
import { cleanupTempDir } from '../../../testing/typst.mjs';

test('template-post metadata JSON resolves string and image-object covers', () => {
  const stringCover = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Cover Check",
  description: "",
  cover: "img/cover.png",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-cover-check'],
      ['emit-post-meta', 'true'],
    ],
    prefix: '.tmp-share-metadata-',
  });

  assert.equal(
    stringCover.result.status,
    0,
    `Expected metadata html compile to succeed.\nstdout:\n${stringCover.result.stdout}\nstderr:\n${stringCover.result.stderr}`,
  );
  const stringParsed = extractMetadataJson(stringCover.html);
  cleanupTempDir(stringCover.tempDir);
  assert.equal(stringParsed.cover, 'img/cover.png');
  assert.equal(stringParsed.resolvedCoverPath, '/posts/articles/metadata-cover-check/img/cover.png');
  assert.equal(stringParsed.resolvedPublicCoverPath, '/posts/articles/metadata-cover-check/img/cover.png');

  const imageCover = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Image Cover Check",
  description: "",
  cover: image("img/cover.png", width: 60%),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-image-cover-check'],
      ['emit-post-meta', 'true'],
    ],
    extraFiles: [
      {
        from: join(ROOT_DIR, 'assets', 'favicon.png'),
        target: 'img/cover.png',
      },
    ],
    prefix: '.tmp-share-metadata-',
  });

  assert.equal(
    imageCover.result.status,
    0,
    `Expected metadata html compile for image-object cover to succeed.\nstdout:\n${imageCover.result.stdout}\nstderr:\n${imageCover.result.stderr}`,
  );
  const imageParsed = extractMetadataJson(imageCover.html);
  cleanupTempDir(imageCover.tempDir);
  assert.equal(imageParsed.cover, 'img/cover.png');
  assert.equal(imageParsed.resolvedCoverPath, '/posts/articles/metadata-image-cover-check/img/cover.png');
  assert.equal(imageParsed.resolvedPublicCoverPath, '/posts/articles/metadata-image-cover-check/img/cover.png');
});

test('template-post metadata JSON emits collapsed and multiline description text for content descriptions', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Content Description Check",
  description: [第一行#linebreak()第二行],
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 23),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-content-description-check'],
      ['emit-post-meta', 'true'],
    ],
    prefix: '.tmp-share-metadata-content-description-',
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected metadata html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  const parsed = extractMetadataJson(compiled.html);
  cleanupTempDir(compiled.tempDir);

  assert.equal(parsed.description, '第一行 第二行');
  assert.equal(parsed.descriptionText, '第一行\n第二行');
});

test('template-post metadata JSON preserves trailing backslash line breaks used in article descriptions', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Slash Description Check",
  description: [第一行，\\
  第二行，\\
  第三行。],
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 27),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-slash-description-check'],
      ['emit-post-meta', 'true'],
    ],
    prefix: '.tmp-share-metadata-slash-description-',
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected metadata html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  const parsed = extractMetadataJson(compiled.html);
  cleanupTempDir(compiled.tempDir);

  assert.equal(parsed.description, '第一行， 第二行， 第三行。');
  assert.equal(parsed.descriptionText, '第一行，\n 第二行，\n 第三行。');
});

test('template-post metadata JSON emits panel intent for preview-only art direction', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Panel Intent Check",
  description: "",
  panel-intent: "dark-anchor",
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 27),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-panel-intent-check'],
      ['emit-post-meta', 'true'],
    ],
    prefix: '.tmp-share-metadata-panel-intent-',
  });

  assert.equal(
    compiled.result.status,
    0,
    `Expected metadata html compile to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );
  const parsed = extractMetadataJson(compiled.html);
  cleanupTempDir(compiled.tempDir);
  assert.equal(parsed.panelIntent, 'dark-anchor');
});

test('template-post metadata JSON rejects unsupported complex description content without description-text override', () => {
  const compiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Metadata Invalid Description Check",
  description: [第一段#parbreak()第二段],
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 23),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/metadata-invalid-description-check'],
      ['emit-post-meta', 'true'],
    ],
    prefix: '.tmp-share-metadata-invalid-description-',
  });

  assert.notEqual(compiled.result.status, 0);
  assert.match(compiled.result.stderr, /description-text|inline description/i);
  cleanupTempDir(compiled.tempDir);
});
