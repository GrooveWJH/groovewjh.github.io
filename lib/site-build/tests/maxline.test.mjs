import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

test('site-build maxline guard passes with subsystem thresholds', () => {
  const result = spawnSync('node', ['.config/maxline/check.mjs', '--config', '.config/maxline/site-build.json'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected site-build maxline check to pass.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
