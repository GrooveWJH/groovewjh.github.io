#import "lib/typ2html/typ2html.typ" as t2h

#let footer-content = [
  2026 \~ Present Carbon Typst Blog
]

#let category-intros = (
  :
  // "开发": "记录前端与 Typst 的实现细节。",
)

#let category-intro-of(category) = category-intros.at(category, default: "")

#let tag-options = (
  // 全量 tag 随机分配 preset，icon 统一保持 hashtag.svg
  "CSS": ("preset": "teal", "icon": "/assets/icons/hashtag.svg"),
  "Hello": ("preset": "cyan", "icon": "/assets/icons/hashtag.svg"),
  "前端": ("preset": "red", "icon": "/assets/icons/hashtag.svg"),
  "发布": ("preset": "magenta", "icon": "/assets/icons/hashtag.svg"),
  "实验": ("preset": "purple", "icon": "/assets/icons/hashtag.svg"),
  "巡检": ("preset": "warm-gray", "icon": "/assets/icons/hashtag.svg"),
  "年末": ("preset": "blue", "icon": "/assets/icons/hashtag.svg"),
  "开发日志": ("preset": "green", "icon": "/assets/icons/hashtag.svg"),
  "整理": ("preset": "cool-gray", "icon": "/assets/icons/hashtag.svg"),
  "测试": ("preset": "red", "icon": "/assets/icons/hashtag.svg"),
  "清单": ("preset": "teal", "icon": "/assets/icons/hashtag.svg"),
  "生活": ("preset": "cyan", "icon": "/assets/icons/hashtag.svg"),
  "界面": ("preset": "blue", "icon": "/assets/icons/hashtag.svg"),
  "观察": ("preset": "green", "icon": "/assets/icons/hashtag.svg"),
  "计划": ("preset": "purple", "icon": "/assets/icons/hashtag.svg"),
  "设计": ("preset": "magenta", "icon": "/assets/icons/hashtag.svg"),
  "读书": ("preset": "warm-gray", "icon": "/assets/icons/hashtag.svg"),
  "调试": ("preset": "gray", "icon": "/assets/icons/hashtag.svg"),
  "重构": ("preset": "cool-gray", "icon": "/assets/icons/hashtag.svg"),
  "随笔": ("preset": "gray", "icon": "/assets/icons/hashtag.svg"),
)

#let render-tag-link = t2h.render-tag-link.with(tag-options: tag-options)
#let render-tag-card = t2h.render-tag-card.with(tag-options: tag-options)
#let render-tag-title-icon = t2h.render-tag-title-icon.with(tag-options: tag-options)
#let render-page-breadcrumb = t2h.render-page-breadcrumb

#let templates = t2h.make-templates(
  site-title: "Carbon Typst Blog",
  header-links: (
    "/": "首页",
    "/categories/": "分类",
    "/tags/": "标签",
    "/archive/": "归档",
    "/about/": "关于",
  ),
  title: "Typst Blog",
  lang: "zh",
  footer-content: footer-content,
  tag-options: tag-options,
)

#let template-post = templates.post
#let template-page = templates.page

#let format-post-date = t2h.format-post-date

#let quote = t2h.quote
#let note = t2h.note
#let success = t2h.success
#let warning = t2h.warning
#let error = t2h.error
