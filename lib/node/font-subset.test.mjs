import assert from 'node:assert/strict';
import test from 'node:test';
import * as buildFontsModule from './build-fonts.mjs';
import {
  buildDevelopmentFontCssText,
  computeContentHash,
  computeFontArtifactFingerprint,
  findMissingCommands,
  planFontArtifactBuild,
  resolveFontBuildMode,
  resolvePyftsubsetCommand,
} from './build-fonts.mjs';
import { dedupeCodepoints, splitBasicAndNonBasicText } from './font-subset.mjs';

test('dedupeCodepoints preserves first-seen codepoint order', () => {
  assert.equal(dedupeCodepoints('abca中中1a'), 'abc中1');
});

test('splitBasicAndNonBasicText separates ascii basic text from non-basic site text', () => {
  const { basicText, nonBasicText } = splitBasicAndNonBasicText('Hello, 世界！\n#标题 123');

  assert.equal(basicText, 'Helo, \n#123');
  assert.ok(nonBasicText.includes('世'));
  assert.ok(nonBasicText.includes('界'));
  assert.ok(nonBasicText.includes('标'));
  assert.ok(nonBasicText.includes('题'));
  assert.ok(nonBasicText.includes('！'));
  assert.ok(!nonBasicText.includes('H'));
});

test('findMissingCommands returns only commands that are unavailable', () => {
  const missing = findMissingCommands(
    ['pyftsubset', 'woff2_compress', 'typst'],
    (commandName) => commandName !== 'woff2_compress',
  );

  assert.deepEqual(missing, ['woff2_compress']);
});

test('resolvePyftsubsetCommand prefers pyftsubset when available', () => {
  const command = resolvePyftsubsetCommand((commandName) => {
    if (commandName === 'pyftsubset') return true;
    if (commandName === 'python3-fonttools-subset') return true;
    return false;
  });

  assert.deepEqual(command, ['pyftsubset']);
});

test('resolvePyftsubsetCommand falls back to python3 module execution', () => {
  const command = resolvePyftsubsetCommand((commandName) => commandName === 'python3-fonttools-subset');

  assert.deepEqual(command, ['python3', '-m', 'fontTools.subset']);
});

test('resolvePyftsubsetCommand returns null when no subsetter is available', () => {
  const command = resolvePyftsubsetCommand(() => false);

  assert.equal(command, null);
});

test('computeFontArtifactFingerprint is stable for identical inputs', () => {
  const first = computeFontArtifactFingerprint({
    slug: 'noto-serif-sc',
    weight: 400,
    suffix: 'non-basic',
    sourceHash: 'source-hash',
    textHash: 'text-hash',
  });
  const second = computeFontArtifactFingerprint({
    slug: 'noto-serif-sc',
    weight: 400,
    suffix: 'non-basic',
    sourceHash: 'source-hash',
    textHash: 'text-hash',
  });

  assert.equal(first, second);
});

test('resolveFontBuildMode uses dev locally and release in CI by default', () => {
  assert.equal(resolveFontBuildMode('auto', {}), 'dev');
  assert.equal(resolveFontBuildMode('auto', { CI: 'true' }), 'release');
  assert.equal(resolveFontBuildMode('release', {}), 'release');
});

test('buildDevelopmentFontCssText references original source fonts for dev builds', () => {
  const cssText = buildDevelopmentFontCssText();

  assert.match(cssText, /src: url\("\/assets\/fonts\/NotoSansCJKsc-Regular\.otf"\) format\("opentype"\);/);
  assert.match(cssText, /src: url\("\/assets\/fonts\/Kaiti\.ttf"\) format\("truetype"\);/);
  assert.match(cssText, /font-family: "Site Poem";/);
  assert.match(
    cssText,
    /src: url\("\/assets\/fonts\/NotoSerifCJKsc-Regular\.otf"\) format\("opentype"\);[\s\S]*unicode-range: U\+0009-000D, U\+0020-007E;/,
  );
  assert.match(
    cssText,
    /src: url\("\/assets\/fonts\/Kaiti\.ttf"\) format\("truetype"\), local\("KaiTi"\), local\("Kaiti SC"\), local\("STKaiti"\), local\("Kai"\), local\("LXGW WenKai"\);[\s\S]*unicode-range: U\+0080-10FFFF;/,
  );
});

test('buildFontCssText uses non-basic subset naming and unicode ranges for release fonts', () => {
  assert.equal(typeof buildFontsModule.buildFontCssText, 'function');
  const cssText = buildFontsModule.buildFontCssText();

  assert.doesNotMatch(cssText, /site-cjk/);
  assert.match(
    cssText,
    /url\("\/assets\/fonts\/noto-serif-sc-non-basic-400\.woff2"\) format\("woff2"\);[\s\S]*unicode-range: U\+0080-10FFFF;/,
  );
  assert.match(
    cssText,
    /font-family: "Site Poem";[\s\S]*src: url\("\/assets\/fonts\/site-kai-non-basic-400\.woff2"\) format\("woff2"\), local\("KaiTi"\), local\("Kaiti SC"\), local\("STKaiti"\), local\("Kai"\), local\("LXGW WenKai"\);[\s\S]*unicode-range: U\+0080-10FFFF;/,
  );
});

test('planFontArtifactBuild cache hit when manifest and files match', () => {
  const cssText = 'css-text';
  const subsetDescriptors = [
    {
      familyName: 'Site Noto Serif',
      slug: 'noto-serif-sc',
      weight: 400,
      suffix: 'non-basic',
      sourceRelPath: 'fonts-src/NotoSerifCJKsc-Regular.otf',
      sourceHash: 'source-a',
      textHash: 'text-a',
      outputRelPath: 'fonts/noto-serif-sc-non-basic-400.woff2',
      fingerprint: 'fp-a',
    },
  ];

  const plan = planFontArtifactBuild({
    subsetDescriptors,
    previousManifest: {
      files: {
        'fonts/noto-serif-sc-non-basic-400.woff2': { fingerprint: 'fp-a' },
      },
      css: { fingerprint: computeContentHash(cssText) },
    },
    artifactExists: () => true,
    reuseCache: true,
    sourceFingerprints: [
      {
        path: 'fonts-src/NotoSerifCJKsc-Regular.otf',
        size: 10,
        mtimeMs: 20,
        hash: 'source-a',
      },
    ],
    corpusHashes: { site: 'site-hash', poem: 'poem-hash' },
    cssText,
    existingCssFingerprint: computeContentHash(cssText),
  });

  assert.equal(plan.subsetPlans[0].shouldBuild, false);
  assert.equal(plan.status, 'cache-hit');
});

test('planFontArtifactBuild invalidates only changed subset fingerprints', () => {
  const subsetDescriptors = [
    {
      familyName: 'Site Noto Serif',
      slug: 'noto-serif-sc',
      weight: 400,
      suffix: 'basic',
      sourceRelPath: 'fonts-src/NotoSerifCJKsc-Regular.otf',
      sourceHash: 'source-1',
      textHash: 'text-1',
      outputRelPath: 'fonts/noto-serif-sc-basic-400.woff2',
      fingerprint: 'fp-1-new',
    },
    {
      familyName: 'Site Noto Serif',
      slug: 'noto-serif-sc',
      weight: 400,
      suffix: 'non-basic',
      sourceRelPath: 'fonts-src/NotoSerifCJKsc-Regular.otf',
      sourceHash: 'source-1',
      textHash: 'text-2',
      outputRelPath: 'fonts/noto-serif-sc-non-basic-400.woff2',
      fingerprint: 'fp-2',
    },
  ];

  const plan = planFontArtifactBuild({
    subsetDescriptors,
    previousManifest: {
      files: {
        'fonts/noto-serif-sc-basic-400.woff2': { fingerprint: 'fp-1-old' },
        'fonts/noto-serif-sc-non-basic-400.woff2': { fingerprint: 'fp-2' },
      },
      css: { fingerprint: 'css-fp' },
    },
    artifactExists: () => true,
    reuseCache: true,
    sourceFingerprints: [
      {
        path: 'fonts-src/NotoSerifCJKsc-Regular.otf',
        size: 10,
        mtimeMs: 20,
        hash: 'source-1',
      },
    ],
    corpusHashes: { site: 'site-hash', poem: 'poem-hash' },
    cssText: 'css-text',
  });

  assert.equal(plan.subsetPlans[0].shouldBuild, true);
  assert.equal(plan.subsetPlans[1].shouldBuild, false);
  assert.equal(plan.status, 'partially-rebuilt');
});

test('planFontArtifactBuild rewrites css when on-disk css fingerprint differs', () => {
  const cssText = 'release-css';
  const subsetDescriptors = [
    {
      familyName: 'Site Noto Serif',
      slug: 'noto-serif-sc',
      weight: 400,
      suffix: 'non-basic',
      sourceRelPath: 'fonts-src/NotoSerifCJKsc-Regular.otf',
      sourceHash: 'source-a',
      textHash: 'text-a',
      outputRelPath: 'fonts/noto-serif-sc-non-basic-400.woff2',
      fingerprint: 'fp-a',
    },
  ];

  const plan = planFontArtifactBuild({
    subsetDescriptors,
    previousManifest: {
      files: {
        'fonts/noto-serif-sc-non-basic-400.woff2': { fingerprint: 'fp-a' },
      },
      css: { fingerprint: computeContentHash(cssText) },
    },
    artifactExists: () => true,
    reuseCache: true,
    sourceFingerprints: [
      {
        path: 'fonts-src/NotoSerifCJKsc-Regular.otf',
        size: 10,
        mtimeMs: 20,
        hash: 'source-a',
      },
    ],
    corpusHashes: { site: 'site-hash', poem: 'poem-hash' },
    cssText,
    existingCssFingerprint: 'dev-css-fingerprint',
  });

  assert.equal(plan.cssPlan.shouldWrite, true);
  assert.equal(plan.status, 'partially-rebuilt');
});

test('planFontArtifactBuild rebuilds missing files even if manifest matches', () => {
  const subsetDescriptors = [
    {
      familyName: 'Site Kai',
      slug: 'site-kai',
      weight: 400,
      suffix: 'non-basic',
      sourceRelPath: 'fonts-src/Kaiti.ttf',
      sourceHash: 'kai-source',
      textHash: 'kai-text',
      outputRelPath: 'fonts/site-kai-non-basic-400.woff2',
      fingerprint: 'kai-fp',
    },
  ];

  const plan = planFontArtifactBuild({
    subsetDescriptors,
    previousManifest: {
      files: {
        'fonts/site-kai-non-basic-400.woff2': { fingerprint: 'kai-fp' },
      },
      css: { fingerprint: 'css-fp' },
    },
    artifactExists: (outputRelPath) => outputRelPath !== 'fonts/site-kai-non-basic-400.woff2',
    reuseCache: true,
    sourceFingerprints: [
      {
        path: 'fonts-src/Kaiti.ttf',
        size: 10,
        mtimeMs: 20,
        hash: 'kai-source',
      },
    ],
    corpusHashes: { site: 'site-hash', poem: 'poem-hash' },
    cssText: 'css-text',
  });

  assert.equal(plan.subsetPlans[0].shouldBuild, true);
});
