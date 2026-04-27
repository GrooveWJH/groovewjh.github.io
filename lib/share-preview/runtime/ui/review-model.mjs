function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasContent(value) {
  return Boolean(collapseWhitespace(value));
}

function buildIssue(key, label, shortLabel, detail) {
  return { key, label, shortLabel, detail };
}

function buildDiagnostic(key, icon, tone, text) {
  return { key, icon, tone, text };
}

export function buildReviewModel(entry, { colorSamplingState = 'unavailable', exportStatus = 'idle', smartColors = null } = {}) {
  if (!entry) {
    return null;
  }

  const title = collapseWhitespace(entry.shareTitle || entry.sourceTitle);
  const description = collapseWhitespace(entry.descriptionText || entry.description);
  const canonicalUrl = collapseWhitespace(entry.canonicalUrl);
  const qrUrl = collapseWhitespace(entry.qrUrl);
  const imageSource = collapseWhitespace(entry.imageUrl || entry.imagePath);
  const publishedTime = collapseWhitespace(entry.publishedTime);
  const titleLength = [...title].length;
  const longTitle = titleLength > 44;
  const issues = [];

  if (!hasContent(title)) {
    issues.push(buildIssue('title', '标题缺失', '无标题', '当前页面没有可用于分享的标题。'));
  } else if (longTitle) {
    issues.push(
      buildIssue(
        'title-length',
        '标题可能换行过多',
        '标题过长',
        `当前标题共 ${titleLength} 个字符，卡片视觉可能会偏拥挤。`,
      ),
    );
  }

  if (!hasContent(description)) {
    issues.push(buildIssue('description', '描述缺失', '无描述', '导出的卡片仍可使用，但会失去重要的上下文说明。'));
  }

  if (!hasContent(imageSource)) {
    issues.push(buildIssue('image', '封面缺失', '无封面', '当前页面没有可用的分享图或封面图。'));
  }

  if (!hasContent(canonicalUrl)) {
    issues.push(
      buildIssue('canonical', 'Canonical URL 缺失', '无 canonical', '需要 canonical URL 才能准确核对分享目标地址。'),
    );
  }

  if (!hasContent(publishedTime)) {
    issues.push(
      buildIssue('published', '发布日期缺失', '无日期', '当前文章的 metadata 没有提供 article:published_time。'),
    );
  }

  if (!hasContent(qrUrl)) {
    issues.push(
      buildIssue('qr', '二维码目标缺失', '无二维码目标', '在解析出分享目标 URL 之前，二维码导出无法指向有效地址。'),
    );
  }

  const checks = [
    {
      key: 'title',
      icon: 'title',
      label: '标题',
      tone: !hasContent(title) || longTitle ? 'warning' : 'ready',
      statusLabel: !hasContent(title) ? '缺失' : longTitle ? '换行风险' : '就绪',
      detail: !hasContent(title) ? '未找到可用的分享标题。' : `${titleLength} 个字符`,
    },
    {
      key: 'description',
      icon: 'description',
      label: '描述',
      tone: hasContent(description) ? 'ready' : 'warning',
      statusLabel: hasContent(description) ? '就绪' : '缺失',
      detail: hasContent(description) ? `${[...description].length} 个字符` : '建议补一段简短摘要来提供上下文。',
    },
    {
      key: 'image',
      icon: 'image',
      label: '封面',
      tone: hasContent(imageSource) ? 'ready' : 'warning',
      statusLabel: hasContent(imageSource) ? '就绪' : '缺失',
      detail: hasContent(imageSource)
        ? entry.imageUrl
          ? '存在可用的绝对分享图地址。'
          : '仅有本地图片路径。'
        : '未找到封面来源。',
    },
    {
      key: 'canonical',
      icon: 'link',
      label: 'Canonical URL',
      tone: hasContent(canonicalUrl) ? 'ready' : 'warning',
      statusLabel: hasContent(canonicalUrl) ? '就绪' : '缺失',
      detail: hasContent(canonicalUrl) ? canonicalUrl : '未找到 canonical URL。',
    },
    {
      key: 'published',
      icon: 'date',
      label: '发布日期',
      tone: hasContent(publishedTime) ? 'ready' : 'warning',
      statusLabel: hasContent(publishedTime) ? '就绪' : '缺失',
      detail: hasContent(publishedTime) ? publishedTime : '未找到 article:published_time 的值。',
    },
    {
      key: 'qr',
      icon: 'qr',
      label: '二维码目标',
      tone: hasContent(qrUrl) ? 'ready' : 'warning',
      statusLabel: hasContent(qrUrl) ? '就绪' : '缺失',
      detail: hasContent(qrUrl) ? qrUrl : '当前没有可供二维码导出的分享目标地址。',
    },
  ];

  const diagnostics = [];

  if (colorSamplingState === 'ready') {
    diagnostics.push(buildDiagnostic('smart-colors', 'palette', 'ready', '当前已根据封面图应用智能配色。'));
  } else if (colorSamplingState === 'loading') {
    diagnostics.push(buildDiagnostic('smart-colors', 'palette', 'info', '智能配色仍在采样封面图颜色。'));
  } else if (colorSamplingState === 'error') {
    diagnostics.push(buildDiagnostic('smart-colors', 'warning', 'warning', '智能配色采样失败，当前预览已回退到默认卡片颜色。'));
  } else {
    diagnostics.push(buildDiagnostic('smart-colors', 'palette', 'info', '由于没有可采样的图片，智能配色当前不可用。'));
  }

  if (smartColors && colorSamplingState === 'ready') {
    diagnostics.push(
      buildDiagnostic(
        'smart-colors-reason',
        'preview',
        'info',
        `当前信息面板采用 ${smartColors.toneMode}，意图为 ${smartColors.panelIntent}。${smartColors.selectionReason}`,
      ),
    );
  }

  if (!entry.imageUrl && entry.imagePath) {
    diagnostics.push(buildDiagnostic('image-source', 'image', 'warning', '当前预览可以使用本地图片路径渲染，但无法校验绝对分享图 URL。'));
  }

  if (exportStatus === 'busy') {
    diagnostics.push(buildDiagnostic('export', 'export', 'info', '当前卡片正在导出 PNG。'));
  } else if (exportStatus === 'success') {
    diagnostics.push(buildDiagnostic('export', 'ready', 'ready', '上一次 PNG 导出已成功完成。'));
  } else if (exportStatus === 'error') {
    diagnostics.push(buildDiagnostic('export', 'warning', 'warning', '上一次 PNG 导出失败，请查看浏览器弹窗中的具体错误信息。'));
  }

  if (diagnostics.length === 0) {
    diagnostics.push(buildDiagnostic('review', 'preview', 'info', '先检查清单，再在合适时导出当前卡片。'));
  }

  const issueCount = issues.length;
  const issueLabel = issueCount === 1 ? '1 项问题待处理' : `${issueCount} 项问题待处理`;

  return {
    title,
    rawPath: entry.rawPagePath || entry.pagePath,
    hasTitle: hasContent(title),
    hasDescription: hasContent(description),
    hasImage: hasContent(imageSource),
    hasCanonicalUrl: hasContent(canonicalUrl),
    hasPublishedTime: hasContent(publishedTime),
    hasQr: hasContent(qrUrl),
    issueCount,
    issues,
    checks,
    diagnostics,
    listSummaryText: issueCount
      ? `${issueCount} 项问题 · ${issues
          .slice(0, 2)
          .map((issue) => issue.shortLabel)
          .join(' · ')}`
      : '可导出',
    overallTone: issueCount ? 'warning' : 'ready',
    overallLabel: issueCount ? issueLabel : '可导出',
    statusDescription: issueCount
      ? '当前页面仍有 metadata 缺口或展示风险，建议修正后再导出。'
      : '核心 metadata 已具备，当前卡片可以继续做视觉检查或直接导出。',
    colorSamplingState,
    exportStatus,
  };
}
