#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

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

    if (arg === "--config") {
      options.configPath = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === "--target") {
      options.targets.push(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg === "--ext") {
      options.extensions.push(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg === "--exclude-dir") {
      options.excludeDirs.push(argv[index + 1] || "");
      index += 1;
      continue;
    }

    if (arg === "--max-lines") {
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
  return JSON.parse(readFileSync(resolved, "utf8"));
}

function normalizeExtensions(extensions) {
  return new Set(extensions.map((extension) => extension.startsWith(".") ? extension : `.${extension}`).filter(Boolean));
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
  const text = readFileSync(filePath, "utf8");
  if (!text) {
    return 0;
  }

  const lines = text.split(/\r?\n/);
  return lines.length - Number(lines.at(-1) === "");
}

function buildSettings(rootDir, argv) {
  const cli = parseArgs(argv);
  const config = loadConfig(rootDir, cli.configPath);

  return {
    maxLines: cli.maxLines || Number(config.maxLines || 300),
    targets: cli.targets.length > 0 ? cli.targets : Array.isArray(config.targets) ? config.targets : [],
    includeExts: normalizeExtensions(cli.extensions.length > 0 ? cli.extensions : Array.isArray(config.extensions) ? config.extensions : []),
    excludeDirs: new Set(cli.excludeDirs.length > 0 ? cli.excludeDirs : Array.isArray(config.excludeDirs) ? config.excludeDirs : []),
  };
}

function main() {
  const rootDir = process.cwd();
  const settings = buildSettings(rootDir, process.argv.slice(2));

  if (settings.targets.length === 0) {
    throw new Error("No maxline targets configured");
  }

  if (settings.includeExts.size === 0) {
    throw new Error("No maxline extensions configured");
  }

  const files = [];
  for (const targetPath of settings.targets) {
    walkTargetFiles(rootDir, targetPath, settings.includeExts, settings.excludeDirs, files);
  }

  const uniqueFiles = Array.from(new Set(files)).sort((a, b) => relative(rootDir, a).localeCompare(relative(rootDir, b)));
  const violations = uniqueFiles
    .map((filePath) => ({ filePath, lineCount: countLines(filePath) }))
    .filter(({ lineCount }) => lineCount > settings.maxLines);

  if (violations.length > 0) {
    console.error(`Maxline check failed (limit ${settings.maxLines})`);
    for (const violation of violations) {
      console.error(`- ${relative(rootDir, violation.filePath)}: ${violation.lineCount}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Maxline check passed (${uniqueFiles.length} files, limit ${settings.maxLines})`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
