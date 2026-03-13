#import "../../config.typ": template-post
#import "@preview/cmarker:0.1.7"
#show: template-post.with(
  title: "深夜修布局时记下的几点",
  tags: ("CSS", "调试"),
  category: "开发",
  date: datetime(year: 2025, month: 5, day: 8),
  description: "把卡片间距、长标题折行和页脚留白一起调顺之后，顺手留下几点记录。",
)

= 问题集中出现的地方

真正麻烦的通常不是单个样式，而是多个边界条件叠在一起时的结果，比如长标题、较长摘要以及不同日期长度同时出现。

= 处理方式

与其靠一次性重写，不如先补一组内容样本，再观察布局在真实数据下的表现。