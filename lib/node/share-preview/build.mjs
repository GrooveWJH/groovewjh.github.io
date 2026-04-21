import { existsSync } from 'node:fs';
import { defaultBuildJobs } from '../build/cli.mjs';
import { ROOT_DIR } from '../build/constants.mjs';
import { buildSite } from '../build/core.mjs';
import { resolveSafeBuildSubdir } from '../build/helpers.mjs';
import { collectSharePreviewManifestSync } from './manifest.mjs';
import { writeSharePreviewTool } from './writer.mjs';

export async function buildAndWriteSharePreview({
  outDirName = '_site',
  shareOrigin = 'local',
  noBuild = false,
  defaultPage = null,
} = {}) {
  const resolvedOutDir = resolveSafeBuildSubdir(ROOT_DIR, outDirName, '--out');

  if (!noBuild) {
    await buildSite({
      outDirName,
      jobs: defaultBuildJobs(),
      configPath: 'config.typ',
      cacheRoot: '.typ-blog-cache',
      fontMode: 'auto',
      shareOrigin,
    });
  } else if (!existsSync(resolvedOutDir.resolvedPath)) {
    throw new Error(`--out directory does not exist for --no-build: ${outDirName}`);
  }

  const manifest = collectSharePreviewManifestSync(resolvedOutDir.resolvedPath);
  const previewIndexPath = writeSharePreviewTool(resolvedOutDir.resolvedPath, manifest, { defaultPage });

  return {
    outputSiteDir: resolvedOutDir.resolvedPath,
    previewIndexPath,
    manifest,
  };
}
