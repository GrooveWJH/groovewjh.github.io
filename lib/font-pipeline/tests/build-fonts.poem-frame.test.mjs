import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubsetDescriptors } from '../../node/build-fonts.mjs';
import { collectPublishedPoemFrameCorpusText } from '../corpus/poem-frame.mjs';

const FONT_SOURCE_FINGERPRINTS = [
  'fonts-src/Kaiti.ttf',
  'fonts-src/NotoSansCJKsc-Bold.otf',
  'fonts-src/NotoSansCJKsc-Regular.otf',
  'fonts-src/NotoSansMonoCJKsc-Bold.otf',
  'fonts-src/NotoSansMonoCJKsc-Regular.otf',
  'fonts-src/NotoSerifCJKsc-Bold.otf',
  'fonts-src/NotoSerifCJKsc-Regular.otf',
].map((path) => ({
  path,
  size: 1,
  mtimeMs: 1,
  hash: `${path}-hash`,
}));

test('buildSubsetDescriptors feeds published poem-frame and poem header glyphs into Site Kai non-basic subset input', () => {
  const poemCorpusText = collectPublishedPoemFrameCorpusText();
  const descriptors = buildSubsetDescriptors(FONT_SOURCE_FINGERPRINTS, '', poemCorpusText);
  const kaiNonBasic = descriptors.find(
    (descriptor) => descriptor.slug === 'site-kai' && descriptor.suffix === 'non-basic' && descriptor.weight === 400,
  );

  assert.ok(kaiNonBasic, 'Expected Site Kai non-basic subset descriptor.');
  assert.match(kaiNonBasic.textValue, /而如果轮回可以继续下去/);
  for (const char of '果轮可继续做狮只绵羊棵石千') {
    assert.ok(kaiNonBasic.textValue.includes(char), `Expected Site Kai subset text to include "${char}".`);
  }
  for (const char of '献片理诗掩毕五尾毁柱看狂') {
    assert.ok(
      kaiNonBasic.textValue.includes(char),
      `Expected Site Kai subset text to include poem header glyph "${char}".`,
    );
  }
});
