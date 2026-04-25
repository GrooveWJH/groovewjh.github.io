import { ROOT_DIR } from '../../node/build/constants.mjs';
import { resolveSafeBuildSubdir } from '../../node/build/helpers.mjs';
import { getDevelopmentFontAssetDescriptors } from '../catalog/development-assets.mjs';
import { getFontArtifactPaths, resolveFontBuildMode } from '../catalog/specs.mjs';
import { collectCorpusText, collectPoemCorpusText } from '../corpus/site-text.mjs';
import { buildDevelopmentFontCssText, buildFontCssText } from '../emit/css.mjs';
import { buildFontArtifacts } from '../execution/build.mjs';
import { ensureBuildToolsExist, findMissingCommands, resolvePyftsubsetCommand } from '../execution/tools.mjs';
import { planFontArtifactBuild } from '../planning/build-plan.mjs';
import { computeContentHash, computeFontArtifactFingerprint } from '../planning/fingerprint.mjs';
import { collectSourceFingerprints, ensureSourcesExist } from '../planning/source-fingerprints.mjs';
import { buildSubsetDescriptors } from '../planning/subset-descriptors.mjs';
import { parseCliArgs } from './args.mjs';

export {
  buildDevelopmentFontCssText,
  buildFontArtifacts,
  buildFontCssText,
  buildSubsetDescriptors,
  collectCorpusText,
  collectPoemCorpusText,
  collectSourceFingerprints,
  computeContentHash,
  computeFontArtifactFingerprint,
  ensureBuildToolsExist,
  ensureSourcesExist,
  findMissingCommands,
  getDevelopmentFontAssetDescriptors,
  getFontArtifactPaths,
  parseCliArgs,
  planFontArtifactBuild,
  resolveFontBuildMode,
  resolvePyftsubsetCommand,
};

export function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  const resolvedCacheRoot = resolveSafeBuildSubdir(ROOT_DIR, options.cacheRoot, '--cache-root').resolvedPath;
  buildFontArtifacts({
    cacheRoot: resolvedCacheRoot,
    reuseCache: !options.force,
  });
}
