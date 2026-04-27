#import "../core/html-guard.typ": html-guard
#import "../core/sys-input.typ": query-input
#import "./metadata.typ": metadata

#let make-theme-preload-script() = html.script(
  type: "text/javascript",
  "(function(){try{var pref=localStorage.getItem('typ-blog-theme-preference');var root=document.documentElement;var head=document.head;var color='';var systemDark=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-color-scheme: dark)').matches;var scheme=systemDark?'dark':'light';if(pref==='light'){root.setAttribute('data-theme','gray-10');root.style.backgroundColor='#f4f4f4';color='#f4f4f4';scheme='light';}else if(pref==='dark'){root.setAttribute('data-theme','gray-90');root.style.backgroundColor='#262626';color='#262626';scheme='dark';}root.setAttribute('data-color-scheme',scheme);if(color&&head){var meta=document.createElement('meta');meta.setAttribute('name','theme-color');meta.setAttribute('content',color);meta.setAttribute('data-theme-color-override','true');head.appendChild(meta);}}catch(_error){}})();",
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
  description-text: none,
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
    import "../fragments/raw.typ": template-raw
    import "../fragments/math.typ": template-math
    import "../fragments/refs.typ": template-refs
    import "../fragments/notes.typ": template-notes
    import "../fragments/links.typ": template-links
    import "../fragments/figures.typ": template-figures
    import "../fragments/table.typ": template-table

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
            description-text: if include-description-meta { description-text } else { none },
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
