#import "../config.typ": *
#let all-posts = query-posts()
#let route-kind-input = str(query-input("route-kind", default: "article"))
#let route-kind = if route-kind-input == "poem" { "poem" } else { "article" }
#let route-page = query-route-page()
#let route-page-size = query-route-page-size(default: 10)

#let is-poem-post(post) = post.category == "诗歌"

#let article-posts = all-posts.filter(post => not is-poem-post(post))
#let poem-posts = all-posts.filter(post => is-poem-post(post))
#let posts = if route-kind == "poem" { poem-posts } else { article-posts }

#let bounds = query-page-bounds(posts.len(), page: route-page, page-size: route-page-size)
#let current-page = int(bounds.at("page", default: 1))
#let total-pages = int(bounds.at("total-pages", default: 1))
#let start-index = int(bounds.at("start-index", default: 0))
#let end-index = int(bounds.at("end-index", default: -1))

#let article-bounds = query-page-bounds(article-posts.len(), page: 1, page-size: route-page-size)
#let poem-bounds = query-page-bounds(poem-posts.len(), page: 1, page-size: route-page-size)
#let article-total-pages = int(article-bounds.at("total-pages", default: 1))
#let poem-total-pages = int(poem-bounds.at("total-pages", default: 1))

#let article-href-default = if route-kind == "article" and current-page > 1 {
  "/page/" + str(current-page) + "/"
} else {
  "/"
}
#let poem-href-default = if route-kind == "poem" and current-page > 1 {
  "/poems/page/" + str(current-page) + "/"
} else {
  "/poems/"
}
#let pagination-base-path = if route-kind == "poem" { "/poems/" } else { "/" }

#let render-home-filter(standalone: false) = {
  html.elem("div", attrs: (
    class: "homepage-filter" + if standalone { " homepage-filter-standalone" } else { "" },
    "data-home-route-kind": route-kind,
    "data-home-route-page": str(current-page),
    "data-home-total-article-pages": str(article-total-pages),
    "data-home-total-poem-pages": str(poem-total-pages),
  ), {
    if route-kind == "article" {
      html.elem("a", attrs: (
        class: "homepage-filter-button is-active",
        href: article-href-default,
        "data-home-filter": "article",
        "aria-current": "page",
      ), [文章])
    } else {
      html.elem("a", attrs: (
        class: "homepage-filter-button",
        href: article-href-default,
        "data-home-filter": "article",
      ), [文章])
    }
    if route-kind == "poem" {
      html.elem("a", attrs: (
        class: "homepage-filter-button is-active",
        href: poem-href-default,
        "data-home-filter": "poem",
        "aria-current": "page",
      ), [诗歌])
    } else {
      html.elem("a", attrs: (
        class: "homepage-filter-button",
        href: poem-href-default,
        "data-home-filter": "poem",
      ), [诗歌])
    }
  })
}

#let render-home-list-shell() = {
  html.elem("div", attrs: (
    class: "homepage-list-shell",
    "data-home-list-shell": "true",
  ), {
    if posts.len() == 0 {
      html.div(class: "error-block", {
        if route-kind == "poem" {
          "暂无诗歌"
        } else {
          "暂无文章"
        }
      })
    } else {
      html.div(class: "posts-grid", {
        for i in range(end-index, start-index - 1, step: -1) {
          let post = posts.at(i)
          let post-date-text = if post.date.split("-").len() == 3 {
            let date-parts = post.date.split("-")
            format-post-date(datetime(
              year: int(date-parts.at(0)),
              month: int(date-parts.at(1)),
              day: int(date-parts.at(2)),
            ))
          } else {
            post.date
          }
          html.elem("div", attrs: (
            class: "post-card",
            "data-post-url": post.url,
          ), {
            html.div(class: "post-title", {
              html.a(class: "post-card-link", href: post.url, post.title)
            })
            html.div(class: "post-description", {
              post.description
            })
            if post.tags.len() != 0 {
              html.div(class: "post-card-tags", {
                for tag in post.tags {
                  render-tag-link(tag, href: "/tags/" + query-tag-slug-of(tag) + "/")
                }
              })
            }
            html.div(class: "post-date", {
              post-date-text
            })
          })
        }
      })

      render-pagination-nav(pagination-base-path, current-page, total-pages, aria-label: "首页分页")
    }
  })
}

#let render-home-route-shell() = {
  html.elem("div", attrs: (
    class: "homepage-route-shell",
    "data-home-route-shell": "true",
  ), {
    html.div(class: "homepage-header", {
      html.div(class: "homepage-header-stage", {
        html.div(class: "homepage-header-carbon", "渐入佳境")
        html.div(class: "homepage-header-typst", "凌乱空想")
        html.div(class: "homepage-header-blog", "$>_Blog")
      })
      render-home-filter()
    })

    render-home-list-shell()
  })
}

#show: template-page.with(
  title: "首页",
  description: "站点首页",
)

#render-home-route-shell()
