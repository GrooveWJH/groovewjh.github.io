# Maxline + Good Taste Review TODO

Date: 2026-04-19
Repo: `groove-typst-blog`
Method: `check-maxline` + Linus-style taste review

## Review Summary

Taste score: `🟡 凑合`

This codebase has a strong direction, but several core files are now carrying too many responsibilities at once. The biggest risk is not raw line count by itself. The real problem is drift pressure:

- duplicated logic across Typst and HTML paths
- procedural route/task expansion instead of data-driven generation
- orchestration, policy, and I/O mixed in the same file
- a few growing "god modules" that future features will keep inflating

## Maxline Results

### Repo scan (`max-lines = 300`)

Files reported by `check-maxline`:

- `lib/node/build-fonts.mjs` — 720
- `assets/core/foundation/themes.css` — 540
- `lib/typ2html/typ2html.typ` — 462
- `assets/core/layout/header.css` — 420
- `assets/core/foundation/tokens.css` — 412
- `lib/node/template-post.test.mjs` — 405
- `config.typ` — 394
- `assets/core/components/code-math.css` — 378
- `assets/core/behavior/home-filter.js` — 361
- `lib/node/post-layout.test.mjs` — 349
- `lib/node/share-metadata.test.mjs` — 335
- `posts/_hidden/typst-example/index.typ` — 311

### Tool caveat

`check-maxline` excludes directories named `build` by default, so it **missed** `lib/node/build/*.mjs` on the repo-wide scan. A targeted scan on `lib/node/build` found:

- `lib/node/build/core.mjs` — 722
- `lib/node/build/share.mjs` — 314

This means the repo should add a local `check-maxline` config or wrapper command so future scans do not silently skip the build pipeline.

## Highest-Value Findings

### 1. Cover logic is duplicated across Typst entry layers
Files:
- `config.typ:68`
- `config.typ:161`
- `lib/typ2html/typ2html.typ:22`
- `lib/typ2html/typ2html.typ:56`

Problem:
- cover path parsing and normalization live in both `config.typ` and `lib/typ2html/typ2html.typ`
- same concepts, same branches, same failure policy, different copies
- this is classic drift bait; every future cover change now has two truth sources

Why it is bad taste:
- duplicated policy is a hidden special case
- the system no longer has a single place that defines what a valid cover is

### 2. Font build pipeline is one oversized mixed-responsibility module
File:
- `lib/node/build-fonts.mjs:205`
- `lib/node/build-fonts.mjs:393`
- `lib/node/build-fonts.mjs:609`
- `lib/node/build-fonts.mjs:685`

Problem:
- one file handles CLI parsing, tool detection, corpus collection, fingerprinting, planning, CSS emission, subset execution, artifact syncing, and logging
- `buildSubsetDescriptors` still encodes a `site-kai` special case inline
- `buildFontArtifacts` also embeds the dev/release mode split directly inside the same orchestration path

Why it is bad taste:
- the module is solving too many different problems at once
- special cases are encoded in execution flow, not in data
- future font families or subset rules will keep making this file worse

### 3. Build pipeline task generation is procedural and branch-heavy
File:
- `lib/node/build/core.mjs:281`
- `lib/node/build/core.mjs:303`
- `lib/node/build/core.mjs:325`
- `lib/node/build/core.mjs:354`
- `lib/node/build/core.mjs:397`
- `lib/node/build/core.mjs:639`

Problem:
- article index pagination, poem index pagination, tag routes, category routes, and static pages are all expanded through separate append functions
- the route model is implicit in control flow rather than explicit in data
- `buildSite` is a long orchestration function that also owns cleanup, logging, and sequencing details

Why it is bad taste:
- there are too many route-specific branches doing nearly the same thing
- this is a case where “theory loses”: the system wants route descriptors, not more append helpers

### 4. Home filter behavior is a mini state machine trapped inside one installer function
File:
- `assets/core/behavior/home-filter.js:180`
- `assets/core/behavior/home-filter.js:199`
- `assets/core/behavior/home-filter.js:254`
- `assets/core/behavior/home-filter.js:289`
- `assets/core/behavior/home-filter.js:327`

Problem:
- `installHomeFilter` owns cache, storage, history, fetch cancellation, DOM replacement, event binding, and fallback navigation all at once
- state transitions exist, but they are implicit
- the code is readable today only because the feature is still small enough to fit in one head

Why it is bad taste:
- it is one function with too many mutable concerns
- if this feature gains prefetching, scroll restore, transition animation, or error UI, this file will tip into thrash

### 5. Share metadata rewrite is stringly-typed HTML surgery
File:
- `lib/node/build/share.mjs:51`
- `lib/node/build/share.mjs:127`
- `lib/node/build/share.mjs:190`
- `lib/node/build/share.mjs:246`
- `lib/node/build/share.mjs:260`

Problem:
- extraction and rewrite rely on regex-driven HTML matching
- meta normalization, summary extraction, and head rewriting are bundled in one module
- there is no explicit intermediate head model; everything stays as strings until write-back

Why it is bad taste:
- this is fragile string manipulation hiding as a metadata pipeline
- it works, but the interface shape is wrong: the code wants a parsed head/article model

### 6. Design tokens and themes are carrying large static tables without boundaries
Files:
- `assets/core/foundation/tokens.css:9`
- `assets/core/foundation/themes.css:1`

Problem:
- the palette table and semantic theme layers are both huge
- this is not a runtime bug, but it is a maintenance smell
- visual token data is mixed with theme wiring and grows by copy-editing long files

Why it is bad taste:
- large static tables are fine only if they are clearly the source of truth
- right now the structure feels hand-maintained rather than deliberately generated or segmented

## TODO Plan

### P0 — Stop logic drift in shared content rendering
- [ ] Extract cover parsing/normalization into one shared Typst helper module and have both `config.typ` and `lib/typ2html/typ2html.typ` import it.
- [ ] Define one canonical cover data shape: source path, resolved path, width, alt.
- [ ] Remove duplicate implementations of `normalize-project-path`, `extract-cover-source`, and `resolve-cover-path` from whichever layer becomes non-canonical.
- [ ] Add a regression test that fails if Typst preview and HTML resolve the same relative cover differently.

### P1 — Split the font pipeline by responsibility
- [ ] Split `lib/node/build-fonts.mjs` into at least four modules: source/corpus collection, planning/fingerprints, subset execution, and CLI entry.
- [ ] Replace the `site-kai` inline branch with a data-driven subset profile per family.
- [ ] Move dev-mode CSS/source passthrough into a dedicated adapter so release planning logic does not carry dev concerns.
- [ ] Keep `buildFontArtifacts(...)` as a thin orchestration entry point, not the implementation of every step.
- [ ] Add a local maxline rule for `lib/node/build` so this area stops escaping repo-wide scans.

### P1 — Make route generation data-driven
- [ ] Replace `appendIndexPaginationTasks`, `appendPoemIndexPaginationTasks`, `appendTagRouteTasks`, and `appendCategoryRouteTasks` with a small route descriptor table plus one generic expander.
- [ ] Separate route discovery from task materialization in `lib/node/build/core.mjs`.
- [ ] Shrink `buildSite(...)` into stage-level helpers that return explicit outputs instead of mutating shared local context everywhere.
- [ ] Keep one orchestration function, but make it read like a pipeline rather than a long imperative script.

### P1 — Refactor home-filter into explicit state and adapters
- [ ] Extract pure state helpers from `assets/core/behavior/home-filter.js`: route parsing, storage, history payloads, and page clamping.
- [ ] Extract a fetch/cache layer from DOM mutation code.
- [ ] Extract DOM apply/update operations into a renderer adapter.
- [ ] Keep `installHomeFilter()` as the thin composition root only.
- [ ] Add one test layer for state transitions and keep DOM tests focused on integration, not every branch.

### P2 — Turn share metadata rewriting into a real pipeline
- [ ] Split `lib/node/build/share.mjs` into three stages: extract, normalize payload, rewrite head.
- [ ] Introduce an explicit head tag model instead of performing all management through regex replacements.
- [ ] Keep regex only at the boundary if needed, not as the internal representation.
- [ ] Add tests for repeated rewrite idempotency and malformed-but-tolerable head structures.

### P2 — Put hard boundaries around large static CSS data
- [ ] Split raw palette tokens from semantic site tokens.
- [ ] Split theme overrides from shared token declarations.
- [ ] Decide whether theme/token tables should stay handwritten or be generated from a small source manifest; do not stay in the current ambiguous middle.
- [ ] Add maxline thresholds for CSS separately from JS/Typst so the pressure stays honest.

### P3 — Reduce test-file sprawl without losing coverage
- [ ] Split `lib/node/template-post.test.mjs`, `lib/node/post-layout.test.mjs`, and `lib/node/share-metadata.test.mjs` by behavior group rather than by “one big file per subsystem”.
- [ ] Separate preview tests, HTML tests, and matrix/integration tests.
- [ ] Keep helpers in one shared test utility module to avoid re-growing giant test files.

## Suggested Maxline Policy

Recommended initial thresholds:

- `lib/node/build/*.mjs`: `250`
- `lib/node/*.test.mjs`: `220`
- `assets/core/behavior/*.js`: `220`
- `lib/**/*.typ`: `220`
- `assets/core/**/*.css`: `260`

Add explicit exceptions only for deliberate data files, not for orchestration modules.

## First Refactor Order

1. Extract shared cover helpers.
2. Split `home-filter.js` into state/fetch/dom layers.
3. Make route generation data-driven in `lib/node/build/core.mjs`.
4. Split `build-fonts.mjs` into planner/executor/CLI.
5. Normalize `share.mjs` into extract/normalize/rewrite stages.

This order gives the best payoff: first remove drift, then simplify fast-moving behavior code, then attack the build pipeline.
