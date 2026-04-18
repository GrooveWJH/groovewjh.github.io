import { availableParallelism } from "node:os";
import process from "node:process";

export function defaultBuildJobs(parallelism = availableParallelism()) {
  return Math.max(1, Number(parallelism) - 2);
}

// 打印构建脚本帮助信息
export function printHelp() {
  console.log(`Typ Blog HTML builder (Node.js)

Usage:
  node lib/node/build-html.mjs
  node lib/node/build-html.mjs --out _site
  node lib/node/build-html.mjs --jobs 4
  node lib/node/build-html.mjs --config config.typ --cache-root .typ-blog-cache
  node lib/node/build-html.mjs --font-mode release
  node lib/node/build-html.mjs --share-origin prod

Options:
  -o, --out     Output directory (default: _site)
  -j, --jobs    Typst compile worker count (default: logical CPU count - 2, min 1)
  -c, --config  Config file path relative to repo root (default: config.typ)
      --cache-root  Cache root folder relative to repo root (default: .typ-blog-cache)
      --font-mode   Font asset mode: auto | dev | release (default: auto)
      --share-origin  Share-card origin: local | prod (default: local)
      site.config.json  External site metadata for RSS/share (siteTitle/siteUrl/localSiteUrl/description/language)
  -h, --help    Show this help message
`);
}

// 解析 CLI 参数并提供默认值
export function parseArgs() {
  const args = process.argv.slice(2);
  let outDirName = "_site";
  let jobs = defaultBuildJobs();
  let configPath = "config.typ";
  let cacheRoot = ".typ-blog-cache";
  let fontMode = "auto";
  let shareOrigin = "local";

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--out" || arg === "-o") {
      outDirName = args[i + 1] || "_site";
      i += 1;
      continue;
    }

    if (arg === "--jobs" || arg === "-j") {
      const parsed = Number.parseInt(args[i + 1] || "", 10);
      if (!Number.isNaN(parsed) && parsed >= 1) {
        jobs = parsed;
      }
      i += 1;
      continue;
    }

    if (arg === "--config" || arg === "-c") {
      configPath = args[i + 1] || "config.typ";
      i += 1;
      continue;
    }

    if (arg === "--cache-root") {
      cacheRoot = args[i + 1] || ".typ-blog-cache";
      i += 1;
      continue;
    }

    if (arg === "--font-mode") {
      fontMode = args[i + 1] || "auto";
      i += 1;
      continue;
    }

    if (arg === "--share-origin") {
      const value = String(args[i + 1] || "").trim().toLowerCase();
      shareOrigin = value === "prod" ? "prod" : "local";
      i += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return {
    outDirName,
    jobs,
    configPath,
    cacheRoot,
    fontMode,
    shareOrigin,
  };
}
