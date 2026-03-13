#import "../../config.typ": template-page
#let posts = json(sys.inputs.at("posts-json"))

#let slugify(value) = str(value).trim().replace(" ", "-").replace("/", "-")

#let category-counts = (:)
#for post in posts [
  #if post.category != "" [
    #let current = category-counts.at(post.category, default: 0)
    #category-counts.insert(post.category, current + 1)
  ]
]

#let all-categories = category-counts.keys().sorted()

#show: template-page.with(
  title: "分类",
  description: "分类页面",
)

= 分类

共 #all-categories.len() 个分类。

#if all-categories.len() == 0 [
  暂无分类。
] else [
  #for category in all-categories [
    - #link("/category/" + slugify(category) + "/")[#category]（#category-counts.at(category)）
  ]
]