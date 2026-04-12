#import "lib/typ2html/typ2html.typ": *
#import "@preview/zebraw:0.6.1": zebraw

#let footer-content = [
  人的群岛
]

#let tag-options = (
  "博客搭建": (preset: "cyan", "icon": "/assets/icons/rocket.svg"),
  "Typst": ("preset": "teal", "icon": "/assets/icons/pen.svg"),
  "诗歌": ("preset": "typst", "icon": "/assets/icons/volume--up--filled--alt.svg"),
  "写作指南": ("preset": "blue", "icon": "/assets/icons/edit.svg"),
  "配置指南": ("preset": "green", "icon": "/assets/icons/settings.svg"),
)

#let render-tag-link = render-tag-link.with(tag-options: tag-options)
#let render-tag-card = render-tag-card.with(tag-options: tag-options)

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
  lang: false,
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
    "/tags/": "标签",
    // "/archive/": "归档",
    "/about/": "关于",
  ),
  title: "Typst Blog",
  lang: "en",
  footer-content: footer-content,
  tag-options: tag-options,
  custom-css: (
    "/assets/fonts.css",
    "/assets/custom.css",
  ),
  custom-script: (
    "/assets/custom.js",
  ),
)

#let template-post(
  preview-enabled: true,
  preview-font: ("Noto Serif CJK SC", "Noto Serif CJK TC"),
  poem-font: ("KaiTi", "Kaiti SC", "STKaiti", "LXGW WenKai", "Noto Serif CJK SC"),
  preview-size: 16pt,
  preview-lang: "zh",
  content-lang: auto,
  preview-table-inset: 9pt,
  preview-debug: false,
  outline-enabled: false,
  outline-title: [目录],
  category: "",
  ..args,
  body,
) = {
  let preview-raw-font = preview-raw-font-default
  let resolved-content-lang = if content-lang == auto { preview-lang } else { content-lang }
  let lang-head = str(resolved-content-lang).split("-").at(0, default: str(resolved-content-lang))
  let is-zh-content = lang-head == "zh"
  let content-font = if category == "诗歌" { poem-font } else { preview-font }

  set page(height: auto, width: 24cm) if preview-enabled
  set text(preview-size, font: content-font, lang: resolved-content-lang, weight: "regular") if preview-enabled
  set table(inset: preview-table-inset) if preview-enabled
  set par(leading: 1em) if preview-enabled
  set list(indent: 2em, spacing: 0em) if preview-enabled
  set enum(indent: 2em, spacing: 0em) if preview-enabled

  (templates.post)(category: category, lang: resolved-content-lang, ..args, [
    #show raw.where(block: true): it => {
      if is-html-target() {
        it
      } else {
        set text(font: preview-raw-font-default)
        preview-zebraw-default(it)
      }
    }
    #show raw.where(block: false): it => {
      if is-html-target() {
        it
      } else {
        let fields = it.fields()
        text.with(font: preview-raw-font-default)(fields.text)
      }
    }
    #if preview-enabled [
      #show math.equation: set text(preview-size)
    ]
    #if preview-debug [
      #context {
        let std-map = dictionary(std)
        let std-keys = std-map.keys().map(k => str(k)).sorted()
        let has-target = "target" in std-map
        let current-target = if has-target { target() } else { "N/A" }
        let raw-font-chain = preview-raw-font.map(v => str(v)).join(" -> ")
        [
          = Preview Style Debug

          - preview-enabled: #preview-enabled
          - preview-font (text): #preview-font
          - preview-size: #preview-size
          - preview-lang: #preview-lang
          - content-lang: #resolved-content-lang
          - preview-table-inset: #preview-table-inset
          - raw font chain: #raw-font-chain
          - std contains "target": #has-target
          - target(): #current-target
          - std key count: #std-keys.len()

          继承样式示例：The quick brown fox 你好，世界 12345

          `raw` 示例：
          ```ts
          const font = "debug";
          console.log(font);
          ```
        ]
      }
    ]
    #if outline-enabled [
      #outline(title: outline-title)
      #line(length: 100%, stroke: black + 0.5pt)
    ]
    #body
  ])
}

#let template-page = templates.page
