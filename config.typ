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

#let has-text-value(value) = value != none and str(value) != ""
#let default-cover-width = 75%
#let default-cover-width-css = "75%"

#let is-image-cover-value(cover) = cover != none and type(cover) == content and cover.func() == image

#let extract-cover-source(cover) = {
  if cover == none {
    none
  } else if is-image-cover-value(cover) {
    cover.fields().at("source", default: none)
  } else if type(cover) == str {
    cover
  } else {
    panic("cover must be a string path or an image(...) object")
  }
}

#let has-cover-value(cover) = {
  let source = extract-cover-source(cover)
  source != none and str(source) != ""
}

#let normalize-cover-width(cover) = {
  if not is-image-cover-value(cover) {
    (
      render-width: default-cover-width,
      render-width-percent: default-cover-width-css,
    )
  } else {
    let cover-width = cover.fields().at("width", default: none)

    if cover-width == none {
      (
        render-width: default-cover-width,
        render-width-percent: default-cover-width-css,
      )
    } else {
      let cover-width-repr = repr(cover-width)

      if cover-width-repr.ends-with(" + 0pt") {
        (
          render-width: cover-width,
          render-width-percent: cover-width-repr.replace(" + 0pt", ""),
        )
      } else {
        panic("cover width must be omitted or a percentage width")
      }
    }
  }
}

#let stringify-cover-alt(value) = {
  if value == none {
    ""
  } else if type(value) == str {
    value
  } else {
    ""
  }
}

#let resolve-cover-alt(cover, alt: none) = {
  let explicit-alt = stringify-cover-alt(alt)

  if has-text-value(explicit-alt) {
    explicit-alt
  } else if is-image-cover-value(cover) {
    let cover-alt = cover.fields().at("alt", default: none)
    let normalized-alt = stringify-cover-alt(cover-alt)
    if has-text-value(normalized-alt) {
      normalized-alt
    } else {
      ""
    }
  } else {
    ""
  }
}

#let normalize-post-cover(cover, alt: none) = {
  let source = extract-cover-source(cover)

  if source == none or str(source) == "" {
    none
  } else {
    let width = normalize-cover-width(cover)
    (
      source-path: str(source),
      resolved-source-path: resolve-cover-path(source),
      render-width: width.at("render-width"),
      render-width-percent: width.at("render-width-percent"),
      alt: resolve-cover-alt(cover, alt: alt),
    )
  }
}

#let normalize-project-path(path-text) = {
  let normalized-parts = ()
  for part in str(path-text).split("/") {
    if part == "" or part == "." {
      continue
    }

    if part == ".." {
      if normalized-parts.len() > 0 {
        normalized-parts.pop()
      }
      continue
    }

    normalized-parts.push(part)
  }

  "/" + normalized-parts.join("/")
}

#let resolve-cover-path(cover) = {
  let source = extract-cover-source(cover)
  let cover-text = if source == none { "" } else { str(source) }

  if not has-text-value(cover-text) {
    cover-text
  } else if cover-text.starts-with("/") {
    normalize-project-path(cover-text)
  } else {
    let page-path = str(query-input("page-path", default: "")).trim("/")
    if page-path == "" {
      cover-text
    } else {
      normalize-project-path(page-path + "/" + cover-text)
    }
  }
}

#let render-post-cover(cover, alt: none) = {
  let normalized-cover = normalize-post-cover(cover, alt: alt)

  if normalized-cover == none {
    none
  } else {
    html-guard(() => {
      html.div(class: "post-cover", {
        html.elem("img", attrs: (
          src: normalized-cover.at("resolved-source-path"),
          alt: normalized-cover.at("alt"),
          style: "width: " + normalized-cover.at("render-width-percent") + "; height: auto;",
        ))
      })
    }, fallback: () => {
      block(width: 100%, above: 1em, below: 1em)[
        #set align(center)
        #if is-image-cover-value(cover) [
          #set image(width: normalized-cover.at("render-width"))
          #cover
        ] else [
          #image(
            normalized-cover.at("resolved-source-path"),
            width: normalized-cover.at("render-width"),
            alt: normalized-cover.at("alt"),
          )
        ]
      ]
    })
  }
}

#let template-post(
  preview-enabled: true,
  preview-font: ("Noto Serif CJK SC", "Noto Serif CJK TC"),
  poem-font: ("KaiTi", "Kaiti SC", "STKaiti", "LXGW WenKai", "Noto Serif CJK SC"),
  preview-size: 16pt,
  preview-lang: "zh",
  content-lang: auto,
  preview-table-inset: 9pt,
  preview-leading: 0.5em,
  preview-list-marker: [●],
  preview-list-indent: 1em,
  preview-list-body-indent: 0.6em,
  preview-debug: false,
  outline-enabled: false,
  outline-title: [目录],
  description: "",
  cover: "",
  category: "",
  ..args,
  body,
) = {
  let named-args = args.named()
  let preview-raw-font = preview-raw-font-default
  let preview-title = named-args.at("title", default: none)
  let preview-description = description
  let preview-cover = cover
  let has-preview-title = has-text-value(preview-title)
  let has-preview-description = has-text-value(preview-description)
  let has-preview-cover = has-cover-value(preview-cover)
  let resolved-content-lang = if content-lang == auto { preview-lang } else { content-lang }
  let lang-head = str(resolved-content-lang).split("-").at(0, default: str(resolved-content-lang))
  let is-zh-content = lang-head == "zh"
  let content-font = if category == "诗歌" { poem-font } else { preview-font }

  set page(height: auto, width: 24cm) if preview-enabled
  set text(preview-size, font: content-font, lang: resolved-content-lang, weight: "regular") if preview-enabled
  set table(inset: preview-table-inset) if preview-enabled
  set par(leading: preview-leading) if preview-enabled
  set list(
    marker: preview-list-marker,
    indent: preview-list-indent,
    body-indent: preview-list-body-indent,
  ) if preview-enabled
  set enum(
    indent: preview-list-indent,
    body-indent: preview-list-body-indent,
  ) if preview-enabled

  (templates.post)(category: category, lang: resolved-content-lang, description: description, cover: cover, ..args, [
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
      #show heading.where(level: 1): set text(
        font: content-font,
        lang: resolved-content-lang,
        weight: "bold",
      )
      #show heading.where(level: 2): set text(
        font: content-font,
        lang: resolved-content-lang,
        weight: "bold",
      )
      #show heading.where(level: 3): set text(
        font: content-font,
        lang: resolved-content-lang,
        weight: "semibold",
      )
      #show heading.where(level: 4): set text(
        font: content-font,
        lang: resolved-content-lang,
        weight: "semibold",
      )
      #show heading.where(level: 5): set text(
        font: content-font,
        lang: resolved-content-lang,
        weight: "medium",
      )
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
    #context {
      if preview-enabled and not is-html-target() [
        #if has-preview-title [
          #block(above: 0pt, below: if has-preview-description { 1em } else { 0pt })[
            #set text(
              size: preview-size * 1.5,
              font: content-font,
              lang: resolved-content-lang,
              weight: "bold",
            )
            #preview-title
          ]
        ]
        #if has-preview-description [
          #block(above: 0pt, below: 0.75em)[
            #set text(
              size: preview-size * 0.8,
              font: content-font,
              lang: resolved-content-lang,
              fill: luma(35%),
            )
            #preview-description
          ]
          #line(length: 100%, stroke: gray + .5pt)
        ]
      ]
    }
    #if has-preview-cover [
      #render-post-cover(preview-cover, alt: preview-title)
    ]
    #if outline-enabled [
      #outline(title: outline-title)
      #line(length: 100%, stroke: black + 0.5pt)
    ]

    #body
  ])
}

#let template-page = templates.page
