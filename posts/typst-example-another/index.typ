#import "../../config.typ": template-post, quote, note, success, warning, error
#import "@preview/tablem:0.3.0": *
#import "@preview/citegeist:0.2.0": load-bibliography
#import "@preview/cmarker:0.1.8"
#import "@preview/mitex:0.2.6": *

#show: template-post.with(
  title: "Typst 功能速览与样例",
  description: "精简版 Typst 示例文档，展示在当前网页模板下常用元素的渲染效果。",
  tags: ("测试",),
  category: "测试"
)

这是一份精简版示例，重点展示渲染效果，不再重复贴出对应的 Typst 源代码。

#note(title: "说明")[
  本页用于快速预览常见排版元素在当前主题下的实际样式。
]

= 基础排版

这里展示了 *粗体*、_斜体_、#underline[下划线]、#strike[删除线]、#overline[上划线]、上标 E=mc#super[2]、下标 H#sub[2]O，以及 #highlight[高亮标记]。

你可以通过空行分段，也可以在行末使用 `\` 换行。\
这是同一段中的新一行。

如果需要分隔内容，可以使用下方横线：
#html.hr()

链接示例：
- #link("https://typst.app/")[Typst 官网]
- #link("https://github.com/Yousa-Mirage/Tufted-Blog-Template")[模板仓库]
- #link("/about/")[站内页面链接]

列表示例：
- 无序列表项
  - 支持多级缩进
+ 有序列表项
  + 自动编号
/ 术语列表: 适合用于名词解释。
/ Typst: 一个基于标记语法的排版系统。

= 常用内容块

#quote[
  这是一个引用块，支持较长文本、换行与嵌套内容。
  #quote[这是引用块中的引用块。]
]

#note(title: "提示")[这是一个注意块。]
#success(title: "完成")[这是一个强调块。]
#warning(title: "警告")[这是一个警告块。]
#error(title: "注意")[这是一个带多段内容的块。\
这一行用于展示换行效果。]

#figure(caption: [示例表格])[
  #table(
    columns: (1fr, 2fr, auto),
    table.header([姓名], [简介], [状态]),
    [Alice], [前端开发者，喜欢 Rust], [在线],
    [Bob], [后端工程师，喜欢 Python], [离线],
  )
]<tbl1>

#tablem[
  | *Name* | *Location* | *Height* | *Score* |
  | :----: | :--------: | :------: | :-----: |
  | John   | Second St. | 180 cm   | 5       |
  | Wally  | Third Av.  | 160 cm   | 10      |
]

#figure(caption: "代码块样式示例")[
  ```rs
  fn main() {
      println!("Hello, Typst!");
  }
  ```
]<code1>

= 数学、引用与交叉引用

行内公式示例：$f(x) = x^2$。

块级公式示例：
$
  f(x) & = (x + 1)^2 \
       & = x^2 + 2x + 1
$

再看一个矩阵示例：
$
  mat(
    1, 2;
    3, 4
  ) dot vec(x, y) = vec(5, 6)
$

文献引用示例：这是一条文献引用@tufte1973relationship，也可以用脚注补充说明#footnote[Tufte, E. R. (1973). The Relationship between Seats and Votes in Two-Party Systems. _American Political Science Review, 67_(2), 540～554. https://doi.org/10.2307/1958782]。

#bibliography("papers.bib", title: none, style: "american-psychological-association")

你现在看到的是交叉引用：表格见 @tbl1，代码块见 @code1。

#import "@preview/lilaq:0.5.0" as lq
#{
  let diagram = html.frame(lq.diagram(
    xaxis: (subticks: none),
    yaxis: (subticks: none),
    lq.bar(
      range(-7, 8).map(x => x / 2.0),
      range(-7, 8).map(x => {
        let z = x / 2.0
        calc.exp(-z * z / 2) / calc.sqrt(2 * calc.pi)
      }),
      fill: blue,
    ),
  ))

  figure(caption: [Normal distribution], diagram)
}

最后，使用 `cmarker` 可以直接渲染 Markdown 文件内容：

#html.hr()

#let scope = (
  image: (source, alt: none, format: auto) => figure(image(source, alt: alt, format: format)),
)
#let md-content = read("tufted-titmouse.md")
#cmarker.render(md-content, math: mitex, scope: scope)

#html.hr()

`tufted-titmouse.md` 渲染完毕。