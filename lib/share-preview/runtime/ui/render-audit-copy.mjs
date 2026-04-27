export function getAuditGroupNarrative(groupSummary) {
  if (groupSummary.group === 'title') {
    return {
      description: '标题角色直接消费 `titleFg -> panelBg`。这条线关注的是发布可读性，而不是只看大号文本的最低 WCAG 参考值。',
      rules: ['role: titleFg', '发布线 5.5', 'WCAG AA 3.0', 'WCAG AAA 4.5'],
    };
  }

  if (groupSummary.group === 'description') {
    return {
      description: '描述角色消费 `bodyFg -> panelBg`。它需要和标题同样稳定地跨过 5.5:1，避免只在某些封面上暂时可读。',
      rules: ['role: bodyFg', '发布线 5.5', 'WCAG AA 4.5', 'WCAG AAA 7.0'],
    };
  }

  if (groupSummary.group === 'context') {
    return {
      description: '信息区会一起审计站点名、发布日期和链接，它们统一消费 `contextFg -> panelBg`。隐藏项不计入分母，缺失项仍视为失败。',
      rules: ['role: contextFg', '发布线 5.5', 'WCAG AA 4.5', 'WCAG AAA 7.0'],
    };
  }

  return {
    description: '二维码角色单独消费 `qrFg -> qrMaskBg`。这块优先保证扫描可靠性，所以发布线直接抬到 7.0:1。',
    rules: ['role: qrFg', 'mask: qrMaskBg', '发布线 7.0', '扫描优先'],
  };
}
