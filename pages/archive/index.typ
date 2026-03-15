#import "../../config.typ": template-page, format-post-date, render-tag-link, render-page-breadcrumb
#let posts = json(sys.inputs.at("posts-json"))
#let slugs = json(sys.inputs.at("slugs-json"))
#let tag-slugs = slugs.at("tags", default: (:))
#let tag-slug-of(value) = str(tag-slugs.at(value, default: value))

#show: template-page.with(
  title: "更新",
  description: "更新页面",
)

#render-page-breadcrumb(items: (("/", "首页"),))

= 所有文章

#if posts.len() == 0 {
  html.div(class: "tips-block", {
    暂无文章
  })
} else {
  html.div(class: "posts-grid", {
    for i in range(posts.len() - 1, -1, step: -1) {
      let post = posts.at(i)
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
              render-tag-link(tag, href: "/tag/" + tag-slug-of(tag) + "/")
            }
          })
        }
        html.div(class: "post-date", {
          post-date-text
        })
      })
    }
  })
}