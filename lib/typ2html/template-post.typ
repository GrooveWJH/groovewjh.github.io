#let make-template-post(
  templates,
  is-html-target,
  preview-zebraw-default,
  preview-raw-font-default,
  has-cover-value,
  render-post-cover,
  poem-content-font,
) = {
  let has-text-value(value) = value != none and str(value) != ""

  let template-post(
    preview-enabled: true,
    preview-font: ("Noto Serif CJK SC", "Noto Serif CJK TC"),
    poem-font: poem-content-font,
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
    let preview-title = named-args.at("title", default: none)
    let has-preview-title = has-text-value(preview-title)
    let has-preview-description = has-text-value(description)
    let has-preview-cover = has-cover-value(cover)
    let resolved-content-lang = if content-lang == auto { preview-lang } else { content-lang }
    let content-font = if category == "诗歌" { poem-font } else { preview-font }

    set page(height: auto, width: 24cm) if preview-enabled
    set text(preview-size, font: content-font, lang: resolved-content-lang, weight: "regular") if preview-enabled
    set table(inset: preview-table-inset) if preview-enabled
    set par(leading: preview-leading) if preview-enabled
    set list(marker: preview-list-marker, indent: preview-list-indent, body-indent: preview-list-body-indent) if preview-enabled
    set enum(indent: preview-list-indent, body-indent: preview-list-body-indent) if preview-enabled

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
        #show heading.where(level: 1): set text(font: content-font, lang: resolved-content-lang, weight: "bold")
        #show heading.where(level: 2): set text(font: content-font, lang: resolved-content-lang, weight: "bold")
        #show heading.where(level: 3): set text(font: content-font, lang: resolved-content-lang, weight: "semibold")
        #show heading.where(level: 4): set text(font: content-font, lang: resolved-content-lang, weight: "semibold")
        #show heading.where(level: 5): set text(font: content-font, lang: resolved-content-lang, weight: "medium")
      ]
      #if preview-debug [
        #context {
          let std-map = dictionary(std)
          let std-keys = std-map.keys().map(k => str(k)).sorted()
          let has-target = "target" in std-map
          let current-target = if has-target { target() } else { "N/A" }
          let raw-font-chain = preview-raw-font-default.map(v => str(v)).join(" -> ")
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
              #set text(size: preview-size * 1.5, font: content-font, lang: resolved-content-lang, weight: "bold")
              #preview-title
            ]
          ]
          #if has-preview-description [
            #block(above: 0pt, below: 0.75em)[
              #set text(size: preview-size * 0.8, font: content-font, lang: resolved-content-lang, fill: luma(35%))
              #description
            ]
            #line(length: 100%, stroke: gray + .5pt)
          ]
        ]
      }
      #if has-preview-cover [
        #render-post-cover(cover, alt: preview-title)
      ]
      #if outline-enabled [
        #outline(title: outline-title)
        #line(length: 100%, stroke: black + 0.5pt)
      ]

      #body
    ])
  }

  template-post
}
