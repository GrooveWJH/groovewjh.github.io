import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { PROJECT_TEMP_ROOT, ROOT_DIR, createTempDir, cleanupTempDir } from "./test-helpers/typst-test-helpers.mjs";

test("content subsystem maxline guard passes with scoped config", () => {
  const result = spawnSync("node", ["scripts/check-maxline.mjs", "--config", "check-maxline.content.json"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `Expected content maxline check to pass.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
});

test("project temp helpers place .tmp prefixes under the .tmp directory", () => {
  const tempDir = createTempDir(".tmp-helper-check-");

  assert.equal(dirname(tempDir), PROJECT_TEMP_ROOT);
  cleanupTempDir(tempDir);
});
