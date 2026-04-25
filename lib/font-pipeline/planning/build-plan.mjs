import { FONT_CACHE_VERSION, FONT_CSS_OUTPUT_REL, FONT_GENERATOR_VERSION } from '../catalog/specs.mjs';
import { computeContentHash } from './fingerprint.mjs';

export function planFontArtifactBuild({
  subsetDescriptors,
  previousManifest = null,
  artifactExists = () => false,
  reuseCache = true,
  sourceFingerprints = [],
  corpusHashes = {},
  cssText,
  existingCssFingerprint = null,
}) {
  const previousFiles = previousManifest?.files || {};
  const previousCss = previousManifest?.css || null;
  const subsetPlans = subsetDescriptors.map((descriptor) => {
    const previous = previousFiles[descriptor.outputRelPath];
    const shouldBuild =
      !reuseCache ||
      previous == null ||
      previous.fingerprint !== descriptor.fingerprint ||
      !artifactExists(descriptor.outputRelPath);

    return {
      ...descriptor,
      shouldBuild,
    };
  });

  const cssFingerprint = computeContentHash(cssText);
  const shouldWriteCss =
    !reuseCache ||
    previousCss == null ||
    previousCss.fingerprint !== cssFingerprint ||
    existingCssFingerprint !== cssFingerprint ||
    !artifactExists(FONT_CSS_OUTPUT_REL);

  const manifest = {
    version: FONT_CACHE_VERSION,
    generatorVersion: FONT_GENERATOR_VERSION,
    generatedAt: new Date().toISOString(),
    corpusHashes,
    sources: Object.fromEntries(sourceFingerprints.map((fingerprint) => [fingerprint.path, fingerprint])),
    files: Object.fromEntries(
      subsetPlans.map((plan) => [
        plan.outputRelPath,
        {
          fingerprint: plan.fingerprint,
          familyName: plan.familyName,
          slug: plan.slug,
          weight: plan.weight,
          suffix: plan.suffix,
          sourcePath: plan.sourceRelPath,
          sourceHash: plan.sourceHash,
          textHash: plan.textHash,
        },
      ]),
    ),
    css: {
      file: FONT_CSS_OUTPUT_REL,
      fingerprint: cssFingerprint,
    },
  };

  const rebuiltSubsetCount = subsetPlans.filter((plan) => plan.shouldBuild).length;
  const totalSubsetCount = subsetPlans.length;
  const status =
    rebuiltSubsetCount === 0 && !shouldWriteCss
      ? 'cache-hit'
      : rebuiltSubsetCount === totalSubsetCount && shouldWriteCss
        ? 'rebuilt'
        : 'partially-rebuilt';

  return {
    subsetPlans,
    cssPlan: {
      outputRelPath: FONT_CSS_OUTPUT_REL,
      fingerprint: cssFingerprint,
      text: cssText,
      shouldWrite: shouldWriteCss,
    },
    manifest,
    rebuiltSubsetCount,
    totalSubsetCount,
    status,
  };
}
