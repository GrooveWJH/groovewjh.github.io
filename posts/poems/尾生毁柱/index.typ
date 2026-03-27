#import "../../../config.typ": *

#set page(height: auto, width: 24cm)
#set text(16pt, font: "IBM Plex Sans SC", lang: "zh")
#show raw: text.with(font: ("Zed Plex Mono", "IBM Plex Sans SC"))
#show math.equation: set text(16pt)
#set table(inset: 9pt)

#show: template-post.with(
  title: "尾生毁柱",
  description: "",
  tags: ("诗歌",),
  category: "诗歌",
  date: datetime(year: 2022, month: 10, day: 10),
)

#{
  let poem_body = {
    set text(font: ("Kai", "KaiTi", "Kaiti SC", "LXGW WenKai"))
    [
      浪花勾勒出她懊悔但已释然的形象 \ 
      行将灭顶的猛水却不令故事忧伤 \ 
      忧伤的是，被误解、传颂为 \ 
      口述者心中的佳话 \ 
      一想到人生大事 \ 
      他就索性放开沮丧的臂膀 \ \
      将自己，一枚刻意的骰子丢进 \ 
      后世鳞次栉比的赌局 \ 
      与自己慷慨相拥，滚动在景观中 \ 
      点缀爱情的殿堂 \ 
    ]
  }

  auto-frame(poem_body)
}
