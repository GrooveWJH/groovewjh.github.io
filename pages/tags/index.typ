#import "../../config.typ": template-page, render-tag-card, render-page-breadcrumb, query-posts, query-tag-slug-of
#let posts = query-posts()

#let tag-counts = (:)
#for post in posts [
  #for tag in post.tags [
    #let current = tag-counts.at(tag, default: 0)
    #tag-counts.insert(tag, current + 1)
  ]
]

#let all-tags = tag-counts.keys().sorted()
#let sorted-tags = all-tags.sorted(key: tag => (-tag-counts.at(tag, default: 0), tag))

#show: template-page.with(
  title: "标签",
  description: "标签页面",
)

#render-page-breadcrumb(items: (("/", "首页"),))

= #{html.div(class: "title-with-icon", {
  html.div(
    class: "tag-title-icon",
    style: "--tag-background:var(--tag-background-gray);--tag-color:var(--tag-color-gray);",
    {
      html.span(style: "mask-image:url(\"/assets/icons/double-integer.svg\");")
    },
  )
  html.div("所有标签")
})}

#if all-tags.len() == 0 [
  #html.div(class: "tips-block", {
    "暂无标签"
  })
] else [
  #html.div(class: "tag-cards-grid", {
    for tag in sorted-tags {
      let count = tag-counts.at(tag, default: 0)
      render-tag-card(tag, count, href: "/tags/" + query-tag-slug-of(tag) + "/")
    }
  })
]