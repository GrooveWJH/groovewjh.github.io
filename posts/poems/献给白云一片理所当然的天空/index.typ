#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "献给白云一片理所当然的天空",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2023, month: 6, day: 30),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      无数个明天里哪儿我才能再次遇见 \
      缘悭一面的你 \
      唯独，留白的园地 \
      蓝马嘀嗒的声音 \
    ]
  }

  auto-frame(poem_body)
}
