#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "情诗折叠 月掩毕宿五",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2022, month: 9, day: 30),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      走过金牛座上的秋高气爽 \
      衣裳鼓满昨夜星辰 \
      眺望的西方学者在落山风里 \
      习得日心说和“岁月败美人” \
      开口道—— \
      如今昴仙笑浅朝别暮现 \
      我却昏花了两眼，竟以为花海迢递 \
      佯装成江南又开始凋零 \
      而同样在那儿 \
      曾经的她口述过夭灼的故事 \
      却用一种欲言不能的声音 \
    ]
  }

  auto-frame(poem_body)
}
