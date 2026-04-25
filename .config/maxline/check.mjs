#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

function parseArgs(argv) {
  const options = {
    configPath: null,
    targets: [],
    extensions: [],
    excludeDirs: [],
    maxLines: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--config') {
      options.configPath = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--target') {
      options.targets.push(argv[index + 1] || '');
      index += 1;
      continue;
    }

    if (arg === '--ext') {
      options.extensions.push(argv[index + 1] || '');
      index += 1;
      continue;
    }

    if (arg === '--exclude-dir') {
      options.excludeDirs.push(argv[index + 1] || '');
      index += 1;
      continue;
    }

    if (arg === '--max-lines') {
      options.maxLines = Number(argv[index + 1] || 0);
      index += 1;
    }
  }

  return options;
}

function loadConfig(rootDir, configPath) {
  if (!configPath) {
    return {};
  }

  const resolved = resolve(rootDir, configPath);
  return JSON.parse(readFileSync(resolved, 'utf8'));
}

function normalizeExtensions(extensions) {
  return new Set(
    extensions.map((extension) => (extension.startsWith('.') ? extension : `.${extension}`)).filter(Boolean),
  );
}

function shouldSkipPath(rootDir, absolutePath, excludeDirs) {
  const relPath = relative(rootDir, absolutePath);
  return relPath.split(/[\\/]+/).some((segment) => excludeDirs.has(segment));
}

function walkTargetFiles(rootDir, targetPath, includeExts, excludeDirs, results) {
  const resolvedTarget = resolve(rootDir, targetPath);

  if (!existsSync(resolvedTarget) || shouldSkipPath(rootDir, resolvedTarget, excludeDirs)) {
    return;
  }

  const stat = statSync(resolvedTarget);
  if (stat.isFile()) {
    if (includeExts.has(extname(resolvedTarget))) {
      results.push(resolvedTarget);
    }
    return;
  }

  for (const child of readdirSync(resolvedTarget, { withFileTypes: true })) {
    walkTargetFiles(rootDir, resolve(resolvedTarget, child.name), includeExts, excludeDirs, results);
  }
}

function countLines(filePath) {
  const text = readFileSync(filePath, 'utf8');
  if (!text) {
    return 0;
  }

  const lines = text.split(/\r?\n/);
  return lines.length - Number(lines.at(-1) === '');
}

function buildSettings(rootDir, argv) {
  const cli = parseArgs(argv);
  const config = loadConfig(rootDir, cli.configPath);

  if (Array.isArray(config.groups) && config.groups.length > 0) {
    const inheritedExcludeDirs = Array.isArray(config.excludeDirs) ? config.excludeDirs : [];
    return config.groups.map((group, index) => ({
      name: group.name || `group-${index + 1}`,
      maxLines: Number(group.maxLines || config.maxLines || 300),
      targets: Array.isArray(group.targets) ? group.targets : [],
      includeExts: normalizeExtensions(Array.isArray(group.extensions) ? group.extensions : []),
      excludeDirs: new Set(
        Array.isArray(group.excludeDirs) ? [...inheritedExcludeDirs, ...group.excludeDirs] : inheritedExcludeDirs,
      ),
    }));
  }

  return [
    {
      name: 'default',
      maxLines: cli.maxLines || Number(config.maxLines || 300),
      targets: cli.targets.length > 0 ? cli.targets : Array.isArray(config.targets) ? config.targets : [],
      includeExts: normalizeExtensions(
        cli.extensions.length > 0 ? cli.extensions : Array.isArray(config.extensions) ? config.extensions : [],
      ),
      excludeDirs: new Set(
        cli.excludeDirs.length > 0 ? cli.excludeDirs : Array.isArray(config.excludeDirs) ? config.excludeDirs : [],
      ),
    },
  ];
}

function main() {
  const rootDir = process.cwd();
  const groups = buildSettings(rootDir, process.argv.slice(2));
  const results = [];

  for (const settings of groups) {
    if (settings.targets.length === 0) {
      throw new Error(`No maxline targets configured for ${settings.name}`);
    }

    if (settings.includeExts.size === 0) {
      throw new Error(`No maxline extensions configured for ${settings.name}`);
    }

    const files = [];
    for (const targetPath of settings.targets) {
      walkTargetFiles(rootDir, targetPath, settings.includeExts, settings.excludeDirs, files);
    }

    const uniqueFiles = Array.from(new Set(files)).sort((a, b) =>
      relative(rootDir, a).localeCompare(relative(rootDir, b)),
    );
    const violations = uniqueFiles
      .map((filePath) => ({ filePath, lineCount: countLines(filePath) }))
      .filter(({ lineCount }) => lineCount > settings.maxLines);

    results.push({ settings, uniqueFiles, violations });
  }

  const failedGroups = results.filter((result) => result.violations.length > 0);
  if (failedGroups.length > 0) {
    for (const result of failedGroups) {
      console.error(`Maxline check failed (${result.settings.name}, limit ${result.settings.maxLines})`);
      for (const violation of result.violations) {
        console.error(`- ${relative(rootDir, violation.filePath)}: ${violation.lineCount}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  for (const result of results) {
    console.log(
      `Maxline check passed (${result.settings.name}: ${result.uniqueFiles.length} files, limit ${result.settings.maxLines})`,
    );
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
