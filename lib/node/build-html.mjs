#!/usr/bin/env node

import { rmSync } from "node:fs";
import process from "node:process";
import { ROOT_DIR } from "./build/constants.mjs";
import { parseArgs } from "./build/cli.mjs";
import { buildSite } from "./build/core.mjs";
import { resolveSafeBuildSubdir } from "./build/helpers.mjs";

let options = null;
let safeCacheRootPath = null;

try {
  // 解析 CLI 参数并执行完整构建流程
  options = parseArgs();
  safeCacheRootPath = resolveSafeBuildSubdir(ROOT_DIR, options.cacheRoot, "--cache-root").resolvedPath;
  await buildSite(options);
} catch (error) {
  console.error("Build failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  // 清理缓存目录，避免残留临时文件
  if (safeCacheRootPath) {
    rmSync(safeCacheRootPath, { recursive: true, force: true });
  }
}
