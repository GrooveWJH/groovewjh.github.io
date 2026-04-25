import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

test('browser chrome maxline guard passes with a 350-line scoped config', () => {
  const result = spawnSync('node', ['.config/maxline/check.mjs', '--config', '.config/maxline/chrome.json'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected browser chrome maxline check to pass.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
