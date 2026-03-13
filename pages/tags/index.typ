#import "../../config.typ": template-page
#let posts = json(sys.inputs.at("posts-json"))

#let slugify(value) = str(value).trim().replace(" ", "-").replace("/", "-")

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

共 #all-tags.len() 个标签。

#if all-tags.len() == 0 [
  暂无标签。
] else [
  #for tag in all-tags [
    - #link("/tag/" + slugify(tag) + "/")[#tag]（#tag-counts.at(tag)）
  ]
]