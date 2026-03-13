# Node HTML Build

This directory contains the Node.js HTML build script for `typ-blog`: `build-html.mjs`.

## Goals

- Build HTML only (no PDF output).
- Copy static HTML from `pages` and compile Typst posts from `posts` into the output directory (default `_site`, optional `_side`).
- Extract post metadata from generated HTML and write auxiliary data files.
- Auto-generate tag pages from `pages/tag/[tag].html`.
- Auto-generate category pages from `pages/category/[category].html`.

## Usage

```bash
node lib/node/build-html.mjs
node lib/node/build-html.mjs --out _side
node lib/node/build-html.mjs --force
```

## Input/Output Mapping

1. `pages/**/*.html` (excluding `pages/tag/[tag].html` and `pages/category/[category].html`)
   - Copied to `<outDir>/` with the same relative paths.

2. `posts/**/*.typ`
   - Compiled to HTML via `typst compile --format html --features html`.
   - Written to `<outDir>/` with the same relative paths and `.typ` replaced by `.html`.
   - Example:
     - `posts/hello/index.typ` -> `<outDir>/hello/index.html`

3. `assets/**`
   - Copied to `<outDir>/assets/**`.

4. Metadata aggregation and injection
   - Parses `title`, `description`, `tags`, `category`, and `date` from post HTML.
   - Also records `lastModified` from file mtime.
   - Writes:
     - `<outDir>/blog-data.json`
     - `<outDir>/assets/blog-data.js` (`window.__BLOG_POSTS__`)
   - Injects JSON script blocks into HTML (for example `post-meta` / `blog-posts`).

5. Post asset copy
   - Copies all non-`.typ` files under `posts/**` (for example images, `.bib`) to matching paths under `<outDir>/**`.
   - Incremental copy: only copies when source is newer or target does not exist.

6. Tag page generation (Astro-like dynamic route)
   - Uses `pages/tag/[tag].html` as the template.
   - Generates one page per tag: `<outDir>/tag/<tag-slug>.html`.
   - Supported placeholders:
     - `{{tag}}`
     - `{{count}}`
     - `{{postsJson}}`
     - `{{postsList}}`

7. Category page generation (Astro-like dynamic route)
   - Uses `pages/category/[category].html` as the template.
   - Generates one page per category: `<outDir>/category/<category-slug>.html`.
   - Supported placeholders:
      - `{{category}}`
      - `{{count}}`
      - `{{postsJson}}`
      - `{{postsList}}`

## Notes

- The builder does not create fallback/default HTML files.
- Tag and category generation rely on template replacement (`replaceAll`) only.
