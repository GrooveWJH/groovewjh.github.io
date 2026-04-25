import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeFontArtifactFingerprint,
  findMissingCommands,
  resolveFontBuildMode,
  resolvePyftsubsetCommand,
} from '../../../node/build-fonts.mjs';

test('findMissingCommands returns only commands that are unavailable', () => {
  const missing = findMissingCommands(
    ['pyftsubset', 'woff2_compress', 'typst'],
    (commandName) => commandName !== 'woff2_compress',
  );

  assert.deepEqual(missing, ['woff2_compress']);
});

test('resolvePyftsubsetCommand prefers pyftsubset when available', () => {
  const command = resolvePyftsubsetCommand(
    (commandName) => commandName === 'pyftsubset' || commandName === 'python3-fonttools-subset',
  );

  assert.deepEqual(command, ['pyftsubset']);
});

test('resolvePyftsubsetCommand falls back to python3 module execution', () => {
  const command = resolvePyftsubsetCommand((commandName) => commandName === 'python3-fonttools-subset');

  assert.deepEqual(command, ['python3', '-m', 'fontTools.subset']);
});

test('resolvePyftsubsetCommand returns null when no subsetter is available', () => {
  assert.equal(
    resolvePyftsubsetCommand(() => false),
    null,
  );
});

test('computeFontArtifactFingerprint is stable for identical inputs', () => {
  const input = {
    slug: 'noto-serif-sc',
    weight: 400,
    suffix: 'non-basic',
    sourceHash: 'source-hash',
    textHash: 'text-hash',
  };

  assert.equal(computeFontArtifactFingerprint(input), computeFontArtifactFingerprint(input));
});

test('resolveFontBuildMode uses dev locally and release in CI by default', () => {
  assert.equal(resolveFontBuildMode('auto', {}), 'dev');
  assert.equal(resolveFontBuildMode('auto', { CI: 'true' }), 'release');
  assert.equal(resolveFontBuildMode('release', {}), 'release');
});
