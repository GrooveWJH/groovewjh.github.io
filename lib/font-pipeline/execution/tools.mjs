import { spawnSync } from 'node:child_process';

import { ROOT_DIR } from '../../node/build/constants.mjs';

function defaultCommandExists(commandName) {
  if (commandName === 'python3-fonttools-subset') {
    const result = spawnSync('python3', ['-m', 'fontTools.subset', '--help'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
    return result.status === 0;
  }

  const result = spawnSync('bash', ['-lc', `command -v ${commandName}`], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  return result.status === 0;
}

export function findMissingCommands(commandNames, commandExists = defaultCommandExists) {
  return commandNames.filter((commandName) => !commandExists(commandName));
}

export function resolvePyftsubsetCommand(commandExists = defaultCommandExists) {
  if (commandExists('pyftsubset')) {
    return ['pyftsubset'];
  }

  if (commandExists('python3-fonttools-subset')) {
    return ['python3', '-m', 'fontTools.subset'];
  }

  return null;
}

export function ensureBuildToolsExist() {
  const missing = [];
  if (resolvePyftsubsetCommand() == null) {
    missing.push('pyftsubset or python3 -m fontTools.subset');
  }
  missing.push(...findMissingCommands(['woff2_compress']));

  if (missing.length > 0) {
    throw new Error(
      `Missing font build tools:\n- ${missing.join('\n- ')}\nInstall the required dependencies before running npm run fonts:build.`,
    );
  }
}
