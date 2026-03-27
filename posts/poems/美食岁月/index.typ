#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "美食岁月",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2022, month: 6, day: 20),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      当老人被晚风引荐，坐上门墩 \ 
      靠在云霞的阴影中 \ 
      畅饮二两黄酒 \ 
      浊眼品尝着秋收的味道 \ 
      醉意夕阳，他自然地回想 \ 
      母亲的哭声 \ 
      童年如此饥饿又漫长 \ 
      他默默落泪了 \ \
      或者，当年轻的我汗水淋漓 \ 
      坐在餐桌前，食欲大开 \ 
      咬着筷子，这传达给我 \ 
      某些和平的滋味 \ 
      一块豆腐的十九种制法 \ 
      每种都暗示着： \ 
      我正是为了——吃，而活 \ 
      但今天 \ 
      菜品有所不同 \ 
      我将米饭轻松入口 \ 
      然后 \ 
      下定决心 \ 
    ]
  }

  auto-frame(poem_body)
}
