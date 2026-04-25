import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

import { ROOT_DIR } from '../../node/build/constants.mjs';
import { walkFiles } from '../../node/build/helpers.mjs';
import { createProjectTempDir } from '../../node/tmp-dir.mjs';
import { FONT_CACHE_VERSION, FONT_GENERATOR_VERSION } from '../catalog/specs.mjs';
import { resolvePyftsubsetCommand } from './tools.mjs';

export function loadPreviousManifest(manifestPath) {
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (parsed.version !== FONT_CACHE_VERSION || parsed.generatorVersion !== FONT_GENERATOR_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function runPyftsubset(sourcePath, outputPath, textValue, tempDir) {
  const subsetCommand = resolvePyftsubsetCommand();
  if (subsetCommand == null) {
    throw new Error('No available font subset command found.');
  }

  const textFilePath = join(tempDir, `${basename(outputPath, '.woff2')}.txt`);
  writeFileSync(textFilePath, textValue, 'utf8');

  const subsetTempPath = `${outputPath}.subset${extname(sourcePath)}`;
  const result = spawnSync(
    subsetCommand[0],
    [
      ...subsetCommand.slice(1),
      sourcePath,
      `--output-file=${subsetTempPath}`,
      `--text-file=${textFilePath}`,
      '--layout-features=*',
      '--passthrough-tables',
      '--ignore-missing-glyphs',
      '--ignore-missing-unicodes',
      '--name-IDs=*',
      '--name-legacy',
      '--name-languages=*',
      '--glyph-names',
      '--symbol-cmap',
      '--legacy-cmap',
      '--notdef-glyph',
      '--notdef-outline',
    ],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `${subsetCommand.join(' ')} failed for ${sourcePath}\n${(result.stderr || result.stdout || '').trim()}`,
    );
  }

  const compressResult = spawnSync('woff2_compress', [subsetTempPath], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });

  if (compressResult.status !== 0) {
    throw new Error(
      `woff2_compress failed for ${subsetTempPath}\n${(compressResult.stderr || compressResult.stdout || '').trim()}`,
    );
  }

  const compressedPath = subsetTempPath.replace(/\.(otf|ttf)$/i, '.woff2');
  renameSync(compressedPath, outputPath);
  rmSync(subsetTempPath, { force: true });
}

function removeStaleSubsetFiles(outputDir, retainedOutputRelPaths) {
  if (!existsSync(outputDir)) {
    return;
  }

  const retained = new Set(retainedOutputRelPaths.map((relPath) => basename(relPath)));
  const currentFiles = walkFiles(outputDir).filter((filePath) => extname(filePath).toLowerCase() === '.woff2');

  for (const filePath of currentFiles) {
    if (!retained.has(basename(filePath))) {
      rmSync(filePath, { force: true });
    }
  }
}

export function syncFontArtifacts(buildPlan, artifactPaths) {
  mkdirSync(artifactPaths.artifactRoot, { recursive: true });
  mkdirSync(artifactPaths.outputDir, { recursive: true });

  const tempDir = createProjectTempDir(ROOT_DIR, 'groove-fonts-');

  try {
    for (const plan of buildPlan.subsetPlans) {
      if (plan.shouldBuild) {
        runPyftsubset(plan.sourcePath, join(artifactPaths.outputDir, plan.outputFileName), plan.textValue, tempDir);
      }
    }

    if (buildPlan.cssPlan.shouldWrite) {
      writeFileSync(artifactPaths.cssPath, buildPlan.cssPlan.text, 'utf8');
    }

    removeStaleSubsetFiles(
      artifactPaths.outputDir,
      buildPlan.subsetPlans.map((plan) => plan.outputRelPath),
    );
    writeFileSync(artifactPaths.manifestPath, `${JSON.stringify(buildPlan.manifest, null, 2)}\n`, 'utf8');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
