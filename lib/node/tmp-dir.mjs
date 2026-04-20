import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";

export function ensureProjectTempRoot(rootDir) {
  const tempRoot = join(rootDir, ".tmp");
  mkdirSync(tempRoot, { recursive: true });
  return tempRoot;
}

export function createProjectTempDir(rootDir, prefix) {
  const tempRoot = ensureProjectTempRoot(rootDir);
  return mkdtempSync(join(tempRoot, prefix));
}
