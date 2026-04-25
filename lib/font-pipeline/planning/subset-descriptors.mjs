import { BASIC_ASCII_TEXT, FONT_FILES_DIRNAME, FONT_SPECS } from '../catalog/specs.mjs';
import { computeContentHash, computeFontArtifactFingerprint } from './fingerprint.mjs';
import { buildSourceFingerprintMap } from './source-fingerprints.mjs';
import { dedupeCodepoints, splitBasicAndNonBasicText } from './subset-text.mjs';

export function buildSubsetDescriptors(sourceFingerprints, siteCorpusText, poemCorpusText) {
  const sourceByPath = buildSourceFingerprintMap(sourceFingerprints);
  const { basicText, nonBasicText } = splitBasicAndNonBasicText(siteCorpusText);
  const { basicText: poemBasicText, nonBasicText: poemNonBasicText } = splitBasicAndNonBasicText(poemCorpusText);
  const descriptors = [];

  for (const spec of FONT_SPECS) {
    for (const [weight, sourcePath] of Object.entries(spec.source)) {
      const sourceFingerprint = sourceByPath.get(sourcePath);
      const subsetInputs =
        spec.slug === 'site-kai'
          ? [
              { suffix: 'basic', text: BASIC_ASCII_TEXT + poemBasicText },
              { suffix: 'non-basic', text: poemNonBasicText },
            ]
          : [
              { suffix: 'basic', text: BASIC_ASCII_TEXT + basicText },
              { suffix: 'non-basic', text: nonBasicText },
            ];

      for (const subset of subsetInputs) {
        const textValue = dedupeCodepoints(subset.text);
        const textHash = computeContentHash(textValue);
        const outputFileName = `${spec.slug}-${subset.suffix}-${weight}.woff2`;
        const outputRelPath = `${FONT_FILES_DIRNAME}/${outputFileName}`;
        descriptors.push({
          familyName: spec.familyName,
          slug: spec.slug,
          weight: Number(weight),
          suffix: subset.suffix,
          sourcePath,
          sourceRelPath: sourceFingerprint.path,
          sourceHash: sourceFingerprint.hash,
          textValue,
          textHash,
          outputFileName,
          outputRelPath,
          fingerprint: computeFontArtifactFingerprint({
            slug: spec.slug,
            weight,
            suffix: subset.suffix,
            sourceHash: sourceFingerprint.hash,
            textHash,
          }),
        });
      }
    }
  }

  return descriptors;
}
