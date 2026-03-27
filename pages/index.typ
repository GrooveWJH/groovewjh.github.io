#import "../config.typ": *
#let posts = query-posts()
#let route-page = query-route-page()
#let route-page-size = query-route-page-size(default: 10)
#let bounds = query-page-bounds(posts.len(), page: route-page, page-size: route-page-size)
#let current-page = int(bounds.at("page", default: 1))
#let total-pages = int(bounds.at("total-pages", default: 1))
#let start-index = int(bounds.at("start-index", default: 0))
#let end-index = int(bounds.at("end-index", default: -1))

#show: template-page.with(
  title: "首页",
  description: "站点首页",
)

#if route-page != 1 [
  = 文章列表
] else {
  html.div(class: "homepage-header", {
    html.div(class: "homepage-header-stage", {
      html.div(class: "homepage-header-carbon", "渐入佳境")
      html.div(class: "homepage-header-typst", "凌乱空想")
      html.div(class: "homepage-header-blog", "$>_Blog")
    })
    html.div(class: "homepage-filter", {
      html.elem("button", attrs: (
        class: "homepage-filter-button is-active",
        type: "button",
        "data-home-filter": "article",
        "aria-pressed": "true",
      ), [文章])
      html.elem("button", attrs: (
        class: "homepage-filter-button",
        type: "button",
        "data-home-filter": "poem",
        "aria-pressed": "false",
      ), [诗歌])
    })
  })
}

#if posts.len() == 0 {
  html.div(class: "error-block", {
    "暂无文章"
  })
} else {
  html.div(class: "posts-grid", {
    for i in range(end-index, start-index - 1, step: -1) {
      let post = posts.at(i)
      let is-poem = post.category == "诗歌" or post.category == "诗歌-辑蜡烛"
      let date-parts = post.date.split("-")
      let post-date-text = if date-parts.len() == 3 {
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
        "data-post-kind": if is-poem { "poem" } else { "article" },
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

  if route-page == 1 {
    html.elem("div", attrs: (
      class: "error-block homepage-filter-empty",
      hidden: "hidden",
    ), [暂无文章])
  }

  render-pagination-nav("/", current-page, total-pages, aria-label: "首页分页")
}
