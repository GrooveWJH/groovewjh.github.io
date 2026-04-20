import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ASSETS_DIR, ROOT_DIR } from "./constants.mjs";
import { ensureDirForFile, normalizePosixPath, stageFileFromSourceOrOutput } from "./helpers.mjs";
import { createProjectTempDir } from "../tmp-dir.mjs";

export const WEBAPP_NAME = "Groove Blog";
export const WEBAPP_THEME_COLOR = "#f4f4f4";
export const WEBAPP_BACKGROUND_COLOR = "#f4f4f4";
export const WEBAPP_LANG = "zh-cn";

const WEBAPP_SOURCE_IMAGE = "webappicon.jpeg";
const WEBAPP_ICON_BUILD_STEPS = [
  { fileName: "apple-touch-icon.png", size: 180, purpose: null, padded: false },
  { fileName: "webapp-icon-192.png", size: 192, purpose: "any", padded: false },
  { fileName: "webapp-icon-512.png", size: 512, purpose: "any", padded: false },
  { fileName: "webapp-icon-512-maskable.png", size: 512, purpose: "maskable", padded: true },
];
export const WEBAPP_ICON_FILE_NAMES = WEBAPP_ICON_BUILD_STEPS.map((step) => step.fileName);

function runSips(args, options = {}) {
  execFileSync("/usr/bin/sips", args, { stdio: "ignore", ...options });
}

function readPixelSize(path) {
  const output = execFileSync("/usr/bin/sips", ["-g", "pixelWidth", "-g", "pixelHeight", path], { encoding: "utf8" });
  const width = Number(output.match(/pixelWidth:\s+(\d+)/)?.[1]);
  const height = Number(output.match(/pixelHeight:\s+(\d+)/)?.[1]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Unable to read image size for ${path}`);
  }
  return { width, height };
}

function buildSquareSource(sourcePath, tempSourcePath, tempSquarePath) {
  const { width, height } = readPixelSize(sourcePath);
  const cropSize = String(Math.min(width, height));
  runSips(["-s", "format", "png", sourcePath, "--out", tempSourcePath]);
  runSips(["-c", cropSize, cropSize, tempSourcePath, "--out", tempSquarePath]);
}

function renderIconFromSquare(squarePath, outputPath, size, padded) {
  ensureDirForFile(outputPath);
  if (!padded) {
    runSips(["-z", String(size), String(size), squarePath, "--out", outputPath]);
    return;
  }

  const tempInsetPath = outputPath.replace(/\.png$/i, ".inset.png");
  const insetSize = String(Math.round(size * 0.8));
  runSips(["-z", insetSize, insetSize, squarePath, "--out", tempInsetPath]);
  runSips(["-p", String(size), String(size), "--padColor", WEBAPP_BACKGROUND_COLOR.replace("#", ""), tempInsetPath, "--out", outputPath]);
  rmSync(tempInsetPath, { force: true });
}

export function getWebAppIconDescriptors() {
  return WEBAPP_ICON_BUILD_STEPS
    .filter((step) => step.purpose)
    .map((step) => ({
      src: `/assets/${step.fileName}`,
      sizes: `${step.size}x${step.size}`,
      type: "image/png",
      purpose: step.purpose,
    }));
}

export function buildWebAppManifest(siteInputs = {}) {
  return {
    name: WEBAPP_NAME,
    short_name: WEBAPP_NAME,
    start_url: "/",
    display: "standalone",
    background_color: WEBAPP_BACKGROUND_COLOR,
    theme_color: WEBAPP_THEME_COLOR,
    lang: siteInputs.language || WEBAPP_LANG,
    scope: "/",
    icons: getWebAppIconDescriptors(),
  };
}

export function ensureWebAppIconAssets() {
  const sourcePath = join(ASSETS_DIR, WEBAPP_SOURCE_IMAGE);
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing Web App source image: ${normalizePosixPath(sourcePath)}`);
  }

  const tempDir = createProjectTempDir(ROOT_DIR, "webapp-icons-");
  const tempSourcePath = join(tempDir, "source.png");
  const tempSquarePath = join(tempDir, "square.png");

  mkdirSync(ASSETS_DIR, { recursive: true });
  try {
    buildSquareSource(sourcePath, tempSourcePath, tempSquarePath);
    for (const step of WEBAPP_ICON_BUILD_STEPS) {
      renderIconFromSquare(tempSquarePath, join(ASSETS_DIR, step.fileName), step.size, step.padded);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  return WEBAPP_ICON_BUILD_STEPS.map((step) => ({
    fileName: step.fileName,
    sourcePath: join(ASSETS_DIR, step.fileName),
  }));
}

export function stageWebAppArtifacts(stagingSiteDir, statusMap, siteInputs = {}) {
  const iconAssets = ensureWebAppIconAssets();
  for (const asset of iconAssets) {
    const outputRel = `assets/${asset.fileName}`;
    stageFileFromSourceOrOutput(asset.sourcePath, join(stagingSiteDir, outputRel), statusMap, outputRel);
  }

  const manifestPath = join(stagingSiteDir, "manifest.webmanifest");
  ensureDirForFile(manifestPath);
  writeFileSync(manifestPath, `${JSON.stringify(buildWebAppManifest(siteInputs), null, 2)}\n`, "utf8");
  statusMap.set("manifest.webmanifest", "updated");
}
