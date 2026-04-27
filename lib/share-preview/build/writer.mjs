import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { ensureDirForFile, normalizePosixPath, walkFiles } from '../../foundation/fs.mjs';
import { ROOT_DIR } from '../../foundation/paths.mjs';
import { renderPreviewIcon } from '../runtime/ui/icons.mjs';

export const PREVIEW_TOOL_REL_DIR = 'tools/share-preview';
export const LEGACY_PREVIEW_TOOL_REL_DIR = '__tools/share-preview';

const RUNTIME_SOURCE_DIR = resolve(ROOT_DIR, 'lib', 'share-preview', 'runtime');
const COLOR_THIEF_SOURCE_PATH = resolve(ROOT_DIR, 'node_modules', 'colorthief', 'dist', 'umd', 'color-thief.global.js');

function toPreviewVersion(manifest) {
  const buildStamp = new Date().toISOString();
  const generatedAt = String(manifest?.generatedAt || '');
  return `${generatedAt}-${buildStamp}`.replace(/[^0-9a-z]+/gi, '-').replace(/^-+|-+$/g, '') || String(Date.now());
}

function buildPreviewIndexHtml({ defaultPage = null, manifestPath, runtimeDir }) {
  const defaultPageValue = defaultPage || '';
  const previewVersion = runtimeDir.replace(/^\.\/runtime\//, '');

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>分享预览工作台</title>
    <link rel="stylesheet" href="${runtimeDir}/styles.css">
  </head>
  <body class="carbon-preview-body" data-default-page="${defaultPageValue}" data-manifest-url="${manifestPath}" data-preview-version="${previewVersion}" data-preview-version-url="./version.json">
    <div class="carbon-preview-shell">
      <header class="carbon-preview-header">
        <div class="carbon-preview-header__row">
          <div class="carbon-preview-header__brand">
            <h1>分享预览</h1>
            <p class="carbon-preview-header__scope">iMessage+ 校对台</p>
          </div>
          <div id="preview-mode-host" class="carbon-preview-header__modes"></div>
        </div>
      </header>
      <div class="carbon-preview-desk">
        <aside class="carbon-preview-rail">
          <div class="carbon-preview-rail__header">
            <div id="page-search-shell">
              <label class="carbon-preview-search" for="page-search">
                <span class="carbon-preview-search__label">文章检索</span>
                <span class="carbon-preview-search__field">
                  <span class="carbon-preview-inline-icon carbon-preview-search__icon">${renderPreviewIcon('search')}</span>
                  <input id="page-search" type="search" placeholder="搜索标题或路径">
                </span>
              </label>
            </div>
            <p id="page-results" class="carbon-preview-rail__summary"></p>
          </div>
          <div id="rail-body" class="carbon-preview-page-list" aria-label="分享预览页面列表"></div>
        </aside>
        <main class="carbon-preview-stage-column">
          <section class="carbon-preview-stage-toolbar">
            <div id="card-stage-meta" class="carbon-preview-stage-toolbar__summary"></div>
          </section>
          <section class="carbon-preview-stage-panel">
            <div class="carbon-preview-stage-surface">
              <div id="card-stage" class="carbon-preview-card-stage"></div>
            </div>
          </section>
        </main>
        <aside class="carbon-preview-inspector">
          <div class="carbon-preview-inspector__header">
            <div class="carbon-preview-inspector__heading">
              <p class="carbon-preview-kicker">检查面板</p>
              <h2>页面检查</h2>
            </div>
            <div id="inspector-tabs" class="carbon-preview-inspector__tabs" role="tablist" aria-label="检查面板切换"></div>
          </div>
          <div class="carbon-preview-inspector__actions">
            <a id="open-page-link" class="carbon-preview-link" href="/" target="_blank" rel="noreferrer">
              <span class="carbon-preview-inline-icon">${renderPreviewIcon('open')}</span>
              <span>打开页面</span>
            </a>
            <button id="export-button" class="carbon-preview-button" type="button">
              <span class="carbon-preview-inline-icon">${renderPreviewIcon('export')}</span>
              <span>导出 PNG</span>
            </button>
          </div>
          <section class="carbon-preview-inspector__controls">
            <div class="carbon-preview-toolbar__actions">
              <div id="display-options-host"></div>
              <div id="canvas-toggle-host"></div>
            </div>
          </section>
          <div class="carbon-preview-inspector__body">
            <section id="review-view" class="carbon-preview-detail-panel" data-detail-panel="review" role="tabpanel" aria-label="检查"></section>
            <section id="payload-view" class="carbon-preview-detail-panel" data-detail-panel="payload" role="tabpanel" aria-label="分享负载"></section>
          </div>
        </aside>
      </div>
    </div>
    <script src="${runtimeDir}/vendor/qrcode-generator.min.js"></script>
    <script src="${runtimeDir}/vendor/color-thief.global.js"></script>
    <script type="module" src="${runtimeDir}/app.mjs"></script>
  </body>
</html>
`;
}

function ensurePreviewToolDir(outputSiteDir) {
  const targetDir = join(outputSiteDir, PREVIEW_TOOL_REL_DIR);
  const legacyDir = join(outputSiteDir, LEGACY_PREVIEW_TOOL_REL_DIR);
  rmSync(legacyDir, { recursive: true, force: true });
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

function copyRuntimeAssets(targetDir) {
  const files = walkFiles(RUNTIME_SOURCE_DIR);

  for (const sourcePath of files) {
    const relativePath = normalizePosixPath(relative(RUNTIME_SOURCE_DIR, sourcePath));
    const targetPath = join(targetDir, relativePath);
    ensureDirForFile(targetPath);
    copyFileSync(sourcePath, targetPath);
  }
}

function copyVendorAssets(targetDir) {
  const targetPath = join(targetDir, 'vendor', 'color-thief.global.js');
  ensureDirForFile(targetPath);
  copyFileSync(COLOR_THIEF_SOURCE_PATH, targetPath);
}

export function writeSharePreviewTool(outputSiteDir, manifest, { defaultPage = null, posts = null } = {}) {
  const previewToolDir = ensurePreviewToolDir(outputSiteDir);
  const version = toPreviewVersion(manifest);
  const runtimeRelDir = `./runtime/${version}`;
  const runtimeDir = join(previewToolDir, 'runtime', version);
  const manifestFileName = `manifest.${version}.json`;

  writeFileSync(join(previewToolDir, manifestFileName), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(join(previewToolDir, 'version.json'), `${JSON.stringify({ version }, null, 2)}\n`, 'utf8');
  writeFileSync(join(previewToolDir, 'posts-metadata.json'), `${JSON.stringify(posts || [], null, 2)}\n`, 'utf8');
  writeFileSync(
    join(previewToolDir, 'index.html'),
    buildPreviewIndexHtml({ defaultPage, manifestPath: `./${manifestFileName}`, runtimeDir: runtimeRelDir }),
    'utf8',
  );
  copyRuntimeAssets(runtimeDir);
  copyVendorAssets(runtimeDir);

  return join(previewToolDir, 'index.html');
}
