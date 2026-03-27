#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "就这样看着暮色",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2022, month: 11, day: 15),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      在你的阴影之下 \ 
      暮色一遍一遍灼烧着 \ 
      我的宿疾，我不得不裹紧衣服 \ 
      而裸体却孤独地守望着 \ 
      遥远的晚风，无尽的等待 \ \
      耐心——我怒火里的万吨沧海 \ 
      但假如… \ 
    ]
  }

  auto-frame(poem_body)
}
