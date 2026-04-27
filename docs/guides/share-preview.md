# Share Preview 本地使用说明

这套工具不是一个独立服务，而是“构建后附带在站点里的工具页”。

也就是说，你要先生成静态站点，再用本地静态文件服务把它跑起来，最后打开预览页。

## 你现在要达到的结果

完成后你应该能在本地看到两样东西：

- 博客站点本身
- 社交卡片预览器，地址是 `/tools/share-preview/`

## 启动本地分享卡片预览

### 1. 生成本地模式构建产物

```bash
npm run share:preview
```

这个命令会做两件事：

1. 先按本地 origin 构建站点
2. 再把分享卡片预览工具写入 `_site/tools/share-preview/`

当前本地 origin 固定是 `http://127.0.0.1:5500`。

### 2. 启动本地静态文件服务

推荐直接把 `_site/` 绑定到 `127.0.0.1:5500`：

```bash
npx http-server _site -a 127.0.0.1 -p 5500 -c-1
```

这样做的原因很简单：分享 metadata 里的本地绝对地址就是这个 origin。地址不一致时，卡片字段本身仍然能看，但某些依赖绝对 URL 的平台近似效果会偏离真实情况。`-c-1` 用来禁用缓存，方便你连续改 metadata 后立刻刷新验证。

### 3. 打开工具页

浏览器打开：

- 站点首页: [http://127.0.0.1:5500/](http://127.0.0.1:5500/)
- 分享卡片预览器: [http://127.0.0.1:5500/tools/share-preview/](http://127.0.0.1:5500/tools/share-preview/)

## 生产部署后的入口

GitHub Pages 发布完成后，正式地址固定为：

- [https://groovewjh.github.io/tools/share-preview/](https://groovewjh.github.io/tools/share-preview/)

这个工具页会带 `noindex, nofollow`，因此它是站内工具，而不是对外索引内容页。

## 预览页里能做什么

当前预览页是一个 desktop-only 的三栏校对台：

- 左侧：文章搜索与列表，同时显示每篇文章当前有多少个分享字段问题
- 中间：卡片预览舞台，只保留预览相关状态，例如 smart colors 和 square canvas
- 右侧：常驻 review / payload inspector

这套工具现在只针对 `iMessage+` 导出模板，不再做多平台切换演示页。

右侧 inspector 默认打开 `Review`：

- 当前页面标题与路径
- 是否缺 description / cover / published date / canonical / QR
- 显示字段开关、圆角、description break 等控制
- 导出 PNG 与打开原页面

次级 tab 是 `Payload`，用于核对当前页面真实输出的分享字段。

## 导出 PNG

右侧 inspector 顶部有 `Export PNG` 按钮。

它会导出当前激活平台的单张卡片 PNG，默认是 2x 像素密度。

文件名格式是：

```text
<slug-or-page>__<template>.png
```

## 本地模式和生产模式的区别

### 本地模式

命令：

```bash
npm run share:preview
```

特点：

- 构建目录是 `_site/`
- 分享 origin 是 `http://127.0.0.1:5500`
- 适合本地测试 iMessage / 聊天软件对本地页面的解析效果

### 生产模式

命令：

```bash
npm run share:preview_release
```

特点：

- 构建目录是 `_site-preview/`
- 分享 origin 是 `https://groovewjh.github.io`
- 适合检查最终上线后会输出什么 canonical / og:url / og:image

如果你要在本地打开生产模式结果，可以再起一个静态服务指向 `_site-preview/`。但它的分享字段会指向生产域名，这属于预期行为。

### Deploy 如何附着 preview

正式 deploy 不会单独重跑一套 preview build，而是在 release build 完成后把 preview 工具附着进现有 `_site/`：

```bash
npm run build:release -- --jobs 4
npm run share:preview_attach
```

这样 GitHub Pages 最终上传的仍然是同一个 `_site/`，只是其中额外包含 `/tools/share-preview/`。

## 常见疑问

### 为什么现在只有 iMessage+

这套页面现在定位成“导出前校对台”，不是泛平台展示台。

当前保留的唯一模板是 `iMessage+`。它保留 iMessage 的视觉气质，但在导出场景里更强调标题、description、封面和分享目标是否完整，适合做最终校对与 PNG 导出。

### 我只改了文章内容，需要每次都重跑吗

如果你改动会影响最终 HTML 或分享 metadata，就需要重新构建一次。

最直接的做法还是重新执行：

```bash
npm run share:preview
```

## 相关命令

- `npm run build`
- `npm run build:release`
- `npm run build:preview`
- `npm run build:preview_release`
- `npm run share:preview`
- `npm run share:preview_attach`
- `npm run share:preview_release`
- `npm run check:maxline:share`
- `npm test`
