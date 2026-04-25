import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { basename, relative } from 'node:path';

import { ensureDirForFile, normalizePosixPath, walkFiles } from '../../foundation/fs.mjs';

export function upsertStatus(statusMap, relPath, status) {
  const key = normalizePosixPath(relPath);
  const current = statusMap.get(key);

  if (!current) {
    statusMap.set(key, status);
    return;
  }

  if (current !== 'updated' && status === 'updated') {
    statusMap.set(key, 'updated');
  }
}

export function stageFileFromSourceOrOutput(sourcePath, stagingPath, statusMap, relPath) {
  ensureDirForFile(stagingPath);
  cpSync(sourcePath, stagingPath, { force: true });
  upsertStatus(statusMap, relPath, 'updated');
}

export function listDeletedFiles(outputSiteDir, retainedRelPaths) {
  if (!existsSync(outputSiteDir)) {
    return [];
  }

  const retained = new Set(Array.from(retainedRelPaths, (value) => normalizePosixPath(value)));
  const deleted = [];

  for (const filePath of walkFiles(outputSiteDir)) {
    const rel = normalizePosixPath(relative(outputSiteDir, filePath));
    if (!retained.has(rel)) {
      deleted.push(rel);
    }
  }

  deleted.sort((a, b) => a.localeCompare(b));
  return deleted;
}

export function finalizeOutput(stagingDir, outputDir) {
  rmSync(outputDir, { recursive: true, force: true });

  try {
    renameSync(stagingDir, outputDir);
  } catch {
    mkdirSync(outputDir, { recursive: true });
    cpSync(stagingDir, outputDir, { recursive: true, force: true });
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

export function removeStaleNamedFiles(outputDir, retainedOutputRelPaths, extension = '.woff2') {
  if (!existsSync(outputDir)) {
    return;
  }

  const retained = new Set(retainedOutputRelPaths.map((relPath) => basename(relPath)));
  for (const filePath of walkFiles(outputDir)) {
    if (filePath.toLowerCase().endsWith(extension) && !retained.has(basename(filePath))) {
      rmSync(filePath, { force: true });
    }
  }
}
