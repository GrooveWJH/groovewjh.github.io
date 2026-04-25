import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { normalizePosixPath, walkFiles, writeJson } from '../../foundation/fs.mjs';
import { ASSETS_DIR, PAGES_DIR, POSTS_DIR, ROOT_DIR, resolveSafeBuildSubdir } from '../../foundation/paths.mjs';
import { collectSourceFiles } from '../../node/build/helpers.mjs';
import { stageFileFromSourceOrOutput } from './output.mjs';
import { collectPostMetadata, filterPostSourceFiles } from './post-metadata.mjs';
import { ensureUniqueOutputTargets, makePageCompileTasks, makePostCompileTasks } from './task-builders.mjs';
import { collectTypstDependencyFiles } from './typst.mjs';

export function prepareBuildPaths({ outDirName, configPath, cacheRoot, siteConfigFileName }) {
  const resolvedOutDir = resolveSafeBuildSubdir(ROOT_DIR, outDirName, '--out');
  const resolvedCacheRoot = resolveSafeBuildSubdir(ROOT_DIR, cacheRoot, '--cache-root');
  const resolvedConfigTypPath = resolve(ROOT_DIR, configPath);
  const configRelPath = normalizePosixPath(relative(ROOT_DIR, resolvedConfigTypPath));

  if (!configRelPath || configRelPath === '.' || configRelPath === '..' || configRelPath.startsWith('../')) {
    throw new Error(`--config must resolve inside repository root: ${configPath}`);
  }

  return {
    paths: {
      configTypPath: resolvedConfigTypPath,
      siteConfigPath: resolve(ROOT_DIR, siteConfigFileName),
      cacheRoot: resolvedCacheRoot.resolvedPath,
      transientRoot: join(resolvedCacheRoot.resolvedPath, 'transient'),
      stagingSiteDir: join(resolvedCacheRoot.resolvedPath, 'transient', '_site-staging'),
      metadataCacheDir: join(resolvedCacheRoot.resolvedPath, 'transient', 'metadata'),
      postsMetadataJsonPath: join(resolvedCacheRoot.resolvedPath, 'transient', '_posts-metadata.json'),
      routeSlugsJsonPath: join(resolvedCacheRoot.resolvedPath, 'transient', '_route-slugs.json'),
    },
    outputSiteDir: resolvedOutDir.resolvedPath,
  };
}

export async function collectBuildData(paths, jobs, buildSlugMap) {
  const postSource = filterPostSourceFiles(collectSourceFiles(POSTS_DIR));
  const pageSource = collectSourceFiles(PAGES_DIR);
  const posts = await collectPostMetadata(postSource.typFiles, jobs, paths);
  writeJson(paths.postsMetadataJsonPath, posts);

  const slugMaps = {
    tags: buildSlugMap(
      posts.flatMap((post) => post.tags),
      'tags',
    ),
    categories: buildSlugMap(posts.map((post) => post.category).filter(Boolean), 'categories'),
  };
  writeJson(paths.routeSlugsJsonPath, slugMaps);

  return { postSource, pageSource, posts, slugMaps };
}

export function buildCompileTaskSet(buildData, paths, siteInputs) {
  const typstDependencies = collectTypstDependencyFiles(paths.configTypPath);
  const postCompileTasks = makePostCompileTasks(
    buildData.postSource.typFiles,
    paths.postsMetadataJsonPath,
    paths.routeSlugsJsonPath,
    typstDependencies,
    siteInputs,
  );
  const pageCompileTasks = makePageCompileTasks(
    buildData.pageSource.typFiles,
    buildData.posts,
    buildData.slugMaps,
    paths.postsMetadataJsonPath,
    paths.routeSlugsJsonPath,
    typstDependencies,
    siteInputs,
  );
  const allCompileTasks = [...postCompileTasks, ...pageCompileTasks];
  ensureUniqueOutputTargets(allCompileTasks);
  return allCompileTasks;
}

export function stageStaticAssets(buildData, paths, statusMap, webAppIconFileNames, stageAssetGroup) {
  const siteAssets = walkFiles(ASSETS_DIR, (filePath) => {
    const rel = normalizePosixPath(relative(ASSETS_DIR, filePath));
    return rel !== 'fonts.css' && !rel.startsWith('fonts/') && !webAppIconFileNames.includes(rel);
  });

  stageAssetGroup(ASSETS_DIR, siteAssets, paths.stagingSiteDir, 'assets', statusMap, 'assets:site ');
  stageAssetGroup(POSTS_DIR, buildData.postSource.assetFiles, paths.stagingSiteDir, 'posts', statusMap, 'assets:post ');
  stageAssetGroup(PAGES_DIR, buildData.pageSource.assetFiles, paths.stagingSiteDir, '', statusMap, 'assets:page ');
}

export function stageGeneratedFontAssets(fontBuildResult, stagingSiteDir, statusMap) {
  const { artifactPaths } = fontBuildResult;

  if (existsSync(artifactPaths.cssPath)) {
    stageFileFromSourceOrOutput(
      artifactPaths.cssPath,
      join(stagingSiteDir, 'assets', 'fonts.css'),
      statusMap,
      'assets/fonts.css',
    );
  }

  if (fontBuildResult.mode === 'dev') {
    for (const descriptor of fontBuildResult.sourceAssetDescriptors) {
      const outputRel = normalizePosixPath(`assets/fonts/${descriptor.fileName}`);
      stageFileFromSourceOrOutput(descriptor.sourcePath, join(stagingSiteDir, outputRel), statusMap, outputRel);
    }
    return;
  }

  for (const sourcePath of walkFiles(artifactPaths.outputDir)) {
    const rel = normalizePosixPath(relative(artifactPaths.outputDir, sourcePath));
    const outputRel = normalizePosixPath(`assets/fonts/${rel}`);
    stageFileFromSourceOrOutput(sourcePath, join(stagingSiteDir, outputRel), statusMap, outputRel);
  }
}

export function printBuildSummary({ outputSiteDir, allCompileTasks, statusMap, deletedFiles, posts, slugMaps }) {
  const updatedCount = Array.from(statusMap.values()).filter((value) => value === 'updated').length;
  const unchangedCount = Array.from(statusMap.values()).filter((value) => value === 'unchanged').length;

  console.log('Build succeeded!');
  console.log(`Out: ${outputSiteDir}`);
  console.log(`@ Compiled     : ${allCompileTasks.length}`);
  console.log(`+ Updated    : ${updatedCount}`);
  console.log(`: Unchanged  : ${unchangedCount}`);
  console.log(`- Deleted    : ${deletedFiles.length}`);
  console.log(`= Total      : ${updatedCount + unchangedCount + deletedFiles.length}`);
  console.log('');
  console.log(`- Posts      : ${posts.length}`);
  console.log(`- Tags       : ${Object.keys(slugMaps.tags).length}`);
  console.log(`- Categories : ${Object.keys(slugMaps.categories).length}`);

  if (deletedFiles.length > 0) {
    const preview = deletedFiles.slice(0, 10);
    console.log(`Deleted preview (${preview.length}/${deletedFiles.length}):`);
    for (const rel of preview) {
      console.log(`- ${rel}`);
    }
  }
}
