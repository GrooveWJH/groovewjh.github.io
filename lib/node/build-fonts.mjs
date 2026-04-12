#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import {
  ASSETS_DIR,
  PAGES_DIR,
  POSTS_DIR,
  ROOT_DIR,
  TYPE_TOOLCHAIN_DIR,
} from "./build/constants.mjs";
import { walkFiles } from "./build/helpers.mjs";
import { dedupeCodepoints, splitBasicAndSiteText } from "./font-subset.mjs";

const FONT_SOURCE_DIR = join(ROOT_DIR, "fonts-src");
const FONT_OUTPUT_DIR = join(ASSETS_DIR, "fonts");
const FONT_OUTPUT_CSS_PATH = join(ASSETS_DIR, "fonts.css");
const ALLOWED_TEXT_EXTENSIONS = new Set([".typ", ".md", ".txt"]);
const BASIC_ASCII_TEXT = dedupeCodepoints(
  Array.from({ length: 95 }, (_, index) => String.fromCodePoint(0x20 + index)).join("")
  + "\n\r\t",
);
const BASIC_UNICODE_RANGE = "U+0009-000D, U+0020-007E";
const SITE_CJK_UNICODE_RANGE = "U+3000-303F, U+3400-4DBF, U+4E00-9FFF, U+FF00-FFEF";

const FONT_SPECS = [
  {
    familyName: "Site Noto Sans",
    slug: "noto-sans-sc",
    source: {
      400: join(FONT_SOURCE_DIR, "NotoSansCJKsc-Regular.otf"),
      700: join(FONT_SOURCE_DIR, "NotoSansCJKsc-Bold.otf"),
    },
  },
  {
    familyName: "Site Noto Serif",
    slug: "noto-serif-sc",
    source: {
      400: join(FONT_SOURCE_DIR, "NotoSerifCJKsc-Regular.otf"),
      700: join(FONT_SOURCE_DIR, "NotoSerifCJKsc-Bold.otf"),
    },
  },
  {
    familyName: "Site Noto Mono",
    slug: "noto-mono-sc",
    source: {
      400: join(FONT_SOURCE_DIR, "NotoSansMonoCJKsc-Regular.otf"),
      700: join(FONT_SOURCE_DIR, "NotoSansMonoCJKsc-Bold.otf"),
    },
  },
  {
    familyName: "Site Kai",
    slug: "site-kai",
    source: {
      400: join(FONT_SOURCE_DIR, "Kaiti.ttf"),
    },
  },
];

const STATIC_TEXT_SOURCES = [
  join(ROOT_DIR, "config.typ"),
  POSTS_DIR,
  PAGES_DIR,
  TYPE_TOOLCHAIN_DIR,
  join(ROOT_DIR, "site.config.json"),
];

function readSourceText(sourcePath) {
  const extension = extname(sourcePath).toLowerCase();
  if (ALLOWED_TEXT_EXTENSIONS.has(extension) || basename(sourcePath) === "site.config.json") {
    return readFileSync(sourcePath, "utf8");
  }

  const files = walkFiles(
    sourcePath,
    (filePath) => ALLOWED_TEXT_EXTENSIONS.has(extname(filePath).toLowerCase()),
  );

  return files.map((filePath) => readFileSync(filePath, "utf8")).join("\n");
}

function collectCorpusText() {
  const chunks = [
    "Groove Blog 标签 日期 分类 上一篇 下一篇 目录 关于 文章 诗歌 Typst HTML CSS JavaScript 你好世界",
  ];

  for (const sourcePath of STATIC_TEXT_SOURCES) {
    if (!existsSync(sourcePath)) continue;
    chunks.push(readSourceText(sourcePath));
  }

  return chunks.join("\n");
}

function collectPoemCorpusText() {
  const poemRoot = join(POSTS_DIR, "poems");
  if (!existsSync(poemRoot)) {
    return "";
  }

  return readSourceText(poemRoot);
}

function ensureSourcesExist() {
  const missing = [];

  for (const spec of FONT_SPECS) {
    for (const sourcePath of Object.values(spec.source)) {
      if (!existsSync(sourcePath)) {
        missing.push(sourcePath);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing font sources:\n- ${missing.join("\n- ")}`);
  }
}

function runPyftsubset(sourcePath, outputPath, textFilePath) {
  const subsetTempPath = `${outputPath}.subset${extname(sourcePath)}`;
  const result = spawnSync(
    "pyftsubset",
    [
      sourcePath,
      `--output-file=${subsetTempPath}`,
      `--text-file=${textFilePath}`,
      "--layout-features=*",
      "--passthrough-tables",
      "--ignore-missing-glyphs",
      "--ignore-missing-unicodes",
      "--name-IDs=*",
      "--name-legacy",
      "--name-languages=*",
      "--glyph-names",
      "--symbol-cmap",
      "--legacy-cmap",
      "--notdef-glyph",
      "--notdef-outline",
    ],
    {
      cwd: ROOT_DIR,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `pyftsubset failed for ${sourcePath}\n${(result.stderr || result.stdout || "").trim()}`,
    );
  }

  const compressResult = spawnSync("woff2_compress", [subsetTempPath], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });

  if (compressResult.status !== 0) {
    throw new Error(
      `woff2_compress failed for ${subsetTempPath}\n${(compressResult.stderr || compressResult.stdout || "").trim()}`,
    );
  }

  const compressedPath = subsetTempPath.replace(/\.(otf|ttf)$/i, ".woff2");
  renameSync(compressedPath, outputPath);
  rmSync(subsetTempPath, { force: true });
}

function buildSubsetSet(spec, tempDir, basicText, siteText) {
  for (const [weight, sourcePath] of Object.entries(spec.source)) {
    const sourceWeight = Number(weight);
    const subsets = [
      { suffix: "basic", text: BASIC_ASCII_TEXT + basicText },
      { suffix: "site-cjk", text: siteText },
    ];

    for (const subset of subsets) {
      const textValue = dedupeCodepoints(subset.text);
      const textFilePath = join(tempDir, `${spec.slug}-${subset.suffix}-${sourceWeight}.txt`);
      const outputPath = join(FONT_OUTPUT_DIR, `${spec.slug}-${subset.suffix}-${sourceWeight}.woff2`);

      writeFileSync(textFilePath, textValue, "utf8");
      runPyftsubset(sourcePath, outputPath, textFilePath);
    }
  }
}

function buildFontCss() {
  const lines = [
    "/* Generated by npm run fonts:build. */",
    "",
  ];

  for (const spec of FONT_SPECS) {
    for (const weight of Object.keys(spec.source)) {
      const subsets = [
        { suffix: "basic", unicodeRange: BASIC_UNICODE_RANGE },
        { suffix: "site-cjk", unicodeRange: SITE_CJK_UNICODE_RANGE },
      ];

      for (const subset of subsets) {
        const fileName = `${spec.slug}-${subset.suffix}-${weight}.woff2`;
        lines.push("@font-face {");
        lines.push(`  font-family: "${spec.familyName}";`);
        lines.push(`  src: url("/assets/fonts/${fileName}") format("woff2");`);
        lines.push("  font-style: normal;");
        lines.push(`  font-weight: ${weight};`);
        lines.push("  font-display: swap;");
        lines.push(`  unicode-range: ${subset.unicodeRange};`);
        lines.push("}");
        lines.push("");
      }
    }
  }

  writeFileSync(FONT_OUTPUT_CSS_PATH, `${lines.join("\n").trim()}\n`, "utf8");
}

function main() {
  ensureSourcesExist();

  rmSync(FONT_OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(FONT_OUTPUT_DIR, { recursive: true });

  const siteCorpus = collectCorpusText();
  const poemCorpus = collectPoemCorpusText();
  const { basicText, siteText } = splitBasicAndSiteText(siteCorpus);
  const { basicText: poemBasicText, siteText: poemSiteText } = splitBasicAndSiteText(poemCorpus);
  const tempDir = mkdtempSync(join(tmpdir(), "groove-fonts-"));

  try {
    for (const spec of FONT_SPECS) {
      if (spec.slug === "site-kai") {
        buildSubsetSet(spec, tempDir, poemBasicText, poemSiteText);
      } else {
        buildSubsetSet(spec, tempDir, basicText, siteText);
      }
    }

    buildFontCss();
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("Font subsets built successfully.");
}

main();
