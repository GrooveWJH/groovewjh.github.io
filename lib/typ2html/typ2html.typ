#import "raw.typ": template-raw
#import "math.typ": template-math
#import "refs.typ": template-refs
#import "notes.typ": template-notes
#import "links.typ": template-links
#import "figures.typ": template-figures
#import "block.typ": quote, note, success, warning, error

#let make-theme-preload-script() = html.script(
  type: "text/javascript",
  "(function(){var key='typ-blog-theme';var theme=null;try{var stored=localStorage.getItem(key);if(stored==='gray-10'||stored==='gray-90'||stored==='gray-100'||stored==='white'){theme=stored;}}catch(_){ }if(!theme){theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'gray-90':'gray-10';}document.documentElement.setAttribute('data-theme',theme);var bg=theme==='gray-90'?'#262626':theme==='gray-100'?'#161616':theme==='white'?'#ffffff':'#f4f4f4';document.documentElement.style.backgroundColor=bg;})();",
)

#let make-deferred-stylesheet(href) = html.elem("link", attrs: (
  rel: "stylesheet",
  href: href,
  media: "print",
  onload: "this.media='all'",
))[]

#let post-date-storage-format = "[year]-[month]-[day]"
#let post-date-display-format = "[year] 年 [month padding:none] 月 [day padding:none] 日"
#let format-post-date(date) = date.display(post-date-display-format)

#let make-nav(site-title, links, post-title: none) = if links != none {
  let nav-lower-title = if post-title != none { post-title } else { site-title }

  html.div(class: "nav-shell", {
    html.nav({
      html.elem("button", attrs: (
        class: "nav-menu-switch",
        type: "button",
        "aria-label": "打开导航",
      ))[]

      html.div(class: "nav-title", site-title)

      html.div(class: "nav-body has-post-title", {
        html.div(class: "nav-body-upper", {
          html.div(class: "nav-body-upper-title", site-title)
          html.div(class: "nav-body-upper-links", {
            for (href, name) in links {
              html.a(href: href, name)
            }
          })
        })

        html.div(class: "nav-body-lower", nav-lower-title)
      })

      html.elem("button", attrs: (
        class: "nav-theme-switch",
        type: "button",
        "aria-label": "切换主题",
      ))[]
    })

    html.div(class: "nav-sidebar-backdrop")
    html.aside(class: "nav-sidebar", {
      for (href, name) in links {
        html.a(class: "nav-sidebar-item", href: href, name)
      }
    })
  })
}

#let make-header(links, site-title) = {
  html.header(
    html.div(class: "site-header", {
      make-nav(site-title, links)
    })
  )
}

#let make-post-header(links, site-title, title) = {
  html.header({
    html.div(class: "site-header", {
      make-nav(site-title, links, post-title: title)
    })
  })

  html.div(class: "post-header", {
    html.div(class: "post-header-inner", {
      html.h1(title)
    })
  })
}

#let make-post-footer(previous-post: none, next-post: none, footer-content: none) = {
  if previous-post != none or next-post != none [
    #html.div(class: "post-neighbors", {
      html.div(class: "post-neighbors-inner", {
        if previous-post != none {
          html.a(class: "post-neighbor", href: previous-post.url, {
            html.div(class: "post-neighbor-top", "上一篇")
            html.p(class: "post-neighbor-title", str(previous-post.title))
          })
        }
        if next-post != none {
          html.a(class: "post-neighbor", href: next-post.url, {
            html.div(class: "post-neighbor-top", "下一篇")
            html.p(class: "post-neighbor-title", str(next-post.title))
          })
        }
      })
    })
  ]

  html.footer({
    html.div(class: "post-footer", {
      if footer-content != none {
        footer-content
      }
    })
  })
}

#let make-page-footer(footer-content: none) = html.elem("footer", attrs: (class: "page-footer"))[
  #if footer-content != none [#footer-content]
]

#let render-footnotes() = context {
  let footnotes = query(footnote)
  if footnotes.len() != 0 {
    html.elem("section", attrs: (role: "doc-endnotes"))[
      #html.ol({
        for it in footnotes {
          let number = counter(footnote).display(it.numbering)
          let fn-id = "fn-" + number
          let ref-id = "fnref-" + number

          html.li(
            class: "footnote-index",
            id: fn-id,
            it.body + html.a(class: "footnote-ref-link", href: "#" + ref-id),
          )
        }
      })
    ]
  }
}

#let render-meta(tags, category, date-string) = {
  html.div(class: "post-meta", {
    if tags != none and tags.len() != 0 {
      html.div(class: "post-tag", {
        html.span(class: "post-tag-desc", "标签")
        html.span(class: "post-tag-group", {
          for tag in tags {
            html.a(class: "post-tag-item", href: "/tag/" + tag, tag)
          }
        })
      })
    }
    html.div(class: "post-time", {
      html.span(class: "post-time-desc", "日期")
      html.span(date-string)
    })
    if category != none {
      html.div(class: "post-category", {
        html.span(class: "post-category-desc", "分类")
        html.a(class: "post-category-link", href: "/category/" + category, category)
      })
    }
  })
}

#let typ2html-post(
  header-links: none,
  site-title: "Typst Blog",
  title: "Carbon & Typst Blog",
  lang: "en",

  css: (
    "https://cdn.jsdelivr.net/npm/@ibm/plex-sans-sc@1.1.0/css/ibm-plex-sans-sc-all.min.css",
    "/assets/required/colors.css",
    "/assets/required/main.css",
  ),
  deferred-css: (
    "https://cdn.jsdelivr.net/npm/@ibm/plex-mono@1.1.0/css/ibm-plex-mono-all.min.css",
  ),
  scripts: (
    "/assets/required/footnote.js",
    "/assets/required/render-code.js",
    "/assets/required/theme.js",
    "/assets/required/post-nav-switch.js",
  ),
  custom-css: (),
  custom-script: (),
  footer-content: none,

  tags: (),
  category: "",
  date: datetime.today(),
  description: "",
  emit-post-meta: sys.inputs.at("emit-post-meta", default: none),

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
  let tags-json = "[" + tags.map(tag => json-string(tag)).join(",") + "]"
  let post-meta-json = "{" + "\"title\":" + json-string(title) + "," + "\"description\":" + json-string(description) + "," + "\"category\":" + json-string(category) + "," + "\"tags\":" + tags-json + "," + "\"date\":" + json-string(date-string) + "}"

  if emit-post-meta != none {
    post-meta-json
  } else {
    show: template-raw
    show: template-math
    show: template-refs
    show: template-notes
    show: template-figures
    show: template-links

    set text(16pt, font: ("IBM Plex Serif", "IBM Plex Sans SC"), lang: "zh")
    show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
    show math.equation: set text(16pt)

    set text(lang: lang)

    let page-path = sys.inputs.at("page-path", default: "")
    let posts-json-path = sys.inputs.at("posts-json", default: none)
    let all-posts = if posts-json-path == none { () } else { json(posts-json-path) }

    let matched-indexes = range(all-posts.len()).filter(i => all-posts.at(i).slug == page-path)
    let current-index = matched-indexes.at(0, default: none)

    let previous-post = if current-index == none or current-index == 0 { none } else { all-posts.at(current-index - 1) }
    let next-post = if current-index == none or current-index + 1 >= all-posts.len() { none } else { all-posts.at(current-index + 1) }

    html.html(
      lang: lang,
      {
        html.head({
          html.meta(charset: "utf-8")
          html.meta(name: "viewport", content: "width=device-width, initial-scale=1")
          html.meta(name: "color-scheme", content: "light dark")
          html.title(title)

          html.link(rel: "preconnect", href: "https://cdn.jsdelivr.net")
          html.link(rel: "dns-prefetch", href: "https://cdn.jsdelivr.net")

          make-theme-preload-script()

          for (css-link) in css {
            html.link(rel: "stylesheet", href: css-link)
          }
          for (css-link) in custom-css {
            html.link(rel: "stylesheet", href: css-link)
          }
          for (css-link) in deferred-css {
            make-deferred-stylesheet(css-link)
          }
          for (js-src) in scripts {
            html.script(type: "module", src: js-src)
          }
          for (js-src) in custom-script {
            html.script(type: "module", src: js-src)
          }
        })

        html.body({
          html.div(class: "page-shell", {
            make-post-header(header-links, site-title, title)
            html.article({
              html.section({
                content
                render-footnotes()
                render-meta(tags, category, date-string-localized)
              })
            })
            make-post-footer(previous-post: previous-post, next-post: next-post, footer-content: footer-content)
          })
        })
      },
    )
  }
}

#let typ2html-page(
  header-links: none,
  site-title: "Typst Blog",
  title: "Carbon & Typst Blog",
  lang: "en",
  css: (
    "https://cdn.jsdelivr.net/npm/@ibm/plex-sans-sc@1.1.0/css/ibm-plex-sans-sc-all.min.css",
    "/assets/required/colors.css",
    "/assets/required/main.css",
    "/assets/required/pages.css",
  ),
  deferred-css: (
    "https://cdn.jsdelivr.net/npm/@ibm/plex-mono@1.1.0/css/ibm-plex-mono-all.min.css",
  ),
  scripts: (
    "/assets/required/theme.js",
    "/assets/required/post-nav-switch.js",
    "/assets/required/post-card-click.js",
  ),
  custom-css: (),
  custom-script: (),
  footer-content: none,
  page-wrapper: content => html.main({
    content
  }),
  description: "",
  content,
) = {
  show: template-raw
  show: template-math
  show: template-refs
  show: template-notes
  show: template-figures
  show: template-links

  set text(16pt, font: ("IBM Plex Serif", "IBM Plex Sans SC"), lang: "zh")
  show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
  show math.equation: set text(16pt)

  set text(lang: lang)

  html.html(
    lang: lang,
    {
      html.head({
        html.meta(charset: "utf-8")
        html.meta(name: "viewport", content: "width=device-width, initial-scale=1")
        html.meta(name: "color-scheme", content: "light dark")
        html.meta(name: "tags", content: "none")
        html.meta(name: "category", content: "")
        html.meta(name: "description", content: description)
        html.meta(name: "date", content: datetime.today().display("[year]-[month]-[day]"))
        html.title(title)

        html.link(rel: "preconnect", href: "https://cdn.jsdelivr.net")
        html.link(rel: "dns-prefetch", href: "https://cdn.jsdelivr.net")

        make-theme-preload-script()

        for (css-link) in css {
          html.link(rel: "stylesheet", href: css-link)
        }
        for (css-link) in custom-css {
          html.link(rel: "stylesheet", href: css-link)
        }
        for (css-link) in deferred-css {
          make-deferred-stylesheet(css-link)
        }
        for (js-src) in scripts {
          html.script(type: "module", src: js-src)
        }
        for (js-src) in custom-script {
          html.script(type: "module", src: js-src)
        }
      })

      html.body({
        html.div(class: "page-shell", {
          make-header(header-links, site-title)
          page-wrapper(content)
          make-page-footer(footer-content: footer-content)
        })
      })
    },
  )
}

#let template-post = typ2html-post

#let template-page = typ2html-page.with(
  page-wrapper: content => html.main({
    html.div(class: "pages-container", {
      html.div(class: "pages-container-inner", {
        content
      })
    })
  }),
  footer-content: none,
)