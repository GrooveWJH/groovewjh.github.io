#!/usr/bin/env node

import process from 'node:process';
import { buildSite } from '../pipeline/core.mjs';
import { parseArgs } from './args.mjs';

try {
  const options = parseArgs();
  await buildSite(options);
} catch (error) {
  console.error('Build failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
