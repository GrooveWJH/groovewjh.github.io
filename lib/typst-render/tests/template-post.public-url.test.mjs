import assert from 'node:assert/strict';
import { join } from 'node:path';
import test from 'node:test';
import { buildTypstHtml, cleanupTempDir, compileTypstPdfText, ROOT_DIR } from '../../testing/typst.mjs';

test('template-post html uses encoded public cover path while typst preview still resolves raw relative files', () => {
  const htmlCompiled = buildTypstHtml({
    sourceText: `#import "../config.typ": *

#show: template-post.with(
  title: "Encoded Cover Path Check",
  description: "Header description",
  cover: image("img/cover.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    inputs: [
      ['page-path', 'posts/articles/learn_color#1'],
      ['public-page-path', 'posts/articles/learn_color%231'],
      ['website-url', 'https://groovewjh.github.io'],
    ],
    extraFiles: [{ from: join(ROOT_DIR, 'assets', 'favicon.png'), target: 'img/cover.png' }],
    prefix: '.tmp-template-post-public-cover-html-',
  });

  assert.equal(htmlCompiled.result.status, 0, htmlCompiled.result.stderr || htmlCompiled.result.stdout);
  assert.match(
    htmlCompiled.html,
    /<link rel="canonical" href="https:\/\/groovewjh\.github\.io\/posts\/articles\/learn_color%231\/">/,
  );
  assert.match(
    htmlCompiled.html,
    /<meta property="og:url" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/learn_color%231\/">/,
  );
  assert.match(htmlCompiled.html, /<img[^>]+src="\/posts\/articles\/learn_color%231\/img\/cover\.png"/);
  cleanupTempDir(htmlCompiled.tempDir);

  const previewCompiled = compileTypstPdfText(
    `#import "../config.typ": *

#show: template-post.with(
  title: "Encoded Cover Path Preview",
  description: "Preview description",
  cover: image("img/cover.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`,
    {
      prefix: '.tmp-template-post-public-cover-pdf-',
      extraFiles: [{ from: join(ROOT_DIR, 'assets', 'favicon.png'), target: 'img/cover.png' }],
    },
  );

  assert.equal(previewCompiled.result.status, 0, previewCompiled.result.stderr || previewCompiled.result.stdout);
  cleanupTempDir(previewCompiled.tempDir);
});
