#import "../../config.typ": template-post
#import "@preview/cmarker:0.1.7"
#show: template-post.with(
  title: "深夜重构记录",
  tags: ("重构", "开发日志"),
  category: "开发",
  date: datetime(year: 2024, month: 5, day: 16),
  description: "用来测试中段时间的文章样本，观察归档页和标签页中的日期显示。",
)

= 背景

测试文章不追求复杂内容，只需要足够验证构建后的元数据与列表页输出。

= 输出

这篇文章覆盖了标题较长、摘要适中和常见标签组合的情况。
