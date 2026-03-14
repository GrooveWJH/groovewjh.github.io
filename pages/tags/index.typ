#import "../../config.typ": template-page, render-tag-link
#let posts = json(sys.inputs.at("posts-json"))
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
  title: "标签",
  description: "标签页面",
)

= 标签

#if all-tags.len() == 0 [
  #html.div(class: "tips-block", {
    暂无标签
  })
] else [
  #html.div(class: "page-tag-list", {
    for tag in all-tags {
      render-tag-link(tag, href: "/tag/" + tag-slug-of(tag) + "/", full: true)
    }
  })
]