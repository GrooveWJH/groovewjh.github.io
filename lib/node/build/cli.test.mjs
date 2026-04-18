import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultBuildJobs, parseArgs } from './cli.mjs';

test('defaultBuildJobs reserves two logical CPUs when possible', () => {
  assert.equal(defaultBuildJobs(14), 12);
  assert.equal(defaultBuildJobs(4), 2);
});

test('defaultBuildJobs never returns less than one worker', () => {
  assert.equal(defaultBuildJobs(2), 1);
  assert.equal(defaultBuildJobs(1), 1);
});

test('parseArgs uses explicit --jobs override when provided', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'cli', '--jobs', '7'];

  try {
    const parsed = parseArgs();
    assert.equal(parsed.jobs, 7);
  } finally {
    process.argv = originalArgv;
  }
});

test('parseArgs accepts explicit font mode override', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'cli', '--font-mode', 'release'];

  try {
    const parsed = parseArgs();
    assert.equal(parsed.fontMode, 'release');
  } finally {
    process.argv = originalArgv;
  }
});

test('parseArgs defaults share origin to local', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'cli'];

  try {
    const parsed = parseArgs();
    assert.equal(parsed.shareOrigin, 'local');
  } finally {
    process.argv = originalArgv;
  }
});

test('parseArgs accepts explicit share origin override', () => {
  const originalArgv = process.argv;
  process.argv = ['node', 'cli', '--share-origin', 'prod'];

  try {
    const parsed = parseArgs();
    assert.equal(parsed.shareOrigin, 'prod');
  } finally {
    process.argv = originalArgv;
  }
});
