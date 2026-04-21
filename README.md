# Carbon Typst Blog

Carbon Typst Blog 是一个基于 Typst + Node.js 的静态博客项目。仓库内同时提供：

- 站点构建
- 本地 / 生产双 origin 的分享 metadata
- 多平台社交卡片预览页与 PNG 导出工具

## 环境要求

- `Node.js`
- `typst`
- 一个本地静态文件服务工具

这个仓库当前已经带有 `node_modules/`，一般不需要额外执行 `npm install`。

## 最短启动路径

如果你只是想在本地启动站点并查看分享卡片：

1. 构建站点和分享预览工具

```bash
npm run share:preview
```

2. 用 `127.0.0.1:5500` 启动 `_site/`

```bash
npx http-server _site -a 127.0.0.1 -p 5500 -c-1
```

3. 在浏览器打开

- 站点首页: [http://127.0.0.1:5500/](http://127.0.0.1:5500/)
- 分享卡片预览器: [http://127.0.0.1:5500/__tools/share-preview/](http://127.0.0.1:5500/__tools/share-preview/)

之所以推荐固定用 `127.0.0.1:5500`，是因为当前本地分享卡片 origin 就配置为这个地址，和 iMessage / 其他聊天软件本地预览时看到的 metadata 能保持一致。这里额外加了 `-c-1`，避免静态缓存干扰你反复调试分享卡片。

## 常用命令

- `npm run build`: 本地模式构建，输出到 `_site/`
- `npm run build:release`: 生产模式构建，分享 origin 使用 `https://groovewjh.github.io`
- `npm run build:preview`: 本地模式构建到 `_site-preview/`
- `npm run build:preview_release`: 生产模式构建到 `_site-preview/`
- `npm run share:preview`: 生成本地模式分享卡片预览页，输出到 `_site/__tools/share-preview/`
- `npm run share:preview_release`: 生成生产模式分享卡片预览页，输出到 `_site-preview/__tools/share-preview/`
- `npm run check:maxline:chrome`: 检查浏览器壳层相关源码都不超过 350 行
- `npm run check:maxline:share`: 检查 share / share-preview 子系统源码都不超过 300 行
- `npm test`: 运行全部测试

## 编写文章

- 在 `posts/` 下创建文章目录，并放入 `index.typ`
- 用 Typst 预览插件先检查排版
- 需要看完整 HTML 和分享卡片时，运行 `npm run share:preview`
- 构建完成后，继续用本地静态服务打开 `_site/`

文章封面、分享摘要、默认分享图、平台卡片近似渲染等行为，已经统一在构建期处理，不需要每篇文章手写一套 meta 标签。

## 分享卡片预览器

详细说明见 [docs/guides/share-preview.md](/Users/groove/Project/code/Toolkit/groove-typst-blog/docs/guides/share-preview.md)。

这份文档包含：

- 本地如何启动
- 本地模式与生产模式的区别
- 预览页如何切换页面 / 平台
- PNG 导出怎么用
- 为什么 iMessage 常不显示 description
