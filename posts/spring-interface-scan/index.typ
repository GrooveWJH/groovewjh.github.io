#import "../../config.typ": template-post
#import "@preview/cmarker:0.1.7"
#show: template-post.with(
  title: "春季界面巡检",
  tags: ("界面", "巡检"),
  category: "更新",
  date: datetime(year: 2024, month: 3, day: 28),
  description: "记录一次针对导航、卡片和链接状态的集中巡检，用于测试文章排序。",
)

= 巡检范围

本篇用于补充 2024 年的测试数据，方便检查首页卡片排序和分类页列表是否正常。

= 结论

如果页面顺序与日期一致，说明当前构建链路的日期处理仍然稳定。
