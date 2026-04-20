import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { cleanupTempDir } from "./test-helpers/typst-test-helpers.mjs";
import { buildSiteTemp, extractHead, outputExists, readOutputHtml } from "./test-helpers/share-test-helpers.mjs";

test("build emits normalized local share metadata and non-inline post cover html", () => {
  const built = buildSiteTemp({ shareOrigin: "local" });

  assert.equal(built.result.status, 0, `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`);

  const homeHead = extractHead(readOutputHtml(built.outDirPath, "index.html"));
  const aboutHead = extractHead(readOutputHtml(built.outDirPath, "about/index.html"));
  const droneHead = extractHead(readOutputHtml(built.outDirPath, "posts/articles/drone-needs-2026/index.html"));
  const preludeHtml = readOutputHtml(built.outDirPath, "posts/articles/prelude/index.html");
  const preludeHead = extractHead(preludeHtml);
  const noCoverNoDesc0Head = extractHead(readOutputHtml(built.outDirPath, "__test/post-layout-matrix/cases/desc-0-cover-0-outline-0/index.html"));
  const noCoverNoDesc1Head = extractHead(readOutputHtml(built.outDirPath, "__test/post-layout-matrix/cases/desc-0-cover-0-outline-1/index.html"));

  assert.match(homeHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(homeHead, /<meta property="og:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta name="twitter:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta name="twitter:description" content="站点首页">/);
  assert.match(homeHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);

  assert.match(aboutHead, /<meta property="og:site_name" content="Groove Blog">/);
  assert.match(aboutHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);

  assert.match(droneHead, /<link rel="canonical" href="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/">/);
  assert.match(droneHead, /<meta property="og:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/);
  assert.match(droneHead, /<meta name="twitter:title" content="｢2026年从生产力需求扩大角度看待无人机发展｣ · Groove Blog">/);
  assert.match(droneHead, /<meta property="og:url" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/">/);
  assert.match(droneHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/img\/cover\.png">/);
  assert.match(droneHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/drone-needs-2026\/img\/cover\.png">/);
  assert.match(droneHead, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(droneHead, /<meta name="twitter:description" content="本文内容来源于个人零碎随笔，由AI整理润色发布。">/);
  assert.doesNotMatch(droneHead, /posts\/posts/);

  assert.match(preludeHead, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.match(preludeHead, /<meta name="twitter:image" content="http:\/\/127\.0\.0\.1:5500\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.match(preludeHtml, /<div class="post-cover">[\s\S]*?<img[^>]+src="\/posts\/articles\/prelude\/img\/cover\.jpeg"/);
  assert.doesNotMatch(preludeHtml, /data:image\/png;base64/i);
  assert.ok(outputExists(built.outDirPath, "posts/articles/prelude/img/cover.jpeg"));

  assert.match(noCoverNoDesc0Head, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);
  assert.match(noCoverNoDesc1Head, /<meta property="og:image" content="http:\/\/127\.0\.0\.1:5500\/assets\/og-default\.png">/);

  const noCoverSummary0 = noCoverNoDesc0Head.match(/<meta name="twitter:description" content="([^"]+)">/)?.[1];
  const noCoverSummary1 = noCoverNoDesc1Head.match(/<meta name="twitter:description" content="([^"]+)">/)?.[1];
  assert.equal(noCoverSummary0, noCoverSummary1);

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});

test("build emits normalized production share metadata for pages and posts", () => {
  const built = buildSiteTemp({ shareOrigin: "prod" });

  assert.equal(built.result.status, 0, `Expected build to succeed.\nstdout:\n${built.result.stdout}\nstderr:\n${built.result.stderr}`);

  const homeHead = extractHead(readOutputHtml(built.outDirPath, "index.html"));
  const preludeHead = extractHead(readOutputHtml(built.outDirPath, "posts/articles/prelude/index.html"));

  assert.match(homeHead, /<meta property="og:title" content="｢首页｣ · Groove Blog">/);
  assert.match(homeHead, /<meta property="og:image" content="https:\/\/groovewjh\.github\.io\/assets\/og-default\.png">/);
  assert.match(preludeHead, /<meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">/);
  assert.match(preludeHead, /<meta name="twitter:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">/);
  assert.match(preludeHead, /<link rel="canonical" href="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/">/);
  assert.match(preludeHead, /<meta property="og:url" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/">/);
  assert.match(preludeHead, /<meta property="og:image" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.match(preludeHead, /<meta name="twitter:image" content="https:\/\/groovewjh\.github\.io\/posts\/articles\/prelude\/img\/cover\.jpeg">/);
  assert.ok(outputExists(built.outDirPath, "posts/articles/prelude/img/cover.jpeg"));

  cleanupTempDir(built.outDirPath);
  cleanupTempDir(built.cacheRootPath);
});
