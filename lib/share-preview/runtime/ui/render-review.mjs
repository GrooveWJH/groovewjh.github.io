import { escapeHtml, renderIcon } from './render-markup.mjs';

function renderChecklist(reviewModel) {
  return `<section class="carbon-preview-review-section">
    <h3>检查清单</h3>
    <ul class="carbon-preview-checklist">
      ${reviewModel.checks
        .map(
          (check) => `
        <li class="carbon-preview-checklist__item is-${check.tone}">
          <div class="carbon-preview-checklist__header">
            <div class="carbon-preview-checklist__label">
              ${renderIcon(check.icon)}
              <span>${escapeHtml(check.label)}</span>
            </div>
            <strong class="carbon-preview-checklist__status">${escapeHtml(check.statusLabel)}</strong>
          </div>
          <p class="carbon-preview-checklist__detail">${escapeHtml(check.detail)}</p>
        </li>
      `,
        )
        .join('')}
    </ul>
  </section>`;
}

function renderIssues(reviewModel) {
  if (!reviewModel.issueCount) {
    return `<section class="carbon-preview-review-section">
      <h3>问题项</h3>
      <div class="carbon-preview-review-note is-ready">
        ${renderIcon('ready')}
        <div>
          <strong>没有阻塞问题</strong>
          <p>关键 metadata 已齐备，当前卡片可以进入最后的视觉检查。</p>
        </div>
      </div>
    </section>`;
  }

  return `<section class="carbon-preview-review-section">
    <h3>问题项</h3>
    <ul class="carbon-preview-issue-list">
      ${reviewModel.issues
        .map(
          (issue) => `
        <li class="carbon-preview-issue-list__item">
          ${renderIcon('warning')}
          <div>
            <strong>${escapeHtml(issue.label)}</strong>
            <p>${escapeHtml(issue.detail)}</p>
          </div>
        </li>
      `,
        )
        .join('')}
    </ul>
  </section>`;
}

function renderDiagnostics(reviewModel) {
  return `<section class="carbon-preview-review-section">
    <h3>诊断</h3>
    <ul class="carbon-preview-diagnostics">
      ${reviewModel.diagnostics
        .map(
          (diagnostic) => `
        <li class="carbon-preview-diagnostics__item is-${diagnostic.tone}">
          ${renderIcon(diagnostic.icon)}
          <span>${escapeHtml(diagnostic.text)}</span>
        </li>
      `,
        )
        .join('')}
    </ul>
  </section>`;
}

export function renderReviewPanel(entry, reviewModel) {
  return `
    <section class="carbon-preview-review-hero">
      <p class="carbon-preview-kicker">当前页面</p>
      <h3>${escapeHtml(reviewModel.title || entry.pagePath)}</h3>
      <p class="carbon-preview-review-hero__path">${escapeHtml(reviewModel.rawPath)}</p>
      <div class="carbon-preview-review-hero__status is-${reviewModel.overallTone}">
        ${renderIcon(reviewModel.overallTone === 'ready' ? 'ready' : 'warning')}
        <div>
          <strong>${escapeHtml(reviewModel.overallLabel)}</strong>
          <p>${escapeHtml(reviewModel.statusDescription)}</p>
        </div>
      </div>
    </section>
    ${renderIssues(reviewModel)}
    ${renderChecklist(reviewModel)}
    ${renderDiagnostics(reviewModel)}
  `;
}
