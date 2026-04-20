#import "block.typ": quote, note, success, warning, error
#import "tag.typ": render-tag-link, render-tag-card
#import "breadcrumb.typ": render-page-breadcrumb
#import "pagination.typ": render-pagination-nav
#import "sys-input.typ": query-input, query-posts, query-slugs, query-route-tag, query-route-category, query-route-page, query-route-page-size, query-tag-slug-of, query-category-slug-of, query-page-bounds
#import "layout.typ": make-nav, make-header, make-post-header, make-post-footer, make-page-footer
#import "divider.typ": divider
#import "html-guard.typ": html-guard
#import "math.typ": auto-frame
#import "metadata.typ": metadata
#import "base.typ": typ2html-base
#import "post.typ": typ2html-post

#let typ2html-page(
  header-links: none,
  site-title: "Typst Blog",
  title: "Carbon & Typst Blog",
  lang: "en",
  css: (
    "/assets/core/main.css",
    "/assets/core/pages.css",
  ),
  scripts: (
    "/assets/core/app.js",
  ),
  custom-css: (),
  custom-script: (),
  footer-content: none,
  page-wrapper: content => html-guard(() => {
    html.main({
      content
    })
  }),
  description: "",
  website-url: query-input("website-url", default: none),
  author: query-input("author", default: none),
  content,
) = {
  typ2html-base(
    header-links: header-links,
    site-title: site-title,
    title: title,
    lang: lang,
    css: css,
    scripts: scripts,
    custom-css: custom-css,
    custom-script: custom-script,
    description: description,
    include-description-meta: true,
    website-url: website-url,
    author: author,
    include-rss-link: true,
    canonical-path: query-input("page-path", default: ""),
    date-meta: datetime.today(),
    head-extra: {
      html.meta(name: "tags", content: "none")
      html.meta(name: "category", content: "")
    },
    header-node: html-guard(() => make-header(header-links, site-title)),
    main-node: html-guard(() => page-wrapper(content)),
    footer-node: html-guard(() => make-page-footer(footer-content: footer-content)),
    content,
  )
}

#let make-templates(
  header-links: none,
  site-title: "Typst Blog",
  title: "Carbon & Typst Blog",
  lang: "en",
  custom-css: (),
  custom-script: (),
  footer-content: none,
  description: "",
  website-url: query-input("website-url", default: none),
  author: query-input("author", default: none),
  tag-options: (:),
  post-css: (
    "/assets/core/main.css",
  ),
  post-scripts: (
    "/assets/core/app.js",
  ),
  page-css: (
    "/assets/core/main.css",
    "/assets/core/pages.css",
  ),
  page-scripts: (
    "/assets/core/app.js",
  ),
  page-wrapper: content => html-guard(() => {
    html.main({
      html.div(class: "pages-container", {
        html.div(class: "pages-container-inner", {
          content
        })
      })
    })
  }),
) = (
  post: typ2html-post.with(
    header-links: header-links,
    site-title: site-title,
    title: title,
    lang: lang,
    css: post-css,
    scripts: post-scripts,
    custom-css: custom-css,
    custom-script: custom-script,
    footer-content: footer-content,
    description: description,
    website-url: website-url,
    author: author,
    tag-options: tag-options,
  ),
  page: typ2html-page.with(
    header-links: header-links,
    site-title: site-title,
    title: title,
    lang: lang,
    css: page-css,
    scripts: page-scripts,
    custom-css: custom-css,
    custom-script: custom-script,
    footer-content: footer-content,
    page-wrapper: page-wrapper,
    description: description,
    website-url: website-url,
    author: author,
  ),
)
