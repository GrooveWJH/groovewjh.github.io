#!/usr/bin/env node

import { fileURLToPath } from 'node:url';

export * from '../font-pipeline/cli/entry.mjs';

import { main } from '../font-pipeline/cli/entry.mjs';

const isDirectRun = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  main();
}
