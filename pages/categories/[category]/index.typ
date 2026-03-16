#import "../../../config.typ": template-page, format-post-date, category-intro-of, render-tag-link, render-page-breadcrumb, query-posts, query-route-category, query-tag-slug-of, query-category-slug-of, query-route-page, query-route-page-size, query-page-bounds, render-pagination-nav
#let posts = query-posts()
#let current = query-route-category()
#let route-page = query-route-page()
#let route-page-size = query-route-page-size(default: 10)

#show: template-page.with(
  title: if current == "" { "分类详情" } else { "分类：" + current },
  description: "分类详情页面",
)

#render-page-breadcrumb(
  items: (("/", "首页"), ("/categories/", "分类")),
)

= #{html.div(class: "title-with-icon", {
  html.div(
    class: "tag-title-icon",
    style: "--tag-background:var(--tag-background-gray);--tag-color:var(--tag-color-gray);",
    {
      html.span(style: "mask-image:url(\"/assets/icons/folder.svg\");")
    },
  )
  html.div(current)
})}

#let intro = category-intro-of(current)
#if intro != "" {
  html.div(class: "tips-block", {
    intro
  })
}

#let matched = posts.filter(post => post.category == current)
#let bounds = query-page-bounds(matched.len(), page: route-page, page-size: route-page-size)
#let current-page = int(bounds.at("page", default: 1))
#let total-pages = int(bounds.at("total-pages", default: 1))
#let start-index = int(bounds.at("start-index", default: 0))
#let end-index = int(bounds.at("end-index", default: -1))

#if matched.len() == 0 {
  html.div(class: "tips-block", {
    "暂无文章"
  })
} else {
  html.div(class: "posts-grid", {
    for i in range(end-index, start-index - 1, step: -1) {
      let post = matched.at(i)
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

  render-pagination-nav(
    "/categories/" + query-category-slug-of(current) + "/",
    current-page,
    total-pages,
    aria-label: "分类分页",
  )
}