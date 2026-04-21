import { buildSharePreviewEntry } from './share-preview.mjs';

export const PRELUDE_QR_URL = 'https://groovewjh.github.io/posts/articles/prelude/';

export function createPreludeEntry({ includeDescription = true, includePublishedTime = true } = {}) {
  const descriptionMeta = includeDescription
    ? '<meta name="description" content="那时候，你就会明白，一切我们爱过与恨过的，其实并没有什么不同。">'
    : '';
  const publishedTimeMeta = includePublishedTime ? '<meta property="article:published_time" content="2026-03-02">' : '';
  return buildSharePreviewEntry({
    outputRel: 'posts/articles/prelude/index.html',
    html: `<!DOCTYPE html>
<html>
  <head>
    <title>Prelude——美好祝愿的开始</title>
    ${descriptionMeta}
    <meta property="og:title" content="｢Prelude——美好祝愿的开始｣ · Groove Blog">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Groove Blog">
    ${publishedTimeMeta}
  </head>
  <body><div class="post-cover"><img src="/posts/articles/prelude/img/cover.jpeg"></div></body>
    </html>`,
  });
}

export function createPreludeQrEntry(overrides = {}) {
  return { ...createPreludeEntry(), qrUrl: PRELUDE_QR_URL, ...overrides };
}

export function getTextY(svg, part, x = null) {
  const prefix =
    x == null ? `<text[^>]*y="([0-9.]+)" data-part="${part}"` : `<text x="${x}" y="([0-9.]+)" data-part="${part}"`;
  const match = svg.match(new RegExp(prefix));
  return match ? Number(match[1]) : null;
}

export function getRectBox(svg, part) {
  const match = svg.match(
    new RegExp(`<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"[^>]*data-part="${part}"`),
  );
  return match ? { x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]) } : null;
}

export function getQrSymbolBottom(svg) {
  const match = svg.match(/<path d="([^"]+)" data-part="imessage-qr-symbol"/);
  if (!match) {
    return null;
  }
  const cells = [...match[1].matchAll(/M([0-9.]+),([0-9.]+)h([0-9.]+)v([0-9.]+)h-/g)];
  return cells.length ? Math.max(...cells.map(([, , y, , h]) => Number(y) + Number(h))) : null;
}
