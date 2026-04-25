import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { createProjectTempDir, ensureProjectTempRoot } from '../foundation/temp-dir.mjs';

export const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';
export const PROJECT_TEMP_ROOT = ensureProjectTempRoot(ROOT_DIR);
const PROJECT_TEMP_CONFIG_PROXY_PATH = join(PROJECT_TEMP_ROOT, 'config.typ');
const PROJECT_TEMP_CONFIG_PROXY_SOURCE = '#import "../config.typ": *\n';

function ensureProjectTempConfigProxy() {
  if (existsSync(PROJECT_TEMP_CONFIG_PROXY_PATH)) {
    const existing = readFileSync(PROJECT_TEMP_CONFIG_PROXY_PATH, 'utf8');
    if (existing === PROJECT_TEMP_CONFIG_PROXY_SOURCE) {
      return;
    }
  }

  writeFileSync(PROJECT_TEMP_CONFIG_PROXY_PATH, PROJECT_TEMP_CONFIG_PROXY_SOURCE, 'utf8');
}

export function createTempDir(prefix) {
  ensureProjectTempConfigProxy();
  return createProjectTempDir(ROOT_DIR, prefix);
}

export function cleanupTempDir(tempDir) {
  rmSync(tempDir, { recursive: true, force: true });
}

function stageExtraFiles(tempDir, extraFiles) {
  for (const file of extraFiles) {
    const targetPath = join(tempDir, file.target);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(file.from, targetPath);
  }
}

export function buildTypstHtml({
  sourceText,
  outputName = 'out.html',
  inputs = [],
  extraFiles = [],
  prefix = '.tmp-post-layout-html-',
}) {
  const tempDir = createTempDir(prefix);
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, outputName);

  stageExtraFiles(tempDir, extraFiles);
  writeFileSync(sourcePath, sourceText, 'utf8');

  const args = [
    'compile',
    '--root',
    '.',
    '--font-path',
    '@fonts',
    '--font-path',
    'fonts-src',
    '--features',
    'html',
    '--format',
    'html',
  ];

  for (const [key, value] of inputs) {
    args.push('--input', `${key}=${value}`);
  }

  args.push(relative(ROOT_DIR, sourcePath), relative(ROOT_DIR, outputPath));

  const result = spawnSync('typst', args, {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  return {
    tempDir,
    outputPath,
    html: existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : '',
    result,
  };
}

export function compileTypstSvg(sourceText, { prefix = '.tmp-template-post-svg-test-', extraFiles = [] } = {}) {
  const tempDir = createTempDir(prefix);
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.svg');

  stageExtraFiles(tempDir, extraFiles);
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

export function compileTypstPdfText(sourceText, { prefix = '.tmp-template-post-pdf-test-', extraFiles = [] } = {}) {
  const tempDir = createTempDir(prefix);
  const sourcePath = join(tempDir, 'index.typ');
  const outputPath = join(tempDir, 'out.pdf');
  const textPath = join(tempDir, 'out.txt');

  stageExtraFiles(tempDir, extraFiles);
  writeFileSync(sourcePath, sourceText, 'utf8');

  const result = spawnSync('typst', ['compile', sourcePath, outputPath, '--root', ROOT_DIR], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  const textResult =
    result.status === 0
      ? spawnSync('pdftotext', [outputPath, textPath], {
          cwd: ROOT_DIR,
          encoding: 'utf8',
        })
      : null;

  return {
    tempDir,
    outputPath,
    textPath,
    textOutput: textResult?.status === 0 ? readFileSync(textPath, 'utf8') : '',
    result,
    textResult,
  };
}
