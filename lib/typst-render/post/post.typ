#import "../core/html-guard.typ": html-guard
#import "../core/sys-input.typ": query-input, query-posts, query-tag-slug-of, query-category-slug-of
#import "../fragments/tag.typ": render-tag-link
#import "../shell/base.typ": typ2html-base
#import "../shell/description.typ": collapse-description-meta-text, resolve-description-plain-text
#import "../shell/layout.typ": make-post-header, make-post-footer
#import "./post-cover.typ": extract-cover-source, resolve-cover-path, resolve-public-cover-path

#let post-date-storage-format = "[year]-[month]-[day]"
#let post-date-display-format = "[year] 年 [month padding:none] 月 [day padding:none] 日"
#let format-post-date(date) = date.display(post-date-display-format)

#let make-font-preload-link(href) = html-guard(() => {
  html.elem("link", attrs: (
    rel: "preload",
    href: href,
    "as": "font",
    "type": "font/woff2",
    crossorigin: "anonymous",
  ))
})

#let make-post-font-preloads(font-mode: "release") = {
  if font-mode == "dev" {
    none
  } else {
    make-font-preload-link("/assets/fonts/noto-serif-sc-basic-400.woff2")
    make-font-preload-link("/assets/fonts/noto-serif-sc-non-basic-400.woff2")
    // Embedded poem-frame blocks need Kai on non-ASCII runs even inside normal articles.
    make-font-preload-link("/assets/fonts/site-kai-non-basic-400.woff2")
  }
}

#let render-footnotes() = context {
  html-guard(() => {
    let footnotes = query(footnote)
    if footnotes.len() != 0 {
      html.elem("section", attrs: (role: "doc-endnotes"))[
        #html.ol({
          for it in footnotes {
            let number = counter(footnote).display(it.numbering)
            let fn-id = "fn-" + number
            let ref-id = "fnref-" + number

            html.li(class: "footnote-index", id: fn-id, it.body + html.a(class: "footnote-ref-link", href: "#" + ref-id))
          }
        })
      ]
    }
  })
}

#let render-meta(tags, category, date-string, tag-options: (:)) = context {
  html-guard(() => {
    html.div(class: "post-meta", {
      if tags != none and tags.len() != 0 {
        html.div(class: "post-tag", {
          html.span(class: "post-tag-desc", "标签")
          html.span(class: "post-tag-group", {
            for tag in tags {
              render-tag-link(tag, href: "/tags/" + query-tag-slug-of(tag) + "/", tag-options: tag-options)
            }
          })
        })
      }
      html.div(class: "post-time", {
        html.span(class: "post-time-desc", "日期")
        html.span(date-string)
      })
      if category != none and category != "" {
        html.div(class: "post-category", {
          html.span(class: "post-category-desc", "分类")
          html.a(class: "post-category-link", href: "/categories/" + query-category-slug-of(category) + "/", category)
        })
      }
    })
  })
}

#let typ2html-post(
  header-links: none,
  site-title: "Typst Blog",
  title: "Carbon & Typst Blog",
  lang: "en",
  css: ("/assets/core/main.css"),
  scripts: ("/assets/core/app.js"),
  custom-css: (),
  custom-script: (),
  footer-content: none,
  tag-options: (:),
  tags: (),
  category: "",
  date: datetime.today(),
  description: "",
  description-text: none,
  panel-intent: none,
  cover: "",
  website-url: query-input("website-url", default: none),
  author: query-input("author", default: none),
  emit-post-meta: query-input("emit-post-meta", default: none),
  content,
) = {
  let json-escape(value) = {
    let s1 = str(value)
    let s2 = s1.replace("\\", "\\\\")
    let s3 = s2.replace("\"", "\\\"")
    let s4 = s3.replace("\n", "\\n")
    let s5 = s4.replace("\r", "\\r")
    s5.replace("\t", "\\t")
  }

  let json-string(value) = "\"" + json-escape(value) + "\""
  let date-string = date.display(post-date-storage-format)
  let date-string-localized = format-post-date(date)
  let resolved-description-text = resolve-description-plain-text(description, description-text: description-text)
  let resolved-description-meta = collapse-description-meta-text(resolved-description-text)
  let tags-json = "[" + tags.map(tag => json-string(tag)).join(",") + "]"
  let cover-source = extract-cover-source(cover)
  let cover-source-text = if cover-source == none { "" } else { str(cover-source) }
  let resolved-cover-path = if cover-source-text != "" { resolve-cover-path(cover-source) } else { "" }
  let resolved-public-cover-path = if cover-source-text != "" {
    resolve-public-cover-path(cover-source)
  } else {
    ""
  }
  let resolved-panel-intent = if panel-intent == none { "" } else { str(panel-intent) }
  let post-meta-json = "{" + "\"title\":" + json-string(title) + "," + "\"description\":" + json-string(resolved-description-meta) + "," + "\"descriptionText\":" + json-string(resolved-description-text) + "," + "\"panelIntent\":" + json-string(resolved-panel-intent) + "," + "\"cover\":" + json-string(cover-source-text) + "," + "\"resolvedCoverPath\":" + json-string(resolved-cover-path) + "," + "\"resolvedPublicCoverPath\":" + json-string(resolved-public-cover-path) + "," + "\"category\":" + json-string(category) + "," + "\"tags\":" + tags-json + "," + "\"date\":" + json-string(date-string) + "}"

  if emit-post-meta != none {
    post-meta-json
  } else {
    let page-path = query-input("page-path", default: "")
    let font-mode = str(query-input("font-mode", default: "release"))
    let lang-head = str(lang).split("-").at(0, default: str(lang))
    let post-lang-class = if lang-head == "zh" { "post-lang-zh" } else { "post-lang-nonzh" }
    let post-category-class = if category == "诗歌" { "post-category-poem" } else { "" }
    let article-class = "post-article " + post-lang-class + if post-category-class != "" { " " + post-category-class } else { "" }
    let all-posts = query-posts()
    let matched-indexes = range(all-posts.len()).filter(i => all-posts.at(i).slug == page-path)
    let current-index = matched-indexes.at(0, default: none)
    let previous-post = if current-index == none or current-index == 0 { none } else { all-posts.at(current-index - 1) }
    let next-post = if current-index == none or current-index + 1 >= all-posts.len() { none } else { all-posts.at(current-index + 1) }

    typ2html-base(
      header-links: header-links,
      site-title: site-title,
      title: title,
      lang: lang,
      css: css,
      scripts: scripts,
      custom-css: custom-css,
      custom-script: custom-script,
      description: resolved-description-meta,
      description-text: resolved-description-text,
      include-description-meta: true,
      website-url: website-url,
      author: author,
      canonical-path: query-input("public-page-path", default: page-path),
      date-meta: date,
      head-extra: { make-post-font-preloads(font-mode: font-mode) },
      header-node: make-post-header(header-links, site-title, title, description: description, post-class: post-category-class),
      main-node: html-guard(() => {
        html.elem("article", attrs: (class: article-class), {
          html.section({
            content
            render-footnotes()
            render-meta(tags, category, date-string-localized, tag-options: tag-options)
          })
        })
      }),
      footer-node: make-post-footer(previous-post: previous-post, next-post: next-post, footer-content: footer-content),
      content,
    )
  }
}
