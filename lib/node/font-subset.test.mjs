import test from 'node:test';
import assert from 'node:assert/strict';

import { dedupeCodepoints, splitBasicAndSiteText } from './font-subset.mjs';
import { findMissingCommands } from './build-fonts.mjs';

test('dedupeCodepoints preserves first-seen codepoint order', () => {
  assert.equal(dedupeCodepoints('abca中中1a'), 'abc中1');
});

test('splitBasicAndSiteText separates ascii basic text from site-specific cjk text', () => {
  const { basicText, siteText } = splitBasicAndSiteText('Hello, 世界！\n#标题 123');

  assert.equal(basicText, 'Helo, \n#123');
  assert.ok(siteText.includes('世'));
  assert.ok(siteText.includes('界'));
  assert.ok(siteText.includes('标'));
  assert.ok(siteText.includes('题'));
  assert.ok(siteText.includes('！'));
  assert.ok(!siteText.includes('H'));
});

test('findMissingCommands returns only commands that are unavailable', () => {
  const missing = findMissingCommands(
    ['pyftsubset', 'woff2_compress', 'typst'],
    (commandName) => commandName !== 'woff2_compress',
  );

  assert.deepEqual(missing, ['woff2_compress']);
});
