import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT_DIR } from '../../node/build/constants.mjs';
import { resolveSafeBuildSubdir } from '../../node/build/helpers.mjs';
import { getDevelopmentFontAssetDescriptors } from '../catalog/development-assets.mjs';
import { DEFAULT_CACHE_ROOT, getFontArtifactPaths, resolveFontBuildMode } from '../catalog/specs.mjs';
import { collectCorpusText, collectPoemCorpusText } from '../corpus/site-text.mjs';
import { buildDevelopmentFontCssText, buildFontCssText } from '../emit/css.mjs';
import { planFontArtifactBuild } from '../planning/build-plan.mjs';
import { computeContentHash } from '../planning/fingerprint.mjs';
import { collectSourceFingerprints, ensureSourcesExist } from '../planning/source-fingerprints.mjs';
import { buildSubsetDescriptors } from '../planning/subset-descriptors.mjs';
import { loadPreviousManifest, syncFontArtifacts } from './sync.mjs';
import { ensureBuildToolsExist } from './tools.mjs';

function formatDurationMs(durationMs) {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

function logBuildStatus(result, logger, durationMs) {
  const durationText = formatDurationMs(durationMs);
  if (result.status === 'cache-hit') {
    logger.log(`Font artifacts cache hit. (${durationText})`);
    return;
  }

  if (result.status === 'rebuilt') {
    logger.log(
      `Font artifacts rebuilt: ${result.rebuiltSubsetCount}/${result.totalSubsetCount} subsets. (${durationText})`,
    );
    return;
  }

  logger.log(
    `Font artifacts partially rebuilt: ${result.rebuiltSubsetCount}/${result.totalSubsetCount} subsets. (${durationText})`,
  );
}

export function buildFontArtifacts({ cacheRoot, reuseCache = true, logger = console, mode = 'auto' } = {}) {
  const startedAt = Date.now();
  const resolvedMode = resolveFontBuildMode(mode);
  ensureSourcesExist();

  const resolvedCacheRoot = cacheRoot
    ? cacheRoot
    : resolveSafeBuildSubdir(ROOT_DIR, DEFAULT_CACHE_ROOT, '--cache-root').resolvedPath;
  const artifactPaths = getFontArtifactPaths(resolvedCacheRoot);

  if (resolvedMode === 'dev') {
    const devArtifactPaths = {
      ...artifactPaths,
      cssPath: join(artifactPaths.artifactRoot, 'fonts.dev.css'),
    };
    mkdirSync(devArtifactPaths.artifactRoot, { recursive: true });
    writeFileSync(devArtifactPaths.cssPath, buildDevelopmentFontCssText(), 'utf8');
    const durationMs = Date.now() - startedAt;
    logger.log(`Font source assets ready (dev mode). (${formatDurationMs(durationMs)})`);

    return {
      mode: resolvedMode,
      status: 'dev',
      rebuiltSubsetCount: 0,
      totalSubsetCount: 0,
      durationMs,
      artifactPaths: devArtifactPaths,
      sourceAssetDescriptors: getDevelopmentFontAssetDescriptors(),
    };
  }

  ensureBuildToolsExist();
  const previousManifest = loadPreviousManifest(artifactPaths.manifestPath);
  const existingCssFingerprint = existsSync(artifactPaths.cssPath)
    ? computeContentHash(readFileSync(artifactPaths.cssPath, 'utf8'))
    : null;
  const siteCorpusText = collectCorpusText();
  const poemCorpusText = collectPoemCorpusText();
  const sourceFingerprints = collectSourceFingerprints();
  const subsetDescriptors = buildSubsetDescriptors(sourceFingerprints, siteCorpusText, poemCorpusText);
  const cssText = buildFontCssText();

  const buildPlan = planFontArtifactBuild({
    subsetDescriptors,
    previousManifest,
    artifactExists: (outputRelPath) => existsSync(join(artifactPaths.artifactRoot, outputRelPath)),
    reuseCache,
    sourceFingerprints,
    corpusHashes: {
      site: computeContentHash(siteCorpusText),
      poem: computeContentHash(poemCorpusText),
    },
    cssText,
    existingCssFingerprint,
  });

  syncFontArtifacts(buildPlan, artifactPaths);
  const durationMs = Date.now() - startedAt;
  logBuildStatus(buildPlan, logger, durationMs);

  return {
    mode: resolvedMode,
    status: buildPlan.status,
    rebuiltSubsetCount: buildPlan.rebuiltSubsetCount,
    totalSubsetCount: buildPlan.totalSubsetCount,
    durationMs,
    artifactPaths,
    sourceAssetDescriptors: [],
  };
}
