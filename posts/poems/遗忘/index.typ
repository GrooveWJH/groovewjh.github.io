#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "遗忘",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2021, month: 2, day: 6),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      你在四季中度过自己的一生 \ 
      你善于遗忘 \ 
      你善于在凹陷的地方遐想 \ \
      不然 \ 
      在自己的葬礼上 \ 
      你也不会回想起 \ 
      朦胧时代的月亮 \ 
      附和秋雨及波浪 \ \
      银杏叶落 \ 
      围攻 \ 
      那时紧紧拥抱的 \ 
      你们两 \ 
      不善于爱情 \ 
      眼眸里闪烁的 \ 
      不是泪光 \ 
      是相隔万里的幻想 \ 
    ]
  }

  auto-frame(poem_body)
}
