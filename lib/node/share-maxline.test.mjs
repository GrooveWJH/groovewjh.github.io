import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const ROOT_DIR = '/Users/groove/Project/code/Toolkit/groove-typst-blog';

test('share subsystem maxline guard passes with scoped config', () => {
  const result = spawnSync('node', ['scripts/check-maxline.mjs', '--config', 'check-maxline.share.json'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  assert.equal(
    result.status,
    0,
    `Expected scoped maxline check to pass.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});
