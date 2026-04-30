#import "lib/typst-render/index.typ": *
#import "lib/typst-render/post/post.typ": format-post-date
#import "lib/typst-render/post/poem-frame.typ": poem-frame, poem-latin-font, poem-cjk-font, poem-content-font, render-poem-line-typst
#import "lib/typst-render/post/post-cover.typ": render-post-cover, has-cover-value
#import "lib/typst-render/post/template-post.typ": make-template-post
#import "@preview/zebraw:0.6.1": zebraw

#let footer-content = [人的群岛]

#let is-html-target() = "target" in dictionary(std) and target() == "html"

#let preview-raw-font-default = (
  "Noto Sans Mono CJK SC",
  "Noto Sans Mono CJK TC",
  "SF Mono",
  "Menlo",
  "DejaVu Sans Mono",
  "Noto Sans CJK SC",
  "Noto Sans CJK TC",
)

#let preview-zebraw-default = zebraw.with(
  numbering-separator: true,
  lang: true,
  radius: 0pt,
  background-color: luma(245),
  numbering-font-args: (
    font: preview-raw-font-default,
    fill: luma(45%),
  ),
)

#let templates = make-templates(
  site-title: "Groove Blog",
  header-links: (
    "/": "首页",
    "/categories/": "合集",
    "/about/": "关于",
  ),
  title: "Typst Blog",
  lang: "en",
  footer-content: footer-content,
  custom-css: (
    "/assets/fonts.css",
    "/assets/custom.css",
  ),
  custom-script: (
    "/assets/custom.js",
  ),
)

#let template-post = make-template-post(
  templates,
  is-html-target,
  preview-zebraw-default,
  preview-raw-font-default,
  has-cover-value,
  render-post-cover,
  poem-content-font,
)

#let template-page = templates.page
