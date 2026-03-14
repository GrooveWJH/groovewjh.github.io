#import "../../../config.typ": template-page, format-post-date, render-tag-link
#let posts = json(sys.inputs.at("posts-json"))
#let current = sys.inputs.at("route-tag", default: "")
#let slugs = json(sys.inputs.at("slugs-json"))
#let tag-slugs = slugs.at("tags", default: (:))
#let tag-slug-of(value) = str(tag-slugs.at(value, default: value))

#let tag-counts = (:)
#for post in posts [
  #for tag in post.tags [
    #let current = tag-counts.at(tag, default: 0)
    #tag-counts.insert(tag, current + 1)
  ]
]

#let all-tags = tag-counts.keys().sorted()

#show: template-page.with(
  title: if current == "" { "标签详情" } else { "标签：" + current },
  description: "标签详情页面",
)

= 标签：#current

#let matched = posts.filter(post => post.tags.any(tag => tag == current))

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

#html.div(class: "page-tag-list", {
  for tag in all-tags {
    render-tag-link(tag, href: "/tag/" + tag-slug-of(tag) + "/", full: true)
  }
})