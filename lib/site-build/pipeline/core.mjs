import { mkdirSync, rmSync } from 'node:fs';
import { buildFontArtifacts } from '../../font-pipeline/cli/entry.mjs';
import { ROOT_DIR } from '../../foundation/paths.mjs';
import { buildSlugMap, finalizeOutput, listDeletedFiles } from '../../node/build/helpers.mjs';
import { SITE_CONFIG_FILE_NAME, stageRss } from '../publish/rss.mjs';
import { normalizeShareMetadataForSite } from '../publish/share/index.mjs';
import { stageWebAppArtifacts, WEBAPP_ICON_FILE_NAMES } from '../webapp/stage.mjs';
import {
  buildCompileTaskSet,
  collectBuildData,
  prepareBuildPaths,
  printBuildSummary,
  stageGeneratedFontAssets,
  stageStaticAssets,
} from './build-data.mjs';
import { compileAndStageTypstTasks, stageAssetGroup } from './compile-stage.mjs';
import { readSiteConfigInputs, resolveActiveShareSiteUrl } from './site-inputs.mjs';
import { logPhase, runTimedStep, runTimedStepSync } from './timing.mjs';

// 构建主流程：采集 metadata -> 编译页面 -> 合并资源 -> 原子切换输出目录。
export async function buildSite({ outDirName, jobs, configPath, cacheRoot, fontMode, shareOrigin }) {
  const buildStartedAt = Date.now();
  const { paths, outputSiteDir } = prepareBuildPaths({
    outDirName,
    configPath,
    cacheRoot,
    siteConfigFileName: SITE_CONFIG_FILE_NAME,
  });
  const configuredSiteInputs = readSiteConfigInputs(paths.siteConfigPath);
  const statusMap = new Map();

  try {
    const prepareStep = runTimedStepSync('prepare', () => {
      rmSync(paths.transientRoot, { recursive: true, force: true });
      mkdirSync(paths.stagingSiteDir, { recursive: true });
      mkdirSync(paths.metadataCacheDir, { recursive: true });
    });
    logPhase('prepare', prepareStep.durationMs, `(jobs=${jobs})`);

    const fontsStep = runTimedStepSync('fonts', () =>
      buildFontArtifacts({
        cacheRoot: paths.cacheRoot,
        mode: fontMode,
      }),
    );
    logPhase('fonts', fontsStep.durationMs, `(${fontsStep.result.status})`);

    const siteInputs = {
      ...configuredSiteInputs,
      activeSiteUrl: resolveActiveShareSiteUrl(configuredSiteInputs, shareOrigin),
      fontMode: fontsStep.result.mode,
    };

    const metadataStep = await runTimedStep('metadata', () => collectBuildData(paths, jobs, buildSlugMap));
    const buildData = metadataStep.result;
    logPhase('metadata', metadataStep.durationMs, `(${buildData.posts.length} posts)`);

    const taskStep = runTimedStepSync('tasks', () => buildCompileTaskSet(buildData, paths, siteInputs));
    const allCompileTasks = taskStep.result;
    logPhase('tasks', taskStep.durationMs, `(${allCompileTasks.length} outputs)`);

    const compileStep = await runTimedStep('compile', () =>
      compileAndStageTypstTasks(ROOT_DIR, allCompileTasks, paths.stagingSiteDir, jobs, statusMap),
    );
    logPhase('compile', compileStep.durationMs, `(${allCompileTasks.length} outputs)`);

    const shareStep = runTimedStepSync('share', () => {
      normalizeShareMetadataForSite({
        stagingSiteDir: paths.stagingSiteDir,
        compileTasks: allCompileTasks,
        posts: buildData.posts,
        siteInputs,
        statusMap,
      });
    });
    logPhase('share', shareStep.durationMs, `(${allCompileTasks.length} outputs)`);

    const assetsStep = runTimedStepSync('assets', () => {
      stageWebAppArtifacts(paths.stagingSiteDir, statusMap, siteInputs);
      stageStaticAssets(buildData, paths, statusMap, WEBAPP_ICON_FILE_NAMES, stageAssetGroup);
      stageGeneratedFontAssets(fontsStep.result, paths.stagingSiteDir, statusMap);
    });
    logPhase(
      'assets',
      assetsStep.durationMs,
      `(${buildData.postSource.assetFiles.length} post, ${buildData.pageSource.assetFiles.length} page assets)`,
    );

    const rssStep = runTimedStepSync('rss', () => {
      stageRss(buildData.posts, outputSiteDir, paths.stagingSiteDir, paths.siteConfigPath, statusMap);
    });
    logPhase('rss', rssStep.durationMs);

    const finalizeStep = runTimedStepSync('finalize', () => {
      const deletedFiles = listDeletedFiles(outputSiteDir, statusMap.keys());
      finalizeOutput(paths.stagingSiteDir, outputSiteDir);
      return deletedFiles;
    });
    const deletedFiles = finalizeStep.result;
    logPhase('finalize', finalizeStep.durationMs, `(${deletedFiles.length} deleted)`);

    printBuildSummary({
      outputSiteDir,
      allCompileTasks,
      statusMap,
      deletedFiles,
      posts: buildData.posts,
      slugMaps: buildData.slugMaps,
    });
    logPhase('total', Date.now() - buildStartedAt);
    return {
      outputSiteDir,
      posts: buildData.posts,
      slugMaps: buildData.slugMaps,
      siteInputs,
    };
  } finally {
    rmSync(paths.transientRoot, { recursive: true, force: true });
  }
}
