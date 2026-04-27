import { escapeHtml } from './render-markup.mjs';

function buildCoverDetails(customDraft) {
  const draft = customDraft || {};
  const hasCover = Boolean(draft.coverImageHref);
  const width = Number(draft.coverImageWidth || 0) || null;
  const height = Number(draft.coverImageHeight || 0) || null;
  const hasDimensions = Boolean(width && height);
  const dimensions = hasDimensions ? `${width} x ${height}px` : null;
  const fileName = String(draft.coverImageName || '').trim();

  if (!hasCover) {
    return {
      buttonLabel: '选择封面',
      meta: '未上传时会回退到默认卡片外观。',
      status: 'Default',
      summary: '当前未上传封面图。',
      title: '添加一张封面图',
    };
  }

  return {
    buttonLabel: '替换封面',
    meta: dimensions ? `预览和导出会保留 ${dimensions} 的原始比例。` : '预览和导出会保留原始图片比例。',
    status: 'Loaded',
    summary: fileName || '已载入一张自定义封面图。',
    title: '封面已就绪',
  };
}

function renderCoverField(customDraft) {
  const cover = buildCoverDetails(customDraft);

  return `<section class="carbon-preview-custom-field carbon-preview-custom-field--cover" data-custom-cover-shell>
    <div class="carbon-preview-custom-field__header-row">
      <span class="carbon-preview-custom-field__label">Cover</span>
      <span class="carbon-preview-custom-upload__status" data-custom-cover-status>${escapeHtml(cover.status)}</span>
    </div>
    <input
      class="carbon-preview-custom-file-input"
      type="file"
      accept="image/*"
      aria-label="Upload custom cover image"
      data-custom-field="cover"
      data-custom-cover-input
    >
    <div class="carbon-preview-custom-upload" data-custom-cover-picker>
      <div class="carbon-preview-custom-upload__copy">
        <p class="carbon-preview-custom-upload__eyebrow">Image Upload</p>
        <h4 class="carbon-preview-custom-upload__title" data-custom-cover-title>${escapeHtml(cover.title)}</h4>
        <p class="carbon-preview-custom-upload__summary" data-custom-cover-summary>${escapeHtml(cover.summary)}</p>
        <p class="carbon-preview-custom-upload__meta" data-custom-cover-meta>${escapeHtml(cover.meta)}</p>
      </div>
      <div class="carbon-preview-custom-upload__actions">
        <button class="carbon-preview-custom-upload__button" type="button" data-custom-cover-trigger>${escapeHtml(cover.buttonLabel)}</button>
        <button
          class="carbon-preview-custom-upload__secondary"
          type="button"
          data-custom-cover-clear
          ${cover.status === 'Loaded' ? '' : 'disabled'}
        >移除</button>
      </div>
    </div>
    <span class="carbon-preview-custom-field__hint">支持本地图像文件。卡片会沿用你上传封面的真实宽高比，不会写死预览比例。</span>
  </section>`;
}

export function renderPreviewModes(activeMode) {
  return `<div class="carbon-preview-mode-switcher" role="tablist" aria-label="预览模式">
    ${[
      ['library', '文章库'],
      ['custom', '自定义'],
    ]
      .map(
        ([key, label]) => `<button
        class="carbon-preview-mode-switcher__tab${activeMode === key ? ' is-active' : ''}"
        type="button"
        role="tab"
        aria-selected="${activeMode === key ? 'true' : 'false'}"
        data-preview-mode="${escapeHtml(key)}"
      >${escapeHtml(label)}</button>`,
      )
      .join('')}
  </div>`;
}

export function renderCustomEditor(customDraft) {
  const draft = customDraft || {};
  const fields = [
    ['title', 'Title', 'text', draft.title || '', '标题会进入卡片主标题，并与来源文案拼出 shareTitle。'],
    ['description', 'Description', 'textarea', draft.description || '', '描述会直接进入 iMessage+ 信息面板。'],
    ['siteName', 'Source Name', 'text', draft.siteName || '', '同时替换标题后缀与底部来源行。'],
    ['url', 'QR URL', 'url', draft.url || '', '同时作为 canonical URL、域名显示来源与二维码编码地址。'],
  ];

  return `<section class="carbon-preview-custom-editor" aria-label="自定义分享卡片表单">
    <header class="carbon-preview-custom-editor__header">
      <p class="carbon-preview-kicker">Custom</p>
      <h3>手工生成一张卡片</h3>
      <p>上传封面，实时修改标题、描述、来源文案和二维码地址。</p>
    </header>
    <div class="carbon-preview-custom-editor__fields">
      ${renderCoverField(draft)}
      ${fields
        .map(([key, label, kind, value, hint]) => {
          if (kind === 'textarea') {
            return `<label class="carbon-preview-custom-field" data-custom-field="${escapeHtml(key)}">
              <span class="carbon-preview-custom-field__label">${escapeHtml(label)}</span>
              <textarea class="carbon-preview-custom-field__input carbon-preview-custom-field__textarea" rows="5" data-custom-field="${escapeHtml(key)}">${escapeHtml(value)}</textarea>
              <span class="carbon-preview-custom-field__hint">${escapeHtml(hint)}</span>
            </label>`;
          }

          return `<label class="carbon-preview-custom-field" data-custom-field="${escapeHtml(key)}">
            <span class="carbon-preview-custom-field__label">${escapeHtml(label)}</span>
            <input class="carbon-preview-custom-field__input" type="${escapeHtml(kind)}" value="${escapeHtml(value)}" data-custom-field="${escapeHtml(key)}">
            <span class="carbon-preview-custom-field__hint">${escapeHtml(hint)}</span>
          </label>`;
        })
        .join('')}
    </div>
  </section>`;
}

export function syncCustomEditor(node, customDraft) {
  if (!node?.querySelector) {
    return;
  }

  const cover = buildCoverDetails(customDraft);
  const statusNode = node.querySelector('[data-custom-cover-status]');
  const titleNode = node.querySelector('[data-custom-cover-title]');
  const summaryNode = node.querySelector('[data-custom-cover-summary]');
  const metaNode = node.querySelector('[data-custom-cover-meta]');
  const triggerNode = node.querySelector('[data-custom-cover-trigger]');
  const clearNode = node.querySelector('[data-custom-cover-clear]');

  if (statusNode) {
    statusNode.textContent = cover.status;
  }
  if (titleNode) {
    titleNode.textContent = cover.title;
  }
  if (summaryNode) {
    summaryNode.textContent = cover.summary;
  }
  if (metaNode) {
    metaNode.textContent = cover.meta;
  }
  if (triggerNode) {
    triggerNode.textContent = cover.buttonLabel;
  }
  if (clearNode) {
    clearNode.disabled = cover.status !== 'Loaded';
  }
}
