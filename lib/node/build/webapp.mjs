import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createProjectTempDir } from '../tmp-dir.mjs';
import { ASSETS_DIR, ROOT_DIR } from './constants.mjs';
import { ensureDirForFile, normalizePosixPath } from './helpers.mjs';

export const WEBAPP_NAME = 'Groove Blog';
export const WEBAPP_THEME_COLOR = '#f4f4f4';
export const WEBAPP_BACKGROUND_COLOR = '#f4f4f4';
export const WEBAPP_LANG = 'zh-cn';

const WEBAPP_SOURCE_IMAGE = 'webappicon.jpeg';
const WEBAPP_ICON_BUILD_STEPS = [
  { fileName: 'apple-touch-icon.png', size: 180, purpose: null, padded: false },
  { fileName: 'webapp-icon-192.png', size: 192, purpose: 'any', padded: false },
  { fileName: 'webapp-icon-512.png', size: 512, purpose: 'any', padded: false },
  { fileName: 'webapp-icon-512-maskable.png', size: 512, purpose: 'maskable', padded: true },
];
export const WEBAPP_ICON_FILE_NAMES = WEBAPP_ICON_BUILD_STEPS.map((step) => step.fileName);

function renderWebAppIconsWithPython(sourcePath, outputDir) {
  const script = `
from pathlib import Path
from PIL import Image, ImageColor
import sys

source_path = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
background = ImageColor.getrgb(sys.argv[3])
steps = [
    ("apple-touch-icon.png", 180, False),
    ("webapp-icon-192.png", 192, False),
    ("webapp-icon-512.png", 512, False),
    ("webapp-icon-512-maskable.png", 512, True),
]

image = Image.open(source_path).convert("RGB")
edge = min(image.size)
left = (image.width - edge) // 2
top = (image.height - edge) // 2
square = image.crop((left, top, left + edge, top + edge))

output_dir.mkdir(parents=True, exist_ok=True)

for file_name, size, padded in steps:
    icon = square.resize((size, size), Image.Resampling.LANCZOS)
    if padded:
        inset = round(size * 0.8)
        padded_icon = Image.new("RGB", (size, size), background)
        inset_icon = square.resize((inset, inset), Image.Resampling.LANCZOS)
        offset = (size - inset) // 2
        padded_icon.paste(inset_icon, (offset, offset))
        icon = padded_icon
    icon.save(output_dir / file_name, format="PNG")
`;

  try {
    execFileSync('python3', ['-c', script, sourcePath, outputDir, WEBAPP_BACKGROUND_COLOR], { stdio: 'ignore' });
  } catch (error) {
    throw new Error(
      'Failed to generate Web App icons via python3/Pillow. Ensure python3 and Pillow are installed before building.',
      { cause: error },
    );
  }
}

export function getWebAppIconDescriptors() {
  return WEBAPP_ICON_BUILD_STEPS.filter((step) => step.purpose).map((step) => ({
    src: `/assets/${step.fileName}`,
    sizes: `${step.size}x${step.size}`,
    type: 'image/png',
    purpose: step.purpose,
  }));
}

export function buildWebAppManifest(siteInputs = {}) {
  return {
    name: WEBAPP_NAME,
    short_name: WEBAPP_NAME,
    start_url: '/',
    display: 'standalone',
    background_color: WEBAPP_BACKGROUND_COLOR,
    theme_color: WEBAPP_THEME_COLOR,
    lang: siteInputs.language || WEBAPP_LANG,
    scope: '/',
    icons: getWebAppIconDescriptors(),
  };
}

export function ensureWebAppIconAssets(outputDir = ASSETS_DIR) {
  const sourcePath = join(ASSETS_DIR, WEBAPP_SOURCE_IMAGE);
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing Web App source image: ${normalizePosixPath(sourcePath)}`);
  }

  const tempDir = createProjectTempDir(ROOT_DIR, 'webapp-icons-');

  mkdirSync(outputDir, { recursive: true });
  try {
    renderWebAppIconsWithPython(sourcePath, tempDir);
    return WEBAPP_ICON_BUILD_STEPS.map((step) => {
      const outputPath = join(outputDir, step.fileName);
      ensureDirForFile(outputPath);
      cpSync(join(tempDir, step.fileName), outputPath, { force: true });

      return {
        fileName: step.fileName,
        sourcePath: outputPath,
      };
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function stageWebAppArtifacts(stagingSiteDir, statusMap, siteInputs = {}) {
  const iconAssets = ensureWebAppIconAssets(join(stagingSiteDir, 'assets'));
  for (const asset of iconAssets) {
    const outputRel = `assets/${asset.fileName}`;
    statusMap.set(outputRel, 'updated');
  }

  const manifestPath = join(stagingSiteDir, 'manifest.webmanifest');
  ensureDirForFile(manifestPath);
  writeFileSync(manifestPath, `${JSON.stringify(buildWebAppManifest(siteInputs), null, 2)}\n`, 'utf8');
  statusMap.set('manifest.webmanifest', 'updated');
}
