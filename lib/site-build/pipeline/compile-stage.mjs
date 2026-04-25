import { join } from 'node:path';

import { ensureDirForFile, normalizePosixPath } from '../../foundation/fs.mjs';
import { stageFileFromSourceOrOutput, upsertStatus } from './output.mjs';
import { runPool } from './pool.mjs';
import { createProgressBar } from './progress.mjs';
import { makeTypstCompileArgs, runTypstCompile } from './typst.mjs';

export async function compileAndStageTypstTasks(rootDir, tasks, stagingSiteDir, jobs, statusMap) {
  const compileTasks = tasks.map((task) => ({
    ...task,
    stagingOutputPath: join(stagingSiteDir, task.outputRel),
  }));

  const progressBar = createProgressBar('compile     ', compileTasks.length);
  const results = await runPool(
    compileTasks,
    jobs,
    async (task) => {
      ensureDirForFile(task.stagingOutputPath);
      const args = makeTypstCompileArgs(rootDir, task.sourceTypFile, task.stagingOutputPath, task.inputs);
      const compiled = await runTypstCompile(rootDir, task.sourceTypFile, args, task.kind);
      return compiled.ok ? { ok: true, outputRel: task.outputRel } : { ok: false, message: compiled.message };
    },
    progressBar,
  );

  const errors = results.filter((item) => !item.ok);
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.message).join('\n\n'));
  }

  for (const item of results) {
    upsertStatus(statusMap, item.outputRel, 'updated');
  }
}

export function stageAssetGroup(sourceRoot, sourceFiles, stagingSiteDir, targetPrefix, statusMap, label) {
  const progressBar = createProgressBar(label, sourceFiles.length);

  for (const sourcePath of sourceFiles) {
    const sourceRel = normalizePosixPath(sourcePath.replace(`${sourceRoot}/`, ''));
    const outputRel = targetPrefix ? normalizePosixPath(`${targetPrefix}/${sourceRel}`) : sourceRel;
    stageFileFromSourceOrOutput(sourcePath, join(stagingSiteDir, outputRel), statusMap, outputRel);
    progressBar?.tick();
  }
}
