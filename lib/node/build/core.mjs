import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
  ASSETS_DIR,
  ROOT_DIR,
  PAGES_DIR,
  POSTS_DIR,
  TYPE_TOOLCHAIN_DIR,
} from "./constants.mjs";
import {
  assertRouteTokenUsage,
  buildSlugMap,
  collectSourceFiles,
  ensureDirForFile,
  finalizeOutput,
  listDeletedFiles,
  normalizePosixPath,
  pagePathToOutputRel,
  safeRead,
  resolveSafeBuildSubdir,
  stageFileFromSourceOrOutput,
  upsertStatus,
  walkFiles,
  writeJson,
} from "./helpers.mjs";
import { createProgressBar } from "./progress.mjs";
import { runPool } from "./pool.mjs";
import { POSTS_PER_PAGE, calcTotalPages, listPages, withPagePath } from "./page.mjs";
import { collectTypstDependencyFiles, makeTypstCompileArgs, parseJsonFromMetadataHtml, runTypstCompile } from "./typst.mjs";
import { SITE_CONFIG_FILE_NAME, stageRss } from "./rss.mjs";
import { normalizeShareMetadataForSite } from "./share.mjs";
import { buildFontArtifacts } from "../build-fonts.mjs";
import { stageWebAppArtifacts, WEBAPP_ICON_FILE_NAMES } from "./webapp.mjs";

const EXCLUDED_POST_ROOT_DIRS = new Set(["_hidden", "_drafts"]);

function formatDurationMs(durationMs) {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
}

async function runTimedStep(label, operation) {
  const startedAt = Date.now();
  const result = await operation();
  return {
    label,
    result,
    durationMs: Date.now() - startedAt,
  };
}

function runTimedStepSync(label, operation) {
  const startedAt = Date.now();
  const result = operation();
  return {
    label,
    result,
    durationMs: Date.now() - startedAt,
  };
}

function logPhase(label, durationMs, extra = "") {
  const suffix = extra ? ` ${extra}` : "";
  console.log(`[${label}] ${formatDurationMs(durationMs)}${suffix}`);
}

// 仅允许 index.typ 作为页面入口，并推导 page-path。
function derivePagePathFromIndexTyp(baseDir, typFilePath) {
  if (basename(typFilePath).toLowerCase() !== "index.typ") {
    throw new Error(`Only index.typ is supported: ${normalizePosixPath(relative(baseDir, typFilePath))}`);
  }

  const rel = normalizePosixPath(relative(baseDir, typFilePath));
  if (rel === "index.typ") {
    return "";
  }

  return normalizePosixPath(dirname(rel));
}

function isExcludedPostFile(filePath) {
  const rel = normalizePosixPath(relative(POSTS_DIR, filePath));
  const [rootSegment = ""] = rel.split("/");
  return EXCLUDED_POST_ROOT_DIRS.has(rootSegment);
}

function filterPostSourceFiles(source) {
  return {
    typFiles: source.typFiles.filter((filePath) => !isExcludedPostFile(filePath)),
    assetFiles: source.assetFiles.filter((filePath) => !isExcludedPostFile(filePath)),
  };
}

function readSiteConfigInputs(siteConfigPath) {
  if (!existsSync(siteConfigPath)) {
    return { siteUrl: null, localSiteUrl: null, author: null, siteTitle: null, language: null };
  }

  const raw = readFileSync(siteConfigPath, "utf8").trim();
  if (raw.length === 0) {
    return { siteUrl: null, localSiteUrl: null, author: null, siteTitle: null, language: null };
  }

  try {
    const parsed = JSON.parse(raw);
    const siteUrl = String(parsed.siteUrl || "").trim().replace(/\/+$/, "") || null;
    const localSiteUrl = String(parsed.localSiteUrl || "").trim().replace(/\/+$/, "") || null;
    const author = String(parsed.author || "").trim() || null;
    const siteTitle = String(parsed.siteTitle || "").trim() || null;
    const language = String(parsed.language || "").trim().toLowerCase() || null;
    return { siteUrl, localSiteUrl, author, siteTitle, language };
  } catch {
    throw new Error(`Invalid JSON in ${normalizePosixPath(relative(ROOT_DIR, siteConfigPath))}`);
  }
}

function resolveActiveShareSiteUrl(siteInputs, shareOrigin) {
  if (shareOrigin === "prod") {
    return siteInputs.siteUrl;
  }

  return siteInputs.localSiteUrl;
}

// 并发提取每篇文章 metadata，汇总成 posts 列表。
async function collectPostMetadata(postTypFiles, jobs, paths) {
  const tasks = postTypFiles.map((typFile) => {
    const rel = normalizePosixPath(relative(POSTS_DIR, typFile));
    return {
      typFile,
      cacheHtmlPath: join(paths.metadataCacheDir, "posts", rel.replace(/\/index\.typ$/i, ""), "meta.html"),
    };
  });

  const progressBar = createProgressBar("metadata    ", tasks.length);
  const results = await runPool(
    tasks,
    jobs,
    async (task) => {
      ensureDirForFile(task.cacheHtmlPath);

      const pagePath = derivePagePathFromIndexTyp(POSTS_DIR, task.typFile);
      const metadataPagePath = `posts/${pagePath}`.replace(/^posts\/$/, "posts");
      const args = makeTypstCompileArgs(ROOT_DIR, task.typFile, task.cacheHtmlPath, [
        ["page-path", metadataPagePath],
        ["emit-post-meta", "true"],
      ]);

      const compiled = await runTypstCompile(ROOT_DIR, task.typFile, args, "metadata");
      if (!compiled.ok) {
        return { ok: false, message: compiled.message };
      }

      const parsed = parseJsonFromMetadataHtml(ROOT_DIR, safeRead(task.cacheHtmlPath), task.typFile);
      rmSync(task.cacheHtmlPath, { force: true });

      return {
        ok: true,
        post: {
          slug: pagePath,
          url: `/posts/${pagePath}/`.replace("//", "/"),
          title: String(parsed.title || "").trim(),
          description: String(parsed.description || "").trim(),
          cover: String(parsed.cover || "").trim(),
          resolvedCoverPath: String(parsed.resolvedCoverPath || "").trim(),
          tags: Array.isArray(parsed.tags)
            ? parsed.tags.map((tag) => String(tag).trim()).filter(Boolean)
            : [],
          category: String(parsed.category || "").trim(),
          date: String(parsed.date || "").trim(),
        },
      };
    },
    progressBar,
  );

  const errors = results.filter((item) => !item.ok);
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.message).join("\n\n"));
  }

  const posts = results.map((item) => item.post);
  posts.sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date));
    if (byDate !== 0) {
      return byDate;
    }
    return String(a.slug).localeCompare(String(b.slug));
  });

  return posts;
}

function buildExtraInputs(siteInputs = {}) {
  const extraInputs = [];
  if (siteInputs.activeSiteUrl) {
    extraInputs.push(["website-url", siteInputs.activeSiteUrl]);
  }
  if (siteInputs.author) {
    extraInputs.push(["author", siteInputs.author]);
  }
  return extraInputs;
}

function buildPostsAndSlugsInputs(postsJsonPath, slugsJsonPath) {
  return {
    postsInput: normalizePosixPath(relative(TYPE_TOOLCHAIN_DIR, postsJsonPath)),
    slugsInput: normalizePosixPath(relative(TYPE_TOOLCHAIN_DIR, slugsJsonPath)),
  };
}

function createCompileTask({
  kind,
  sourceTypFile,
  pagePath,
  postsInput,
  slugsInput,
  extraInputs,
  dependencies,
  routeInputs = [],
  routeLabel = "",
}) {
  return {
    kind,
    sourceTypFile,
    pagePath,
    outputRel: pagePathToOutputRel(pagePath),
    inputs: [
      ["page-path", pagePath],
      ["posts-json", postsInput],
      ["slugs-json", slugsInput],
      ...routeInputs,
      ...extraInputs,
    ],
    dependencies,
    routeLabel,
  };
}

// 防止不同任务写入同一个输出路径。
function ensureUniqueOutputTargets(tasks) {
  const seen = new Map();

  for (const task of tasks) {
    const key = normalizePosixPath(task.outputRel);
    const existing = seen.get(key);
    if (existing) {
      throw new Error([
        `Output collision: ${key}`,
        `- ${existing.source}`,
        `- ${task.source}`,
      ].join("\n"));
    }

    seen.set(key, {
      source: `${normalizePosixPath(relative(ROOT_DIR, task.sourceTypFile))}${task.routeLabel ? ` (${task.routeLabel})` : ""}`,
    });
  }
}

// 生成文章编译任务（posts/*/index.typ -> posts/*/index.html）。
function makePostCompileTasks(postTypFiles, postsJsonPath, slugsJsonPath, dependencies, siteInputs = {}) {
  const { postsInput, slugsInput } = buildPostsAndSlugsInputs(postsJsonPath, slugsJsonPath);
  const extraInputs = buildExtraInputs(siteInputs);

  return postTypFiles.map((typFile) => {
    const pagePath = `posts/${derivePagePathFromIndexTyp(POSTS_DIR, typFile)}`;
    return createCompileTask({
      kind: "post",
      sourceTypFile: typFile,
      pagePath,
      postsInput,
      slugsInput,
      extraInputs,
      dependencies: [...dependencies, postsJsonPath, slugsJsonPath],
    });
  });
}

function appendIndexPaginationTasks(tasks, typFile, postsLength, shared) {
  const totalPages = calcTotalPages(postsLength, POSTS_PER_PAGE);
  for (const pageNumber of listPages(totalPages)) {
    const pagePath = withPagePath("", pageNumber);
    tasks.push(createCompileTask({
      kind: "page",
      sourceTypFile: typFile,
      pagePath,
      postsInput: shared.postsInput,
      slugsInput: shared.slugsInput,
      extraInputs: shared.extraInputs,
      dependencies: shared.dependencies,
      routeInputs: [
        ["route-kind", "article"],
        ["route-page", String(pageNumber)],
        ["route-page-size", String(POSTS_PER_PAGE)],
      ],
      routeLabel: `home-kind=article,page=${pageNumber}`,
    }));
  }
}

function appendPoemIndexPaginationTasks(tasks, typFile, postsLength, shared) {
  const totalPages = calcTotalPages(postsLength, POSTS_PER_PAGE);
  for (const pageNumber of listPages(totalPages)) {
    const pagePath = withPagePath("poems", pageNumber);
    tasks.push(createCompileTask({
      kind: "page",
      sourceTypFile: typFile,
      pagePath,
      postsInput: shared.postsInput,
      slugsInput: shared.slugsInput,
      extraInputs: shared.extraInputs,
      dependencies: shared.dependencies,
      routeInputs: [
        ["route-kind", "poem"],
        ["route-page", String(pageNumber)],
        ["route-page-size", String(POSTS_PER_PAGE)],
      ],
      routeLabel: `home-kind=poem,page=${pageNumber}`,
    }));
  }
}

function appendTagRouteTasks(tasks, typFile, relTypPath, tags, posts, slugMaps, shared) {
  for (const tag of tags) {
    const slug = slugMaps.tags[tag];
    const relTarget = relTypPath.replace("[tag]", slug);
    const basePath = derivePagePathFromIndexTyp(PAGES_DIR, join(PAGES_DIR, relTarget));
    const matchedCount = posts.filter((post) => post.tags.some((value) => value === tag)).length;
    const totalPages = calcTotalPages(matchedCount, POSTS_PER_PAGE);

    for (const pageNumber of listPages(totalPages)) {
      const pagePath = withPagePath(basePath, pageNumber);
      tasks.push(createCompileTask({
        kind: "page",
        sourceTypFile: typFile,
        pagePath,
        postsInput: shared.postsInput,
        slugsInput: shared.slugsInput,
        extraInputs: shared.extraInputs,
        dependencies: shared.dependencies,
        routeInputs: [
          ["route-tag", tag],
          ["route-page", String(pageNumber)],
          ["route-page-size", String(POSTS_PER_PAGE)],
        ],
        routeLabel: `tag=${tag},page=${pageNumber}`,
      }));
    }
  }
}

function appendCategoryRouteTasks(tasks, typFile, relTypPath, categories, posts, slugMaps, shared) {
  for (const category of categories) {
    const slug = slugMaps.categories[category];
    const relTarget = relTypPath.replace("[category]", slug);
    const basePath = derivePagePathFromIndexTyp(PAGES_DIR, join(PAGES_DIR, relTarget));
    const matchedCount = posts.filter((post) => post.category === category).length;
    const totalPages = calcTotalPages(matchedCount, POSTS_PER_PAGE);

    for (const pageNumber of listPages(totalPages)) {
      const pagePath = withPagePath(basePath, pageNumber);
      tasks.push(createCompileTask({
        kind: "page",
        sourceTypFile: typFile,
        pagePath,
        postsInput: shared.postsInput,
        slugsInput: shared.slugsInput,
        extraInputs: shared.extraInputs,
        dependencies: shared.dependencies,
        routeInputs: [
          ["route-category", category],
          ["route-page", String(pageNumber)],
          ["route-page-size", String(POSTS_PER_PAGE)],
        ],
        routeLabel: `category=${category},page=${pageNumber}`,
      }));
    }
  }
}

function appendStaticPageTask(tasks, typFile, shared) {
  const pagePath = derivePagePathFromIndexTyp(PAGES_DIR, typFile);
  tasks.push(createCompileTask({
    kind: "page",
    sourceTypFile: typFile,
    pagePath,
    postsInput: shared.postsInput,
    slugsInput: shared.slugsInput,
    extraInputs: shared.extraInputs,
    dependencies: shared.dependencies,
  }));
}

// 生成页面编译任务，并展开 [tag]/[category] 动态路由。
function makePageCompileTasks(pageTypFiles, posts, slugMaps, postsJsonPath, slugsJsonPath, dependencies, siteInputs = {}) {
  const { postsInput, slugsInput } = buildPostsAndSlugsInputs(postsJsonPath, slugsJsonPath);
  const shared = {
    postsInput,
    slugsInput,
    extraInputs: buildExtraInputs(siteInputs),
    dependencies: [...dependencies, postsJsonPath, slugsJsonPath],
  };

  const tags = Array.from(new Set(posts.flatMap((post) => post.tags))).sort((a, b) => a.localeCompare(b));
  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const poemPosts = posts.filter((post) => post.category === "诗歌");
  const articlePosts = posts.filter((post) => post.category !== "诗歌");
  const tasks = [];

  for (const typFile of pageTypFiles) {
    const relTypPath = normalizePosixPath(relative(PAGES_DIR, typFile));
    const usage = assertRouteTokenUsage(relTypPath);

    if (relTypPath === "index.typ") {
      appendIndexPaginationTasks(tasks, typFile, articlePosts.length, shared);
      appendPoemIndexPaginationTasks(tasks, typFile, poemPosts.length, shared);
      continue;
    }

    if (usage.hasTag) {
      appendTagRouteTasks(tasks, typFile, relTypPath, tags, posts, slugMaps, shared);
      continue;
    }

    if (usage.hasCategory) {
      appendCategoryRouteTasks(tasks, typFile, relTypPath, categories, posts, slugMaps, shared);
      continue;
    }

    appendStaticPageTask(tasks, typFile, shared);
  }

  return tasks;
}

// 全量编译所有 Typst 任务到 staging。
async function compileAndStageTypstTasks(tasks, stagingSiteDir, jobs, statusMap) {
  const compileTasks = tasks.map((task) => ({
    ...task,
    stagingOutputPath: join(stagingSiteDir, task.outputRel),
  }));

  const progressBar = createProgressBar("compile     ", compileTasks.length);
  const results = await runPool(
    compileTasks,
    jobs,
    async (task) => {
      ensureDirForFile(task.stagingOutputPath);
      const args = makeTypstCompileArgs(ROOT_DIR, task.sourceTypFile, task.stagingOutputPath, task.inputs);
      const compiled = await runTypstCompile(ROOT_DIR, task.sourceTypFile, args, task.kind);
      if (!compiled.ok) {
        return {
          ok: false,
          message: compiled.message,
        };
      }

      return { ok: true, outputRel: task.outputRel };
    },
    progressBar,
  );

  const errors = results.filter((item) => !item.ok);
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.message).join("\n\n"));
  }

  for (const item of results) {
    upsertStatus(statusMap, item.outputRel, "updated");
  }
}

// 复制一组静态资源到 staging，并更新状态统计。
function stageAssetGroup(sourceRoot, sourceFiles, stagingSiteDir, targetPrefix, statusMap, label) {
  const progressBar = createProgressBar(label, sourceFiles.length);

  for (const sourcePath of sourceFiles) {
    const sourceRel = normalizePosixPath(relative(sourceRoot, sourcePath));
    const outputRel = targetPrefix ? normalizePosixPath(`${targetPrefix}/${sourceRel}`) : sourceRel;
    const stagingPath = join(stagingSiteDir, outputRel);

    stageFileFromSourceOrOutput(sourcePath, stagingPath, statusMap, outputRel);
    if (progressBar) {
      progressBar.tick();
    }
  }
}

function prepareBuildPaths({ outDirName, configPath, cacheRoot }) {
  const resolvedOutDir = resolveSafeBuildSubdir(ROOT_DIR, outDirName, "--out");
  const resolvedCacheRoot = resolveSafeBuildSubdir(ROOT_DIR, cacheRoot, "--cache-root");
  const resolvedConfigTypPath = resolve(ROOT_DIR, configPath);
  const configRelPath = normalizePosixPath(relative(ROOT_DIR, resolvedConfigTypPath));
  if (!configRelPath || configRelPath === "." || configRelPath === ".." || configRelPath.startsWith("../")) {
    throw new Error(`--config must resolve inside repository root: ${configPath}`);
  }

  return {
    paths: {
      configTypPath: resolvedConfigTypPath,
      siteConfigPath: resolve(ROOT_DIR, SITE_CONFIG_FILE_NAME),
      cacheRoot: resolvedCacheRoot.resolvedPath,
      transientRoot: join(resolvedCacheRoot.resolvedPath, "transient"),
      stagingSiteDir: join(resolvedCacheRoot.resolvedPath, "transient", "_site-staging"),
      metadataCacheDir: join(resolvedCacheRoot.resolvedPath, "transient", "metadata"),
      postsMetadataJsonPath: join(resolvedCacheRoot.resolvedPath, "transient", "_posts-metadata.json"),
      routeSlugsJsonPath: join(resolvedCacheRoot.resolvedPath, "transient", "_route-slugs.json"),
    },
    outputSiteDir: resolvedOutDir.resolvedPath,
  };
}

async function collectBuildData(paths, jobs) {
  const postSource = filterPostSourceFiles(collectSourceFiles(POSTS_DIR));
  const pageSource = collectSourceFiles(PAGES_DIR);

  const posts = await collectPostMetadata(postSource.typFiles, jobs, paths);
  writeJson(paths.postsMetadataJsonPath, posts);

  const tagValues = posts.flatMap((post) => post.tags);
  const categoryValues = posts.map((post) => post.category).filter(Boolean);

  const slugMaps = {
    tags: buildSlugMap(tagValues, "tags"),
    categories: buildSlugMap(categoryValues, "categories"),
  };
  writeJson(paths.routeSlugsJsonPath, slugMaps);

  return {
    postSource,
    pageSource,
    posts,
    slugMaps,
  };
}

function buildCompileTaskSet(buildData, paths, siteInputs) {
  const typstDependencies = collectTypstDependencyFiles(paths.configTypPath);

  const postCompileTasks = makePostCompileTasks(
    buildData.postSource.typFiles,
    paths.postsMetadataJsonPath,
    paths.routeSlugsJsonPath,
    typstDependencies,
    siteInputs,
  );

  const pageCompileTasks = makePageCompileTasks(
    buildData.pageSource.typFiles,
    buildData.posts,
    buildData.slugMaps,
    paths.postsMetadataJsonPath,
    paths.routeSlugsJsonPath,
    typstDependencies,
    siteInputs,
  );

  const allCompileTasks = [...postCompileTasks, ...pageCompileTasks];
  ensureUniqueOutputTargets(allCompileTasks);
  return allCompileTasks;
}

function stageStaticAssets(buildData, paths, statusMap) {
  const siteAssets = walkFiles(ASSETS_DIR, (filePath) => {
    const rel = normalizePosixPath(relative(ASSETS_DIR, filePath));
    return rel !== "fonts.css"
      && !rel.startsWith("fonts/")
      && !WEBAPP_ICON_FILE_NAMES.includes(rel);
  });
  stageAssetGroup(ASSETS_DIR, siteAssets, paths.stagingSiteDir, "assets", statusMap, "assets:site ");
  stageAssetGroup(POSTS_DIR, buildData.postSource.assetFiles, paths.stagingSiteDir, "posts", statusMap, "assets:post ");
  stageAssetGroup(PAGES_DIR, buildData.pageSource.assetFiles, paths.stagingSiteDir, "", statusMap, "assets:page ");
}

function stageGeneratedFontAssets(fontBuildResult, stagingSiteDir, statusMap) {
  const { artifactPaths } = fontBuildResult;

  if (existsSync(artifactPaths.cssPath)) {
    stageFileFromSourceOrOutput(
      artifactPaths.cssPath,
      join(stagingSiteDir, "assets", "fonts.css"),
      statusMap,
      "assets/fonts.css",
    );
  }

  if (fontBuildResult.mode === "dev") {
    for (const descriptor of fontBuildResult.sourceAssetDescriptors) {
      const outputRel = normalizePosixPath(`assets/fonts/${descriptor.fileName}`);
      stageFileFromSourceOrOutput(
        descriptor.sourcePath,
        join(stagingSiteDir, outputRel),
        statusMap,
        outputRel,
      );
    }
    return;
  }

  const fontFiles = walkFiles(artifactPaths.outputDir);
  for (const sourcePath of fontFiles) {
    const rel = normalizePosixPath(relative(artifactPaths.outputDir, sourcePath));
    const outputRel = normalizePosixPath(`assets/fonts/${rel}`);
    stageFileFromSourceOrOutput(
      sourcePath,
      join(stagingSiteDir, outputRel),
      statusMap,
      outputRel,
    );
  }
}

function printBuildSummary({ outputSiteDir, allCompileTasks, statusMap, deletedFiles, posts, slugMaps }) {
  const updatedCount = Array.from(statusMap.values()).filter((value) => value === "updated").length;
  const unchangedCount = Array.from(statusMap.values()).filter((value) => value === "unchanged").length;

  console.log("Build succeeded!");
  console.log(`Out: ${outputSiteDir}`);
  console.log(`@ Compiled     : ${allCompileTasks.length}`);
  console.log(`+ Updated    : ${updatedCount}`);
  console.log(`: Unchanged  : ${unchangedCount}`);
  console.log(`- Deleted    : ${deletedFiles.length}`);
  console.log(`= Total      : ${updatedCount + unchangedCount + deletedFiles.length}`);
  console.log("");
  console.log(`- Posts      : ${posts.length}`);
  console.log(`- Tags       : ${Object.keys(slugMaps.tags).length}`);
  console.log(`- Categories : ${Object.keys(slugMaps.categories).length}`);

  if (deletedFiles.length > 0) {
    const preview = deletedFiles.slice(0, 10);
    console.log(`Deleted preview (${preview.length}/${deletedFiles.length}):`);
    for (const rel of preview) {
      console.log(`- ${rel}`);
    }
  }
}

// 构建主流程：采集 metadata -> 编译页面 -> 合并资源 -> 原子切换输出目录。
export async function buildSite({ outDirName, jobs, configPath, cacheRoot, fontMode, shareOrigin }) {
  const buildStartedAt = Date.now();
  const { paths, outputSiteDir } = prepareBuildPaths({ outDirName, configPath, cacheRoot });
  const configuredSiteInputs = readSiteConfigInputs(paths.siteConfigPath);
  const siteInputs = {
    ...configuredSiteInputs,
    activeSiteUrl: resolveActiveShareSiteUrl(configuredSiteInputs, shareOrigin),
  };
  const statusMap = new Map();

  try {
    const prepareStep = runTimedStepSync("prepare", () => {
      rmSync(paths.transientRoot, { recursive: true, force: true });
      mkdirSync(paths.stagingSiteDir, { recursive: true });
      mkdirSync(paths.metadataCacheDir, { recursive: true });
    });
    logPhase("prepare", prepareStep.durationMs, `(jobs=${jobs})`);

    const fontsStep = runTimedStepSync("fonts", () => buildFontArtifacts({
      cacheRoot: paths.cacheRoot,
      mode: fontMode,
    }));
    logPhase("fonts", fontsStep.durationMs, `(${fontsStep.result.status})`);

    const metadataStep = await runTimedStep("metadata", () => collectBuildData(paths, jobs));
    const buildData = metadataStep.result;
    logPhase("metadata", metadataStep.durationMs, `(${buildData.posts.length} posts)`);

    const taskStep = runTimedStepSync("tasks", () => buildCompileTaskSet(buildData, paths, siteInputs));
    const allCompileTasks = taskStep.result;
    logPhase("tasks", taskStep.durationMs, `(${allCompileTasks.length} outputs)`);

    const compileStep = await runTimedStep("compile", () => (
      compileAndStageTypstTasks(allCompileTasks, paths.stagingSiteDir, jobs, statusMap)
    ));
    logPhase("compile", compileStep.durationMs, `(${allCompileTasks.length} outputs)`);

    const shareStep = runTimedStepSync("share", () => {
      normalizeShareMetadataForSite({
        stagingSiteDir: paths.stagingSiteDir,
        compileTasks: allCompileTasks,
        posts: buildData.posts,
        siteInputs,
        statusMap,
      });
    });
    logPhase("share", shareStep.durationMs, `(${allCompileTasks.length} outputs)`);

    const assetsStep = runTimedStepSync("assets", () => {
      stageWebAppArtifacts(paths.stagingSiteDir, statusMap, siteInputs);
      stageStaticAssets(buildData, paths, statusMap);
      stageGeneratedFontAssets(fontsStep.result, paths.stagingSiteDir, statusMap);
    });
    logPhase(
      "assets",
      assetsStep.durationMs,
      `(${buildData.postSource.assetFiles.length} post, ${buildData.pageSource.assetFiles.length} page assets)`,
    );

    const rssStep = runTimedStepSync("rss", () => {
      stageRss(buildData.posts, outputSiteDir, paths.stagingSiteDir, paths.siteConfigPath, statusMap);
    });
    logPhase("rss", rssStep.durationMs);

    const finalizeStep = runTimedStepSync("finalize", () => {
      const deletedFiles = listDeletedFiles(outputSiteDir, statusMap.keys());
      finalizeOutput(paths.stagingSiteDir, outputSiteDir);
      return deletedFiles;
    });
    const deletedFiles = finalizeStep.result;
    logPhase("finalize", finalizeStep.durationMs, `(${deletedFiles.length} deleted)`);

    printBuildSummary({
      outputSiteDir,
      allCompileTasks,
      statusMap,
      deletedFiles,
      posts: buildData.posts,
      slugMaps: buildData.slugMaps,
    });
    logPhase("total", Date.now() - buildStartedAt);
  } finally {
    rmSync(paths.transientRoot, { recursive: true, force: true });
  }
}
