import { DEFAULT_SHARE_CARD_CORNER_SIZE } from '../config.mjs';
import { escapeHtml, renderIcon, renderStatusChip } from './render-markup.mjs';

function formatPayloadRows(entry) {
  return [
    ['sourceTitle', entry.sourceTitle || '—'],
    ['shareTitle', entry.shareTitle || '—'],
    ['description', entry.description || '—'],
    ['descriptionText', entry.descriptionText || '—'],
    ['canonicalUrl', entry.canonicalUrl || '—'],
    ['qrUrl', entry.qrUrl || '—'],
    ['imagePath', entry.imagePath || '—'],
    ['imageUrl', entry.imageUrl || '—'],
    ['siteName', entry.siteName || '—'],
    ['publishedTime', entry.publishedTime || '—'],
    ['og:type', entry.pageKind === 'article' ? 'article' : 'website'],
    ['twitter:card', entry.imageUrl ? 'summary_large_image' : 'summary'],
  ];
}

export function renderPageResults(filteredPages, totalPages, query) {
  if (!totalPages) {
    return '没有文章';
  }

  if (!query) {
    return `${filteredPages.length} / ${totalPages} 篇文章`;
  }

  return `“${query}” 共 ${filteredPages.length} 条结果`;
}

export function renderPageList(pages, activeId, reviewById) {
  return pages
    .map((page) => {
      const reviewModel = reviewById.get(page.id);
      const tone = reviewModel?.issueCount ? 'warning' : 'ready';
      const statusLabel = reviewModel?.issueCount ? `${reviewModel.issueCount} 项问题` : '就绪';
      const summaryText = reviewModel?.listSummaryText || '可导出';

      return `
    <button class="carbon-preview-page-list__item${page.id === activeId ? ' is-active' : ''}" type="button" data-page-id="${escapeHtml(page.id)}">
      <div class="carbon-preview-page-list__header">
        <strong class="carbon-preview-page-list__title">${escapeHtml(page.sourceTitle || page.shareTitle || page.pagePath)}</strong>
        ${renderStatusChip({ icon: tone === 'ready' ? 'ready' : 'warning', label: statusLabel, tone })}
      </div>
      <span class="carbon-preview-page-list__path">${escapeHtml(page.rawPagePath || page.pagePath)}</span>
      <span class="carbon-preview-page-list__summary">${escapeHtml(summaryText)}</span>
    </button>
  `;
    })
    .join('');
}

export function renderStageMeta(state, colorSamplingState) {
  const colorLabel =
    colorSamplingState === 'ready'
      ? '智能配色已就绪'
      : colorSamplingState === 'loading'
        ? '智能配色采样中'
        : colorSamplingState === 'error'
          ? '智能配色失败'
          : '未进行颜色采样';
  const colorTone =
    colorSamplingState === 'ready'
      ? 'ready'
      : colorSamplingState === 'loading'
        ? 'info'
        : colorSamplingState === 'error'
          ? 'warning'
          : 'neutral';

  return `
    <div class="carbon-preview-stage-toolbar__header">
      <p class="carbon-preview-kicker">预览</p>
      <h2>实时卡片画布</h2>
    </div>
    <div class="carbon-preview-stage-toolbar__pills">
      ${renderStatusChip({ icon: 'palette', label: colorLabel, tone: colorTone })}
      ${renderStatusChip({
        icon: 'canvas',
        label: state.squareCanvas ? '方形画布已开启' : '方形画布已关闭',
        tone: state.squareCanvas ? 'ready' : 'neutral',
      })}
    </div>
  `;
}

export function renderCanvasToggle(squareCanvas) {
  return `<label class="carbon-preview-toggle">
    <input id="square-canvas-toggle" type="checkbox" ${squareCanvas ? 'checked' : ''}>
    ${renderIcon('canvas')}
    <span class="carbon-preview-toggle__label">方形画布</span>
  </label>`;
}

function renderCornerSizeControl(cornerSize) {
  const safeCornerSize = Number.isFinite(Number(cornerSize)) ? Number(cornerSize) : DEFAULT_SHARE_CARD_CORNER_SIZE;

  return `<div class="carbon-preview-range-control">
    <label class="carbon-preview-range-control__label" for="corner-size-input">圆角大小</label>
    <div class="carbon-preview-range-control__row">
      <input
        id="corner-size-input"
        class="carbon-preview-range-control__input"
        type="range"
        min="0"
        max="60"
        step="1"
        value="${safeCornerSize}"
        data-corner-size-input
      >
      <output class="carbon-preview-range-control__value" for="corner-size-input">${safeCornerSize}</output>
    </div>
  </div>`;
}

export function renderDisplayOptions(entry, displayOptions, cornerSize) {
  const controls = [
    ['description', '描述', 'description', Boolean(entry?.descriptionText || entry?.description)],
    ['url', '链接', 'link', Boolean(entry?.canonicalUrl || entry?.pagePath || entry?.siteName)],
    ['date', '日期', 'date', Boolean(entry?.publishedTime)],
    ['qr', '二维码', 'qr', Boolean(entry?.qrUrl)],
  ];

  return `<fieldset class="carbon-preview-option-group">
    <legend class="carbon-preview-option-group__label">${renderIcon('controls')}<span>显示字段</span></legend>
    <div class="carbon-preview-option-list">
      ${controls
        .map(([key, label, icon, available]) => {
          const checked = available && Boolean(displayOptions?.[key]);
          return `<label class="carbon-preview-segment${available ? '' : ' is-disabled'}">
          <input type="checkbox" data-display-option="${escapeHtml(key)}" ${checked ? 'checked' : ''} ${available ? '' : 'disabled'}>
          ${renderIcon(icon)}
          <span>${escapeHtml(label)}</span>
        </label>`;
        })
        .join('')}
    </div>
    ${renderCornerSizeControl(cornerSize)}
  </fieldset>`;
}

export function renderInspectorTabs(activeInspectorPanel) {
  return [
    ['review', '检查', 'preview'],
    ['payload', '负载', 'payload'],
  ]
    .map(
      ([key, label, icon]) => `
    <button
      class="carbon-preview-inspector__tab${key === activeInspectorPanel ? ' is-active' : ''}"
      type="button"
      role="tab"
      aria-selected="${key === activeInspectorPanel ? 'true' : 'false'}"
      data-inspector-panel="${escapeHtml(key)}"
    >${renderIcon(icon)}<span>${escapeHtml(label)}</span></button>
  `,
    )
    .join('');
}

export function renderPayloadPanel(entry) {
  return `<dl class="carbon-preview-payload-grid">${formatPayloadRows(entry)
    .map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('')}</dl>`;
}

export function renderExportButton(status) {
  if (status === 'busy') {
    return `${renderIcon('export')}<span>正在导出 PNG…</span>`;
  }
  if (status === 'success') {
    return `${renderIcon('ready')}<span>已导出 PNG</span>`;
  }
  if (status === 'error') {
    return `${renderIcon('warning')}<span>导出失败</span>`;
  }
  return `${renderIcon('export')}<span>导出 PNG</span>`;
}
