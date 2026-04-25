import assert from 'node:assert/strict';
import test from 'node:test';

import * as buildFontsModule from '../../../node/build-fonts.mjs';
import { buildDevelopmentFontCssText, computeContentHash, planFontArtifactBuild } from '../../../node/build-fonts.mjs';

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
