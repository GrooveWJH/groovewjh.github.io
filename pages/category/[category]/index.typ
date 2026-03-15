#import "../../../config.typ": template-page, format-post-date, category-intro-of, render-tag-link, render-page-breadcrumb
#let posts = json(sys.inputs.at("posts-json"))
#let current = sys.inputs.at("route-category", default: "")
#let slugs = json(sys.inputs.at("slugs-json"))
#let tag-slugs = slugs.at("tags", default: (:))
#let tag-slug-of(value) = str(tag-slugs.at(value, default: value))

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

#if matched.len() == 0 {
  html.div(class: "tips-block", {
    暂无文章
  })
} else {
  html.div(class: "posts-grid", {
    for i in range(matched.len() - 1, -1, step: -1) {
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