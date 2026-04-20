#import "html-guard.typ": html-guard
#import "metadata.typ": metadata
#import "sys-input.typ": query-input

#let make-theme-preload-script() = html.script(
  type: "text/javascript",
  "(function(){document.documentElement.setAttribute('data-theme','gray-10');document.documentElement.style.backgroundColor='#f4f4f4';})();",
)

#let typ2html-base(
  header-links: none,
  site-title: "Typst Blog",
  title: "Carbon & Typst Blog",
  lang: "en",
  css: ("/assets/core/main.css"),
  scripts: (),
  custom-css: (),
  custom-script: (),
  description: "",
  include-description-meta: false,
  website-url: query-input("website-url", default: none),
  author: query-input("author", default: none),
  include-rss-link: false,
  feed-path: "/rss.xml",
  canonical-path: none,
  date-meta: none,
  head-extra: none,
  header-node: none,
  main-node: none,
  footer-node: none,
  content,
) = context {
  html-guard(() => {
    import "raw.typ": template-raw
    import "math.typ": template-math
    import "refs.typ": template-refs
    import "notes.typ": template-notes
    import "links.typ": template-links
    import "figures.typ": template-figures
    import "table.typ": template-table

    show: template-raw
    show: template-math
    show: template-refs
    show: template-notes
    show: template-figures
    show: template-links
    show: template-table

    set text(lang: lang)

    html.html(
      lang: lang,
      {
        html.head({
          metadata(
            title: title,
            author: author,
            description: if include-description-meta { description } else { none },
            lang: lang,
            date: date-meta,
            website-title: site-title,
            website-url: website-url,
            canonical-path: canonical-path,
            include-rss-link: include-rss-link,
            feed-path: feed-path,
          )

          if head-extra != none {
            head-extra
          }

          make-theme-preload-script()

          for css-link in css {
            html.link(rel: "stylesheet", href: css-link)
          }
          for css-link in custom-css {
            html.link(rel: "stylesheet", href: css-link)
          }
          for js-src in scripts {
            html.script(type: "module", src: js-src)
          }
          for js-src in custom-script {
            html.script(type: "module", src: js-src)
          }
        })

        html.body({
          html.div(class: "page-shell", {
            if header-node != none { header-node }
            if main-node != none { main-node }
            if footer-node != none { footer-node }
          })
        })
      },
    )
  }, fallback: () => content)
}
