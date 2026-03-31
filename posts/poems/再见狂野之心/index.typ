#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "再见狂野之心",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2021, month: 12, day: 31),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      夜的窗帘是码头风景画 \
      简约的女郎，简约的夏天 \
      时过境迁 \
      她依旧从容且简约 \
      而水手凝固在某一步 \
      一首送给女郎裙摆的歌 \
      他要练习二十四年 \
      酒宴过半，他举杯对我说 \
      相见的那天 \
      还很遥远 \
    ]
  }

  auto-frame(poem_body)
}
