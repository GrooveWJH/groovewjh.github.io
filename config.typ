#import "lib/typ2html/typ2html.typ" as t2h

#let footer-content = [
  2026 \~ Present Carbon Typst Blog
]

#let template-post = t2h.template-post.with(
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
)

#let template-page = t2h.template-page.with(
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
)

#let format-post-date = t2h.format-post-date

#let quote = t2h.quote
#let note = t2h.note
#let success = t2h.success
#let warning = t2h.warning
#let error = t2h.error
