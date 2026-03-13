#import "../config.typ": template-page, format-post-date
#let posts = json(sys.inputs.at("posts-json"))

#show: template-page.with(
  title: "首页",
  description: "站点首页",
)

#let MAX_POST_LIST = 12

= 最新文章

#if posts.len() == 0 {
  html.div(class: "tips-block", {
    暂无文章
  })
} else {
  html.div(class: "posts-grid", {
    let pos = calc.max(0, posts.len() - MAX_POST_LIST)
    for i in range(posts.len() - 1, pos - 1, step: -1) {
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
              html.a(class: "post-tag-item", href: "/tag/" + tag, tag)
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

// 共 #posts.len() 篇文章。

// #if posts.len() == 0 [
//   暂无文章。
// ] else [
//   #for post in posts [
//     - #post.date #link(post.url)[#post.title]
//   ]
// ]
