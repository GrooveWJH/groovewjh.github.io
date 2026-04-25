import assert from 'node:assert/strict';
import test from 'node:test';

import { dedupeCodepoints, splitBasicAndNonBasicText } from '../../planning/subset-text.mjs';

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
