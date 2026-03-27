#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "Echo之死",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2022, month: 10, day: 31),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      在神话凌空的背面 \
      才是Echo赴死般寻觅的家 \
      但一方弱水却永远提前于她 \
      美丽的事固然提及遗憾 \
      不如传递他一个攻心的表达 \
    ]
  }
  auto-frame(poem_body)
}
