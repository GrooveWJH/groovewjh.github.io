#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const POSTS_DIR = join(ROOT_DIR, "posts");
const PAGES_DIR = join(ROOT_DIR, "pages");
const ASSETS_DIR = join(ROOT_DIR, "assets");
const METADATA_CACHE_DIR = join(ROOT_DIR, ".typ-blog-cache", "metadata");
const TEMP_METADATA_JSON_PATH = join(ROOT_DIR, ".typ-blog-cache", "_posts-metadata.json");

// Parse command-line flags.
function parseArgs() {
  const args = process.argv.slice(2);
  let outDirName = "_site";
  let force = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--out" || arg === "-o") {
      outDirName = args[i + 1] || "_site";
      i += 1;
      continue;
    }
    if (arg === "--force" || arg === "-f") {
      force = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return {
    outDirName,
    force,
  };
}

function printHelp() {
  console.log(`Typ Blog HTML builder (Node.js)

Usage:
  node lib/node/build-html.mjs
  node lib/node/build-html.mjs --out _site
  node lib/node/build-html.mjs --force

Options:
  -o, --out     Output directory (default: _site)
  -f, --force   Force recompile for all posts/*.typ
  -h, --help    Show this help message
`);
}

// Recursively collect files that match a predicate.
function walkFiles(dir, predicate = () => true) {
  if (!existsSync(dir)) {
    return [];
  }

  const result = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    const items = readdirSync(current, { withFileTypes: true });
    for (const item of items) {
      const absPath = join(current, item.name);
      if (item.isDirectory()) {
        stack.push(absPath);
      } else if (predicate(absPath)) {
        result.push(absPath);
      }
    }
  }

  return result;
}

function safeRead(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function getMtimeMs(filePath) {
  try {
    return statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function shouldCompile(sourcePath, targetPath, force) {
  if (force || !existsSync(targetPath)) {
    return true;
  }
  return getMtimeMs(sourcePath) > getMtimeMs(targetPath);
}

function shouldCompileWithDependencies(sourcePath, targetPath, dependencyPaths, force) {
  if (shouldCompile(sourcePath, targetPath, force)) {
    return true;
  }

  const targetMtime = getMtimeMs(targetPath);
  return dependencyPaths.some((dependencyPath) => getMtimeMs(dependencyPath) > targetMtime);
}

function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-_.~]/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizePosixPath(pathValue) {
  return pathValue.replace(/\\/g, "/");
}

function derivePagePathFrom(baseDir, typFilePath) {
  const rel = normalizePosixPath(relative(baseDir, typFilePath));
  if (rel === "index.typ") {
    return "";
  }
  if (rel.endsWith("/index.typ")) {
    return rel.replace(/\/index\.typ$/, "");
  }
  return rel.replace(/\.typ$/, "");
}

function pagePathToPrettyOutput(siteDir, pagePath) {
  const normalized = String(pagePath || "").replace(/^\/+|\/+$/g, "");
  if (!normalized) {
    return join(siteDir, "index.html");
  }
  return join(siteDir, normalized, "index.html");
}

function writeFileIfChanged(filePath, content) {
  if (existsSync(filePath)) {
    const current = safeRead(filePath);
    if (current === content) {
      return false;
    }
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
  return true;
}

function makeTypstCompileArgs(sourcePath, outputPath, inputEntries = []) {
  const args = [
    "compile",
    "--root",
    ".",
    "--font-path",
    "assets",
    "--features",
    "html",
    "--format",
    "html",
  ];

  for (const [key, value] of inputEntries) {
    args.push("--input", `${key}=${value}`);
  }

  args.push(normalizePosixPath(relative(ROOT_DIR, sourcePath)), normalizePosixPath(relative(ROOT_DIR, outputPath)));
  return args;
}

function runTypstCompile(sourcePath, args, errorLabel) {
  const result = spawnSync("typst", args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status === 0) {
    return { ok: true };
  }

  const stderr = result.stderr?.trim() || "Unknown error";
  console.error(`Typst ${errorLabel} compile failed: ${sourcePath}`);
  console.error(stderr);
  return { ok: false };
}

function parseMetadataOnlyOutput(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const jsonMatch = body.match(/\{[\s\S]*\}/);
  const jsonText = (jsonMatch ? jsonMatch[0] : "").trim();

  if (!jsonText) {
    return null;
  }

  try {
    const data = JSON.parse(jsonText);
    return {
      title: String(data.title || "").trim(),
      description: String(data.description || "").trim(),
      category: String(data.category || "").trim(),
      tags: Array.isArray(data.tags)
        ? data.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : String(data.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
      date: String(data.date || "").trim(),
    };
  } catch {
    return null;
  }
}

function compilePostMetadataOnly(typFile) {
  const relPath = relative(POSTS_DIR, typFile);
  const relDir = dirname(relPath);
  const name = basename(relPath, extname(relPath));
  const outputPath = join(METADATA_CACHE_DIR, relDir, `_meta_${name}.html`);
  mkdirSync(dirname(outputPath), { recursive: true });

  try {
    const pagePath = derivePagePathFrom(POSTS_DIR, typFile);
    const args = makeTypstCompileArgs(typFile, outputPath, [
      ["page-path", pagePath],
      ["emit-post-meta", "true"],
    ]);
    const compileResult = runTypstCompile(typFile, args, "metadata");
    if (!compileResult.ok) {
      return null;
    }

    const html = safeRead(outputPath);
    const metadata = parseMetadataOnlyOutput(html);
    if (!metadata) {
      console.error(`Invalid metadata-only output: ${typFile}`);
      return null;
    }

    return metadata;
  } finally {
    rmSync(outputPath, { force: true });
  }
}

function collectSourceFiles(sourceDir) {
  if (!existsSync(sourceDir)) {
    return { typFiles: [], assetFiles: [], ignoredTypCount: 0 };
  }

  const files = walkFiles(sourceDir);
  const typFiles = [];
  const assetFiles = [];
  let ignoredTypCount = 0;

  for (const file of files) {
    const extension = extname(file).toLowerCase();
    if (extension === ".typ") {
      if (basename(file).startsWith("_")) {
        ignoredTypCount += 1;
        continue;
      }
      typFiles.push(file);
      continue;
    }

    if (extension === ".html") {
      continue;
    }

    if (basename(file) === "_posts-metadata.json") {
      continue;
    }

    assetFiles.push(file);
  }

  return { typFiles, assetFiles, ignoredTypCount };
}

function copyAssetsToSite(siteDir, force) {
  if (!existsSync(ASSETS_DIR)) {
    return { updated: 0, skipped: 0 };
  }

  const files = walkFiles(ASSETS_DIR);
  let updated = 0;
  let skipped = 0;

  const targetRoot = join(siteDir, "assets");

  for (const file of files) {
    const relPath = relative(ASSETS_DIR, file);
    const targetPath = join(targetRoot, relPath);
    mkdirSync(dirname(targetPath), { recursive: true });

    if (!force && existsSync(targetPath) && getMtimeMs(file) <= getMtimeMs(targetPath)) {
      skipped += 1;
      continue;
    }

    cpSync(file, targetPath, { force: true });
    updated += 1;
  }

  return { updated, skipped };
}

function cleanupSiteAssets(siteDir, preservedRelPaths = []) {
  if (!existsSync(ASSETS_DIR)) {
    return { removed: 0 };
  }

  const sourceFiles = walkFiles(ASSETS_DIR);
  const sourceRelPaths = new Set(sourceFiles.map((file) => normalizePosixPath(relative(ASSETS_DIR, file))));
  for (const relPath of preservedRelPaths) {
    sourceRelPaths.add(normalizePosixPath(relPath));
  }

  const targetRoot = join(siteDir, "assets");
  let removed = 0;

  if (existsSync(targetRoot)) {
    const targetFiles = walkFiles(targetRoot);
    for (const targetFile of targetFiles) {
      const relPath = normalizePosixPath(relative(targetRoot, targetFile));
      if (!sourceRelPaths.has(relPath)) {
        rmSync(targetFile, { force: true });
        removed += 1;
      }
    }

    const dirs = [];
    const stack = [targetRoot];
    while (stack.length > 0) {
      const current = stack.pop();
      const items = readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const absPath = join(current, item.name);
          dirs.push(absPath);
          stack.push(absPath);
        }
      }
    }

    dirs.sort((a, b) => b.length - a.length);
    for (const dirPath of dirs) {
      const remaining = readdirSync(dirPath);
      if (remaining.length === 0) {
        rmSync(dirPath, { recursive: true, force: true });
      }
    }
  }

  return { removed };
}

function cleanupMetadataCache() {
  if (!existsSync(METADATA_CACHE_DIR)) {
    return { removed: 0 };
  }

  const cacheFiles = walkFiles(METADATA_CACHE_DIR, (filePath) => extname(filePath).toLowerCase() === ".html");
  let removed = 0;

  for (const cacheFile of cacheFiles) {
    rmSync(cacheFile, { force: true });
    removed += 1;
  }

  const dirs = [];
  const stack = [METADATA_CACHE_DIR];
  while (stack.length > 0) {
    const current = stack.pop();
    const items = readdirSync(current, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const absPath = join(current, item.name);
        dirs.push(absPath);
        stack.push(absPath);
      }
    }
  }

  dirs.sort((a, b) => b.length - a.length);
  for (const dirPath of dirs) {
    const remaining = readdirSync(dirPath);
    if (remaining.length === 0) {
      rmSync(dirPath, { recursive: true, force: true });
    }
  }

  return { removed };
}

function cleanupTypBlogCacheRoot() {
  const cacheRoot = join(ROOT_DIR, ".typ-blog-cache");
  if (!existsSync(cacheRoot)) {
    return { removed: false };
  }

  rmSync(cacheRoot, { recursive: true, force: true });
  return { removed: true };
}

function copySourceAssetsToSite(sourceDir, siteDir, force, assetFiles) {
  if (!assetFiles || assetFiles.length === 0) {
    return { updated: 0, skipped: 0, removed: 0 };
  }

  let updated = 0;
  let skipped = 0;

  for (const file of assetFiles) {
    const relPath = relative(sourceDir, file);
    const targetPath = join(siteDir, relPath);
    mkdirSync(dirname(targetPath), { recursive: true });

    if (!force && existsSync(targetPath) && getMtimeMs(file) <= getMtimeMs(targetPath)) {
      skipped += 1;
      continue;
    }

    cpSync(file, targetPath, { force: true });
    updated += 1;
  }

  return { updated, skipped, removed: 0 };
}

function compileTypFilesToHtml(sourceDir, siteDir, force, typFiles, dependencyPaths, extraInputs, label, outputStyle = "flat") {
  const compiled = [];
  let failedCount = 0;

  for (const typFile of typFiles) {
    const relPath = relative(sourceDir, typFile);
    const pagePath = derivePagePathFrom(sourceDir, typFile);
    const outputPath = outputStyle === "pretty"
      ? pagePathToPrettyOutput(siteDir, pagePath)
      : join(siteDir, relPath).replace(/\.typ$/i, ".html");
    mkdirSync(dirname(outputPath), { recursive: true });

    if (!shouldCompileWithDependencies(typFile, outputPath, dependencyPaths, force)) {
      compiled.push({ source: typFile, output: outputPath, skipped: true });
      continue;
    }

    const inputEntries = [["page-path", pagePath]];

    const resolvedInputs = typeof extraInputs === "function"
      ? extraInputs({ typFile, relPath, pagePath, outputPath })
      : extraInputs;

    for (const [key, value] of resolvedInputs) {
      inputEntries.push([key, value]);
    }

    const args = makeTypstCompileArgs(typFile, outputPath, inputEntries);
    const compileResult = runTypstCompile(typFile, args, label);
    if (!compileResult.ok) {
      failedCount += 1;
      compiled.push({ source: typFile, output: outputPath, skipped: false, failed: true });
      continue;
    }

    compiled.push({ source: typFile, output: outputPath, skipped: false, failed: false });
  }

  return { compiled, failedCount };
}

function compileDynamicPageTypFilesToHtml(siteDir, force, typFiles, dependencyPaths, posts) {
  const compiled = [];
  let failedCount = 0;

  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort((a, b) => a.localeCompare(b));
  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  for (const typFile of typFiles) {
    const relPath = normalizePosixPath(relative(PAGES_DIR, typFile));
    const hasTag = relPath.includes("[tag]");
    const hasCategory = relPath.includes("[category]");

    if (hasTag && hasCategory) {
      throw new Error(`Dynamic page template cannot include both [tag] and [category]: ${relPath}`);
    }

    const targets = hasTag
      ? tags.map((tag) => ({
          relTypPath: relPath.replaceAll("[tag]", slugify(tag)),
          routeInputs: [["route-tag", tag]],
        }))
      : hasCategory
        ? categories.map((category) => ({
            relTypPath: relPath.replaceAll("[category]", slugify(category)),
            routeInputs: [["route-category", category]],
          }))
        : [{ relTypPath: relPath, routeInputs: [] }];

    for (const target of targets) {
      const targetTypPath = join(PAGES_DIR, target.relTypPath);
      const pagePath = derivePagePathFrom(PAGES_DIR, targetTypPath);
      const outputPath = pagePathToPrettyOutput(siteDir, pagePath);
      mkdirSync(dirname(outputPath), { recursive: true });

      if (!shouldCompileWithDependencies(typFile, outputPath, dependencyPaths, force)) {
        compiled.push({ source: typFile, output: outputPath, skipped: true });
        continue;
      }

      const postsJsonInput = relative(dirname(typFile), TEMP_METADATA_JSON_PATH);
      const inputEntries = [
        ["page-path", pagePath],
        ["posts-json", postsJsonInput],
      ];

      for (const [key, value] of target.routeInputs) {
        inputEntries.push([key, value]);
      }

      const args = makeTypstCompileArgs(typFile, outputPath, inputEntries);
      const compileResult = runTypstCompile(typFile, args, "page");
      if (!compileResult.ok) {
        failedCount += 1;
        compiled.push({ source: typFile, output: outputPath, skipped: false, failed: true });
        continue;
      }

      compiled.push({ source: typFile, output: outputPath, skipped: false, failed: false });
    }
  }

  return { compiled, failedCount };
}

function cleanupLegacyFlatPageOutputs(siteDir, pageTypFiles, posts) {
  let removed = 0;
  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort((a, b) => a.localeCompare(b));
  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  for (const typFile of pageTypFiles) {
    const relPath = normalizePosixPath(relative(PAGES_DIR, typFile));
    const hasTag = relPath.includes("[tag]");
    const hasCategory = relPath.includes("[category]");

    if (hasTag && hasCategory) {
      continue;
    }

    const flatTargets = hasTag
      ? tags.map((tag) => relPath.replaceAll("[tag]", slugify(tag)))
      : hasCategory
        ? categories.map((category) => relPath.replaceAll("[category]", slugify(category)))
        : [relPath];

    for (const flatTarget of flatTargets) {
      const normalizedFlatTarget = normalizePosixPath(flatTarget);
      const legacyCandidates = [join(siteDir, normalizedFlatTarget).replace(/\.typ$/i, ".html")];

      if (normalizedFlatTarget === "index.typ") {
        legacyCandidates.push(join(siteDir, "index", "index.html"));
      }

      if (normalizedFlatTarget !== "index.typ" && normalizedFlatTarget.endsWith("/index.typ")) {
        legacyCandidates.push(join(siteDir, normalizedFlatTarget.replace(/\/index\.typ$/i, ".html")));
      }

      for (const legacyPath of legacyCandidates) {
        if (existsSync(legacyPath)) {
          rmSync(legacyPath, { force: true });
          removed += 1;
        }
      }
    }
  }

  return { removed };
}

function cleanupObsoleteGeneratedHtml(siteDir, expectedOutputs) {
  const expectedOutputPaths = new Set(expectedOutputs.map((outputPath) => resolve(outputPath)));
  const htmlFiles = walkFiles(siteDir, (filePath) => extname(filePath).toLowerCase() === ".html");
  let removed = 0;

  for (const htmlFile of htmlFiles) {
    const relPath = normalizePosixPath(relative(siteDir, htmlFile));
    if (relPath.startsWith("assets/")) {
      continue;
    }

    if (expectedOutputPaths.has(resolve(htmlFile))) {
      continue;
    }

    rmSync(htmlFile, { force: true });
    removed += 1;
  }

  const dirs = [];
  const stack = [siteDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const items = readdirSync(current, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const absPath = join(current, item.name);
        if (absPath === join(siteDir, "assets")) {
          continue;
        }
        dirs.push(absPath);
        stack.push(absPath);
      }
    }
  }

  dirs.sort((a, b) => b.length - a.length);
  for (const dirPath of dirs) {
    const remaining = readdirSync(dirPath);
    if (remaining.length === 0) {
      rmSync(dirPath, { recursive: true, force: true });
    }
  }

  return { removed };
}

function collectPostMetadata(postTypFiles) {
  const posts = [];
  let failedCount = 0;

  for (const typFile of postTypFiles) {
    const metadata = compilePostMetadataOnly(typFile);
    if (!metadata) {
      failedCount += 1;
      continue;
    }
    const pagePath = derivePagePathFrom(POSTS_DIR, typFile);
    const slug = pagePath;
    const url = normalizePosixPath(relative(POSTS_DIR, typFile)).endsWith("/index.typ")
      ? `/${slug}/`.replace("//", "/")
      : `/${slug}.html`;

    const lastModified = new Date(getMtimeMs(typFile)).toISOString();

    const post = {
      slug,
      url,
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      category: metadata.category,
      date: metadata.date,
      lastModified,
      source: normalizePosixPath(relative(ROOT_DIR, typFile)),
    };

    posts.push(post);
  }

  posts.sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date));
    if (byDate !== 0) {
      return byDate;
    }
    return String(a.slug).localeCompare(String(b.slug));
  });

  return { posts, failedCount };
}

function writeTempMetadataFile(posts) {
  const json = JSON.stringify(posts, null, 2);
  const changed = writeFileIfChanged(TEMP_METADATA_JSON_PATH, json);
  return {
    path: TEMP_METADATA_JSON_PATH,
    changed,
  };
}

function main() {
  const { outDirName, force } = parseArgs();
  const siteDir = join(ROOT_DIR, outDirName);

  mkdirSync(siteDir, { recursive: true });

  const assetsStats = copyAssetsToSite(siteDir, force);
  const { typFiles: postTypFiles, assetFiles: postAssetFiles, ignoredTypCount: ignoredPostTypCount } = collectSourceFiles(POSTS_DIR);
  const { typFiles: pageTypFiles, assetFiles: pageAssetFiles, ignoredTypCount: ignoredPageTypCount } = collectSourceFiles(PAGES_DIR);
  const metadataCacheStats = cleanupMetadataCache();
  const postAssetStats = copySourceAssetsToSite(POSTS_DIR, siteDir, force, postAssetFiles);
  const pageAssetStats = copySourceAssetsToSite(PAGES_DIR, siteDir, force, pageAssetFiles);

  const { posts, failedCount: metadataFailedCount } = collectPostMetadata(postTypFiles);
  const tempMetadata = writeTempMetadataFile(posts);
  const legacyPageCleanupStats = cleanupLegacyFlatPageOutputs(siteDir, pageTypFiles, posts);

  const postCompile = compileTypFilesToHtml(
    POSTS_DIR,
    siteDir,
    force,
    postTypFiles,
    [tempMetadata.path],
    ({ typFile }) => [["posts-json", normalizePosixPath(relative(dirname(typFile), tempMetadata.path))]],
    "post",
    "flat",
  );

  const pageCompile = compileDynamicPageTypFilesToHtml(
    siteDir,
    force,
    pageTypFiles,
    [tempMetadata.path],
    posts,
  );

  const failedCount = metadataFailedCount + postCompile.failedCount + pageCompile.failedCount;
  const compiled = [...postCompile.compiled, ...pageCompile.compiled];
  const obsoleteHtmlCleanupStats = cleanupObsoleteGeneratedHtml(
    siteDir,
    compiled.map((item) => item.output),
  );
  const assetsCleanupStats = cleanupSiteAssets(siteDir);

  const successCount = compiled.filter((item) => !item.skipped && !item.failed).length;
  const skippedCount = compiled.filter((item) => item.skipped).length;
  const tagCount = new Set(posts.flatMap((post) => post.tags)).size;
  const categoryCount = new Set(posts.map((post) => post.category).filter(Boolean)).size;

  console.log(`Build ${failedCount > 0 ? "completed with errors" : "succeeded"}`);
  console.log(`Out: ${siteDir}`);
  console.log(`Ignored posts/_*.typ: ${ignoredPostTypCount}`);
  console.log(`Ignored pages/_*.typ: ${ignoredPageTypCount}`);
  console.log(`Metadata cache removed ${metadataCacheStats.removed}`);
  console.log(`Metadata temp json: ${normalizePosixPath(relative(ROOT_DIR, tempMetadata.path))} (${tempMetadata.changed ? "updated" : "unchanged"})`);
  console.log(`Legacy flat pages removed ${legacyPageCleanupStats.removed}`);
  console.log(`Obsolete generated pages removed ${obsoleteHtmlCleanupStats.removed}`);
  console.log(`Site assets updated ${assetsStats.updated}, skipped ${assetsStats.skipped}, removed ${assetsCleanupStats.removed}`);
  console.log(`Post assets updated ${postAssetStats.updated}, skipped ${postAssetStats.skipped}, removed ${postAssetStats.removed}`);
  console.log(`Page assets updated ${pageAssetStats.updated}, skipped ${pageAssetStats.skipped}, removed ${pageAssetStats.removed}`);
  console.log(`Typst compiled ${successCount}, skipped ${skippedCount}, failed ${failedCount}`);
  console.log(`Posts ${posts.length}, tags ${tagCount}, categories ${categoryCount}`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error("Build failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
} finally {
  try {
    const cacheCleanup = cleanupTypBlogCacheRoot();
    if (cacheCleanup.removed) {
      console.log("Cache directory removed: .typ-blog-cache");
    }
  } catch (cleanupError) {
    console.error("Failed to remove cache directory .typ-blog-cache");
    console.error(cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
  }
}
