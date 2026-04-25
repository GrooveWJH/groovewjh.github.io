import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT_DIR, resolveSafeBuildSubdir } from '../../foundation/paths.mjs';
import { defaultBuildJobs } from '../../site-build/cli/args.mjs';
import { buildSite } from '../../site-build/pipeline/core.mjs';
import { collectSharePreviewManifestSyncWithOptions } from '../manifest/index.mjs';
import { writeSharePreviewTool } from './writer.mjs';

function readExistingPreviewPosts(outputSiteDir) {
  const filePath = join(outputSiteDir, '__tools', 'share-preview', 'posts-metadata.json');
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export async function buildAndWriteSharePreview({
  outDirName = '_site',
  shareOrigin = 'local',
  noBuild = false,
  defaultPage = null,
} = {}) {
  const resolvedOutDir = resolveSafeBuildSubdir(ROOT_DIR, outDirName, '--out');
  let buildResult = null;
  let posts = null;

  if (!noBuild) {
    buildResult = await buildSite({
      outDirName,
      jobs: defaultBuildJobs(),
      configPath: 'config.typ',
      cacheRoot: '.typ-blog-cache',
      fontMode: 'auto',
      shareOrigin,
    });
    posts = buildResult?.posts || null;
  } else if (!existsSync(resolvedOutDir.resolvedPath)) {
    throw new Error(`--out directory does not exist for --no-build: ${outDirName}`);
  } else {
    posts = readExistingPreviewPosts(resolvedOutDir.resolvedPath);
  }

  const manifest = collectSharePreviewManifestSyncWithOptions(resolvedOutDir.resolvedPath, { posts });
  const previewIndexPath = writeSharePreviewTool(resolvedOutDir.resolvedPath, manifest, { defaultPage, posts });

  return {
    outputSiteDir: resolvedOutDir.resolvedPath,
    previewIndexPath,
    manifest,
    posts,
  };
}
