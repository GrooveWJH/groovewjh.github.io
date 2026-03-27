#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "劣弧畔涉水",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2022, month: 8, day: 20),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      落暮时，阴雨的思绪进入荒漠 \ 
      困倦的风就扫过的金黄的麦子 \ 
      当我写到“自卑的青春” \ 
      一个霭霭的秋天就落了下来 \ 
      真是—— \ 
      一季又延至一生的烟云 \ 
      在劣弧之畔涉水 \ 
      冷雨嘀嗒 \ 
      这饱含乌云的泽畔 \ 
      我用食指与野花一期一会 \ 
      弧形天空下 \ 
      又能让我逢着 \ 
      多少幕送别 或凯旋的戏码 \ \
      原来折叠的人生并非如我所愿 \ 
      月台才是真切的广阔无垠 \ 
      而你为什么不去死？ \ 
    ]
  }

  auto-frame(poem_body)
}
