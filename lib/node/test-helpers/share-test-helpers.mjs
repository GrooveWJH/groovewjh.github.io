import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT_DIR, createTempDir, buildTypstHtml } from "./typst-test-helpers.mjs";

export { ROOT_DIR, buildTypstHtml };

export function buildSiteTemp({ shareOrigin = "local" } = {}) {
  const outDirPath = createTempDir(".tmp-share-site-");
  const outDirName = relative(ROOT_DIR, outDirPath);
  const cacheRootPath = createTempDir(".tmp-share-cache-");
  const cacheRootName = relative(ROOT_DIR, cacheRootPath);
  const result = spawnSync(
    "node",
    ["lib/node/build-html.mjs", "--out", outDirName, "--cache-root", cacheRootName, "--share-origin", shareOrigin],
    { cwd: ROOT_DIR, encoding: "utf8" },
  );

  return { outDirPath, cacheRootPath, result };
}

export function extractHead(html) {
  const match = html.match(/<head>([\s\S]*?)<\/head>/i);
  return match ? match[1] : "";
}

export function readOutputHtml(outDirPath, relPath) {
  return readFileSync(join(outDirPath, relPath), "utf8");
}

export function extractMetadataJson(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const jsonMatch = (bodyMatch ? bodyMatch[1] : html).match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch?.[0] || "{}");
}

export function outputExists(outDirPath, relPath) {
  return existsSync(join(outDirPath, relPath));
}
