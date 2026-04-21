import { ensureWebAppIconAssets } from '../lib/node/build/webapp.mjs';

const builtAssets = ensureWebAppIconAssets();
process.stdout.write(`Generated ${builtAssets.length} Web App icon assets.\n`);
