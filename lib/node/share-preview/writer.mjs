import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ROOT_DIR } from "../build/constants.mjs";
import { ensureDirForFile, normalizePosixPath, walkFiles } from "../build/helpers.mjs";

export const PREVIEW_TOOL_REL_DIR = "__tools/share-preview";

const RUNTIME_SOURCE_DIR = resolve(ROOT_DIR, "lib", "node", "share-preview", "runtime");
const COLOR_THIEF_SOURCE_PATH = resolve(
  ROOT_DIR,
  "node_modules",
  "colorthief",
  "dist",
  "umd",
  "color-thief.global.js",
);

function buildPreviewIndexHtml({ defaultPage = null }) {
  const defaultPageValue = defaultPage || "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Share Card Preview</title>
    <link rel="stylesheet" href="./styles.css">
  </head>
  <body class="carbon-preview-body" data-default-page="${defaultPageValue}">
    <div class="carbon-preview-shell">
      <header class="carbon-preview-header">
        <div class="carbon-preview-header__brand">
          <p class="carbon-preview-header__eyebrow">Groove Blog</p>
          <h1>Share Preview</h1>
        </div>
        <p class="carbon-preview-header__summary">Carbon Light review desk for iMessage+ share cards.</p>
      </header>
      <div class="carbon-preview-workbench">
        <aside class="carbon-preview-rail">
          <label class="carbon-preview-search" for="page-search">
            <span class="carbon-preview-search__label">Articles</span>
            <input id="page-search" type="search" placeholder="搜索标题或路径">
          </label>
          <div id="page-list" class="carbon-preview-page-list" aria-label="Share preview pages"></div>
        </aside>
        <main class="carbon-preview-workspace">
          <section class="carbon-preview-toolbar">
            <div id="card-stage-meta" class="carbon-preview-toolbar__summary"></div>
            <div class="carbon-preview-toolbar__actions">
              <div id="display-options-host"></div>
              <div id="canvas-toggle-host"></div>
              <a id="open-page-link" class="carbon-preview-link" href="/" target="_blank" rel="noreferrer">Open Page</a>
              <button id="export-button" class="carbon-preview-button" type="button">Export PNG</button>
            </div>
          </section>
          <section class="carbon-preview-stage-panel">
            <div class="carbon-preview-stage-surface">
              <div id="card-stage" class="carbon-preview-card-stage"></div>
            </div>
          </section>
          <section class="carbon-preview-bottom-sheet">
            <div class="carbon-preview-bottom-sheet__header">
              <div>
                <p class="carbon-preview-bottom-sheet__eyebrow">Inspector</p>
                <h2>Share Details</h2>
              </div>
              <div id="inspector-tabs" class="carbon-preview-bottom-sheet__tabs" role="tablist" aria-label="Inspector panels"></div>
            </div>
            <div class="carbon-preview-bottom-sheet__body">
              <section id="payload-view" class="carbon-preview-detail-panel" data-detail-panel="payload" role="tabpanel" aria-label="Share Payload"></section>
              <section id="notes-view" class="carbon-preview-detail-panel" data-detail-panel="notes" role="tabpanel" aria-label="Preview Notes"></section>
            </div>
          </section>
        </main>
      </div>
    </div>
    <script src="./vendor/qrcode-generator.min.js"></script>
    <script src="./vendor/color-thief.global.js"></script>
    <script type="module" src="./app.mjs"></script>
  </body>
</html>
`;
}

function ensurePreviewToolDir(outputSiteDir) {
  const targetDir = join(outputSiteDir, PREVIEW_TOOL_REL_DIR);
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
  const targetPath = join(targetDir, "vendor", "color-thief.global.js");
  ensureDirForFile(targetPath);
  copyFileSync(COLOR_THIEF_SOURCE_PATH, targetPath);
}

export function writeSharePreviewTool(outputSiteDir, manifest, { defaultPage = null } = {}) {
  const previewToolDir = ensurePreviewToolDir(outputSiteDir);

  writeFileSync(join(previewToolDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(join(previewToolDir, "index.html"), buildPreviewIndexHtml({ defaultPage }), "utf8");
  copyRuntimeAssets(previewToolDir);
  copyVendorAssets(previewToolDir);

  return join(previewToolDir, "index.html");
}
