export function getAuditGroupNarrative(groupSummary) {
  if (groupSummary.group === 'title') {
    return {
      description: '标题按大号文本处理。界面会展示 WCAG 的大号文本阈值，但内部发布线仍统一使用 AA+ 5.5:1。',
      rules: ['大号文本', 'AA 3.0', 'AA+ 5.5', 'AAA 4.5'],
    };
  }

  if (groupSummary.group === 'description') {
    return {
      description: '描述文本按正文标准检查。即使封面配色把底部信息区拉向低对比，也应保持稳定可读。',
      rules: ['正文文本', 'AA 4.5', 'AA+ 5.5', 'AAA 7.0'],
    };
  }

  if (groupSummary.group === 'context') {
    return {
      description: '信息区会一起审计站点名、发布日期和链接。被显示开关隐藏的项不计入分母，缺失项仍计为未通过。',
      rules: ['正文文本', 'AA 4.5', 'AA+ 5.5', 'AAA 7.0'],
    };
  }

  return {
    description:
      '二维码采用启发式对比度检查，而不是正式文本标准。这里仍统一展示 4.5 / 5.5 / 7.0 三档阈值，方便按同一条发布线判断。',
    rules: ['QR 启发式', 'AA 4.5', 'AA+ 5.5', 'AAA 7.0'],
  };
}
