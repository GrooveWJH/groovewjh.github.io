import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

function compileTypstSvg(sourceText, prefix = '.tmp-template-post-svg-test-') {
  const tempDir = mkdtempSync(join(ROOT_DIR, prefix));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.svg');

  writeFileSync(sourcePath, sourceText, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  return {
    tempDir,
    outputPath,
    svg: result.status === 0 ? readFileSync(outputPath, 'utf8') : '',
    result,
  };
}

test('template-post shows title and description in pdf preview output', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');
  const title = 'Compile Check';
  const description = 'Preview description';

  writeFileSync(sourcePath, `#import "../config.typ": *

#show: template-post.with(
  title: "${title}",
  description: "${description}",
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, new RegExp(title));
  assert.match(textOutput, new RegExp(description));
});

test('template-post pdf preview still compiles when cover is provided', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-cover-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');
  const title = 'Cover Check';
  const description = 'Preview description with cover';

  writeFileSync(sourcePath, `#import "../config.typ": *

#show: template-post.with(
  title: "${title}",
  description: "${description}",
  cover: "/assets/favicon.png",
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile with cover to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, new RegExp(title));
  assert.match(textOutput, new RegExp(description));
});

test('template-post pdf preview compiles with image-object cover and default width', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-image-cover-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');
  const title = 'Image Object Cover Check';
  const description = 'Preview description with image-object cover';

  writeFileSync(sourcePath, `#import "../config.typ": *

#show: template-post.with(
  title: "${title}",
  description: "${description}",
  cover: image("/assets/favicon.png"),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile with image-object cover to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, new RegExp(title));
  assert.match(textOutput, new RegExp(description));
});

test('template-post pdf preview compiles with image-object cover and percentage width', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-image-cover-width-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');
  const title = 'Image Object Cover Width Check';
  const description = 'Preview description with 60 percent image-object cover';

  writeFileSync(sourcePath, `#import "../config.typ": *

#show: template-post.with(
  title: "${title}",
  description: "${description}",
  cover: image("/assets/favicon.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile with percentage image-object cover to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, new RegExp(title));
  assert.match(textOutput, new RegExp(description));
});

test('template-post pdf preview compiles with relative image-object cover paths from the post file', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-relative-cover-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');
  const coverDir = join(tempDir, 'img');
  const coverPath = join(coverDir, 'cover.png');
  const title = 'Relative Cover Path Check';
  const description = 'Preview description with relative image-object cover';

  mkdirSync(coverDir, { recursive: true });
  copyFileSync(join(ROOT_DIR, 'assets', 'favicon.png'), coverPath);

  writeFileSync(sourcePath, `#import "../config.typ": *

#show: template-post.with(
  title: "${title}",
  description: "${description}",
  cover: image("img/cover.png", width: 60%),
  tags: ("测试",),
  category: "测试",
  date: datetime(year: 2026, month: 4, day: 18),
)

正文。
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile with relative image-object cover to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, new RegExp(title));
  assert.match(textOutput, new RegExp(description));
});

test('render-post-cover centers image-object covers in typst preview output', () => {
  const compiled = compileTypstSvg(`#import "../config.typ": *

#render-post-cover(image("/assets/favicon.png", width: 50%))
`);

  assert.equal(
    compiled.result.status,
    0,
    `Expected typst svg compile with image-object cover to succeed.\nstdout:\n${compiled.result.stdout}\nstderr:\n${compiled.result.stderr}`,
  );

  const viewBoxMatch = compiled.svg.match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/);
  const groupMatch = compiled.svg.match(/<g class="typst-group" transform="matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)">/);
  const imageMatch = compiled.svg.match(/<image(?: transform="matrix\(1 0 0 1 ([0-9.]+) ([0-9.]+)\)")?[^>]* width="([0-9.]+)"[^>]*>/);

  assert.ok(viewBoxMatch, 'Expected svg viewBox to exist');
  assert.ok(groupMatch, 'Expected svg content group transform to exist');
  assert.ok(imageMatch, 'Expected svg image node to exist');

  const pageWidth = Number(viewBoxMatch[1]);
  const contentOffsetX = Number(groupMatch[1]);
  const imageOffsetX = Number(imageMatch[1] || '0');
  const imageWidth = Number(imageMatch[3]);
  const contentWidth = pageWidth - (contentOffsetX * 2);
  const leftMargin = imageOffsetX;
  const rightMargin = contentWidth - imageWidth - imageOffsetX;

  rmSync(compiled.tempDir, { recursive: true, force: true });

  assert.ok(leftMargin > 0, `Expected centered image to have positive left inset, got ${leftMargin}`);
  assert.ok(Math.abs(leftMargin - rightMargin) < 0.01, `Expected centered image margins to match, got left=${leftMargin}, right=${rightMargin}`);
});

test('typst preview callouts render shared default titles when title is omitted', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-callout-title-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');

  writeFileSync(sourcePath, `#import "../config.typ": *

#note[默认 note]
#success[默认 success]
#warning[默认 warning]
#error[默认 error]
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, /提示/);
  assert.match(textOutput, /完成/);
  assert.match(textOutput, /警告/);
  assert.match(textOutput, /注意/);
});

test('typst preview callouts prefer explicit titles over default titles', () => {
  const tempDir = mkdtempSync(join(ROOT_DIR, '.tmp-template-post-callout-explicit-title-test-'));
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');

  writeFileSync(sourcePath, `#import "../config.typ": *

#warning(title: "注意！")[显式 warning]
`, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected typst compile to succeed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );

  const extractResult = spawnSync('pdftotext', [outputPath, textPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    extractResult.status,
    0,
    `Expected pdftotext to succeed.\nstdout:\n${extractResult.stdout}\nstderr:\n${extractResult.stderr}`,
  );

  const textOutput = readFileSync(textPath, 'utf8');
  rmSync(tempDir, { recursive: true, force: true });

  assert.match(textOutput, /注意！/);
  assert.doesNotMatch(textOutput, /警告/);
});
