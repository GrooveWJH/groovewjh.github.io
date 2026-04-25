#!/usr/bin/env node

import process from 'node:process';

import {
  buildAndWriteSharePreview,
  parseSharePreviewArgs,
  printSharePreviewHelp,
  shouldShowSharePreviewHelp,
} from '../index.mjs';

try {
  if (shouldShowSharePreviewHelp()) {
    printSharePreviewHelp();
    process.exit(0);
  }

  const options = parseSharePreviewArgs();
  const result = await buildAndWriteSharePreview(options);

  console.log('Share preview generated!');
  console.log(`Out: ${result.outputSiteDir}`);
  console.log(`Preview: ${result.previewIndexPath}`);
  console.log(`Pages: ${result.manifest.pages.length}`);
} catch (error) {
  console.error('Share preview generation failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
