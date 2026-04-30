# Node HTML Build

`build-html.mjs` 是当前项目的静态构建入口，负责把 `posts/`、`pages/`、`assets/` 汇总到输出目录（默认 `_site`）。其中博客文章会生成到 `_site/posts/<slug>/index.html`。

## Usage

```bash
npm run build
npm run build:fast
npm run build:preview
npm run fonts:build
npm run assets:webapp
```

## CLI Options

- `-o, --out`：输出目录名（相对仓库根目录）
- `-f, --force`：忽略时间戳，强制刷新所有编译和复制任务
- `-j, --jobs`：Typst 并发编译进程数（默认 `逻辑核心数 - 2`，最小为 `1`）
- `-h, --help`：显示帮助

## Build Flow

1. 清空 `.typ-blog-cache/transient/`，保留 `.typ-blog-cache/artifacts/` 下的持久工件缓存。
2. 检查字体工件 manifest；命中时复用缓存，未命中时仅重建受影响的字体子集。
3. 逐个编译 `posts/**/index.typ` 的 metadata 输出，生成 `_posts-metadata.json`。
4. 基于 category 执行 slugify，并对冲突（不同值映射到同一 slug）直接报错。
5. 展开动态路由页面（`[category]`），并校验路径 token 最多出现一次。
6. 编译 `posts/` 与 `pages/` 的 `index.typ` 到临时站点目录；其中文章固定输出到 `/posts/<slug>/`，按 `updated` / `unchanged` 标记。
7. 生成并发布 Web App 资源：`assets/apple-touch-icon.png`、manifest 所需 icon，以及站点根目录的 `manifest.webmanifest`。
8. 同步 `assets/`、`posts/`、`pages/` 下非 `.typ` 文件到临时目录；生成字体则从工件缓存复制到 `assets/fonts.css` 与 `assets/fonts/*.woff2`。
9. 对比旧输出目录，计算不再保留的文件并标记 `deleted`。
10. 将临时目录整体移动到目标输出目录。

## Notes

- 动态路由模板路径中，`[category]` 最多出现一次；`[tag]` 不再受支持。
- 旧输出目录中的未保留文件会在发布阶段被移除。
- `posts/_hidden/**` 与 `posts/_drafts/**` 会在构建时被忽略（包含文章编译与静态资源同步）。
- 构建结束后只会清理 `.typ-blog-cache/transient/`，字体工件缓存在 `.typ-blog-cache/artifacts/fonts/` 中保留。
- 构建脚本已拆分为 `build/` 目录下多个模块（`cli`、`core`、`helpers`、`typst`、`pool`、`progress`）。
- 并发阶段使用项目内置进度条实现，不依赖第三方包。
