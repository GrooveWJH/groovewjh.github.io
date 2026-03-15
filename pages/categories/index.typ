#import "../../config.typ": template-page, category-intro-of
#let posts = json(sys.inputs.at("posts-json"))
#let slugs = json(sys.inputs.at("slugs-json"))
#let category-slugs = slugs.at("categories", default: (:))
#let category-slug-of(value) = str(category-slugs.at(value, default: value))

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

#if all-categories.len() == 0 [
  暂无分类。
] else [
  #for category in all-categories [
    #let intro = category-intro-of(category)
    - #link("/category/" + category-slug-of(category) + "/")[#category]（#category-counts.at(category)）#if intro != "" { "：" + intro }
  ]
]