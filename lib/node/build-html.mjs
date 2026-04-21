#!/usr/bin/env node

import process from 'node:process';
import { parseArgs } from './build/cli.mjs';
import { buildSite } from './build/core.mjs';

try {
  // 解析 CLI 参数并执行完整构建流程
  const options = parseArgs();
  await buildSite(options);
} catch (error) {
  console.error('Build failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
