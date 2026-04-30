import { join, relative } from 'node:path';
import { PAGES_DIR, POSTS_DIR, ROOT_DIR, TYPE_TOOLCHAIN_DIR } from '../../foundation/paths.mjs';
import { encodePublicPath } from '../../foundation/public-path.mjs';
import { assertRouteTokenUsage, normalizePosixPath, pagePathToOutputRel } from '../../node/build/helpers.mjs';
import { calcTotalPages, listPages, POSTS_PER_PAGE, withPagePath } from './page.mjs';
import { derivePagePathFromIndexTyp } from './post-metadata.mjs';
import { buildExtraInputs } from './site-inputs.mjs';

function buildPostsAndSlugsInputs(postsJsonPath, slugsJsonPath) {
  const sysInputRoot = join(TYPE_TOOLCHAIN_DIR, 'core');
  return {
    postsInput: normalizePosixPath(relative(sysInputRoot, postsJsonPath)),
    slugsInput: normalizePosixPath(relative(sysInputRoot, slugsJsonPath)),
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
  routeLabel = '',
}) {
  return {
    kind,
    sourceTypFile,
    pagePath,
    outputRel: pagePathToOutputRel(pagePath),
    inputs: [
      ['page-path', pagePath],
      ['public-page-path', encodePublicPath(pagePath)],
      ['posts-json', postsInput],
      ['slugs-json', slugsInput],
      ...routeInputs,
      ...extraInputs,
    ],
    dependencies,
    routeLabel,
  };
}

export function ensureUniqueOutputTargets(tasks) {
  const seen = new Map();

  for (const task of tasks) {
    const key = normalizePosixPath(task.outputRel);
    const existing = seen.get(key);
    if (existing) {
      throw new Error([`Output collision: ${key}`, `- ${existing.source}`, `- ${task.source}`].join('\n'));
    }

    seen.set(key, {
      source: `${normalizePosixPath(relative(ROOT_DIR, task.sourceTypFile))}${task.routeLabel ? ` (${task.routeLabel})` : ''}`,
    });
  }
}

export function makePostCompileTasks(postTypFiles, postsJsonPath, slugsJsonPath, dependencies, siteInputs = {}) {
  const { postsInput, slugsInput } = buildPostsAndSlugsInputs(postsJsonPath, slugsJsonPath);
  const extraInputs = buildExtraInputs(siteInputs);

  return postTypFiles.map((typFile) => {
    const pagePath = `posts/${derivePagePathFromIndexTyp(POSTS_DIR, typFile)}`;
    return createCompileTask({
      kind: 'post',
      sourceTypFile: typFile,
      pagePath,
      postsInput,
      slugsInput,
      extraInputs,
      dependencies: [...dependencies, postsJsonPath, slugsJsonPath],
    });
  });
}

function appendIndexPaginationTasks(tasks, typFile, postsLength, shared, kind, routeKind, basePath) {
  const totalPages = calcTotalPages(postsLength, POSTS_PER_PAGE);

  for (const pageNumber of listPages(totalPages)) {
    const pagePath = withPagePath(basePath, pageNumber);
    tasks.push(
      createCompileTask({
        kind,
        sourceTypFile: typFile,
        pagePath,
        postsInput: shared.postsInput,
        slugsInput: shared.slugsInput,
        extraInputs: shared.extraInputs,
        dependencies: shared.dependencies,
        routeInputs: [
          ['route-kind', routeKind],
          ['route-page', String(pageNumber)],
          ['route-page-size', String(POSTS_PER_PAGE)],
        ],
        routeLabel: `${routeKind}-page=${pageNumber}`,
      }),
    );
  }
}

function appendMappedRouteTasks(tasks, typFile, relTypPath, values, posts, slugMap, shared, routeKey, matchCount) {
  for (const value of values) {
    const slug = slugMap[value];
    const relTarget = relTypPath.replace(`[${routeKey}]`, slug);
    const basePath = derivePagePathFromIndexTyp(PAGES_DIR, join(PAGES_DIR, relTarget));
    const totalPages = calcTotalPages(matchCount(posts, value), POSTS_PER_PAGE);

    for (const pageNumber of listPages(totalPages)) {
      tasks.push(
        createCompileTask({
          kind: 'page',
          sourceTypFile: typFile,
          pagePath: withPagePath(basePath, pageNumber),
          postsInput: shared.postsInput,
          slugsInput: shared.slugsInput,
          extraInputs: shared.extraInputs,
          dependencies: shared.dependencies,
          routeInputs: [
            [`route-${routeKey}`, value],
            ['route-page', String(pageNumber)],
            ['route-page-size', String(POSTS_PER_PAGE)],
          ],
          routeLabel: `${routeKey}=${value},page=${pageNumber}`,
        }),
      );
    }
  }
}

export function makePageCompileTasks(
  pageTypFiles,
  posts,
  slugMaps,
  postsJsonPath,
  slugsJsonPath,
  dependencies,
  siteInputs = {},
) {
  const { postsInput, slugsInput } = buildPostsAndSlugsInputs(postsJsonPath, slugsJsonPath);
  const shared = {
    postsInput,
    slugsInput,
    extraInputs: buildExtraInputs(siteInputs),
    dependencies: [...dependencies, postsJsonPath, slugsJsonPath],
  };

  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
  const poemPosts = posts.filter((post) => post.category === '诗歌');
  const articlePosts = posts.filter((post) => post.category !== '诗歌');
  const tasks = [];

  for (const typFile of pageTypFiles) {
    const relTypPath = normalizePosixPath(relative(PAGES_DIR, typFile));
    const usage = assertRouteTokenUsage(relTypPath);

    if (relTypPath === 'index.typ') {
      appendIndexPaginationTasks(tasks, typFile, articlePosts.length, shared, 'page', 'article', '');
      appendIndexPaginationTasks(tasks, typFile, poemPosts.length, shared, 'page', 'poem', 'poems');
      continue;
    }

    if (usage.hasCategory) {
      appendMappedRouteTasks(
        tasks,
        typFile,
        relTypPath,
        categories,
        posts,
        slugMaps.categories,
        shared,
        'category',
        (entries, category) => entries.filter((post) => post.category === category).length,
      );
      continue;
    }

    tasks.push(
      createCompileTask({
        kind: 'page',
        sourceTypFile: typFile,
        pagePath: derivePagePathFromIndexTyp(PAGES_DIR, typFile),
        postsInput: shared.postsInput,
        slugsInput: shared.slugsInput,
        extraInputs: shared.extraInputs,
        dependencies: shared.dependencies,
      }),
    );
  }

  return tasks;
}
