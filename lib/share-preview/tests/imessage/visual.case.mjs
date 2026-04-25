import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIMessageCardModel } from '../../runtime/renderers/imessage-model.mjs';
import { renderPlatformCardSvg } from '../../runtime/renderers/index.mjs';
import { measureTextWidth } from '../../runtime/svg-utils.mjs';
import { createPreludeEntry, createPreludeQrEntry, getQrSymbolBottom, getTextY } from '../helpers.mjs';

test('renderPlatformCardSvg applies smart colors to iMessage+ output', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry({ includeDescription: false }), 'imessagePlus', {
    smartColors: { backgroundColor: '#213547', titleColor: '#f7f8fa', urlColor: '#d6dde8' },
  });
  assert.match(svg, /fill="#213547"/);
  assert.match(svg, /fill="#f7f8fa"/);
  assert.match(svg, /fill="#d6dde8"/);
});

test('renderPlatformCardSvg names iMessage+ metadata panel parts and maps smart colors onto them', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus', {
    smartColors: { backgroundColor: '#223344', titleColor: '#f6f7fb', urlColor: '#d0dae8' },
  });
  assert.match(svg, /data-part="imessage-card"/);
  assert.match(svg, /data-part="imessage-metadata-panel"[^>]*fill="#223344"/);
  assert.match(svg, /data-part="imessage-title-block"[^>]*fill="#f6f7fb"/);
  assert.match(svg, /data-part="imessage-description-text"[^>]*fill="#d0dae8"/);
  assert.match(svg, /data-part="imessage-site-name-text"[^>]*fill="#d0dae8"/);
  assert.match(svg, /data-part="imessage-domain-text"[^>]*fill="#d0dae8"/);
});

test('renderPlatformCardSvg uses figma-squircle paths for the card shell and card clip', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus');
  const shellPath = svg.match(/<path d="([^"]+)" transform="translate\(20 18\)" data-part="imessage-card-shell"/);
  const cardClipPath = svg.match(
    /<clipPath id="imessage-card">\s*<path d="([^"]+)" transform="translate\(20 18\)" data-part="imessage-card-clip-path"/,
  );

  assert.ok(shellPath, 'Expected iMessage card shell path');
  assert.ok(cardClipPath, 'Expected iMessage card clip path');
  assert.equal(shellPath[1], cardClipPath[1]);
  assert.match(shellPath[1], /\bc\b/);
  assert.match(shellPath[1], /\ba\b/);
  assert.doesNotMatch(svg, /rx="30" ry="30"/);
  assert.doesNotMatch(svg, /A30 30 0 0 1/);
  assert.doesNotMatch(shellPath[1], /L550 18 L/);
});

test('renderPlatformCardSvg lets preview callers override the iMessage card corner size', () => {
  const smallCornerSvg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus', {
    cornerSize: 16,
  });
  const largeCornerSvg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus', {
    cornerSize: 44,
  });
  const smallShellPath =
    smallCornerSvg.match(/<path d="([^"]+)" transform="translate\(20 18\)" data-part="imessage-card-shell"/)?.[1] || '';
  const largeShellPath =
    largeCornerSvg.match(/<path d="([^"]+)" transform="translate\(20 18\)" data-part="imessage-card-shell"/)?.[1] || '';

  assert.notEqual(smallShellPath, largeShellPath);
  assert.match(smallShellPath, /a 16\.0000 16\.0000/);
  assert.match(largeShellPath, /a 44\.0000 44\.0000/);
});

test('renderPlatformCardSvg clips the cover image to the outer card shell without a dedicated cover curve clip', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus');
  const coverImageTag = svg.match(/<image[^>]+clip-path="url\(#imessage-card\)"[^>]*>/)?.[0] || '';
  const coverBackgroundTag =
    svg.match(/<rect[^>]+data-part="imessage-cover-background"[^>]*clip-path="url\(#imessage-card\)"[^>]*>/)?.[0] || '';

  assert.equal(svg.includes('id="imessage-cover"'), false);
  assert.match(coverImageTag, /clip-path="url\(#imessage-card\)"/);
  assert.match(coverBackgroundTag, /clip-path="url\(#imessage-card\)"/);
  assert.match(coverImageTag, /height="347"/);
});

test('renderPlatformCardSvg respects display toggles for description, url, and date', () => {
  const entry = createPreludeEntry();
  const hiddenSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    displayOptions: { description: false, url: false, date: false },
  });
  const datedSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    displayOptions: { description: false, url: false, date: true },
  });
  assert.doesNotMatch(hiddenSvg, /那时候，你就会明白/);
  assert.doesNotMatch(hiddenSvg, /data-part="imessage-description-text"/);
  assert.doesNotMatch(hiddenSvg, /data-part="imessage-domain-text"/);
  assert.doesNotMatch(hiddenSvg, /data-part="imessage-date-text"/);
  assert.match(datedSvg, /data-part="imessage-date-text"[^>]*aria-label="iMessage 发布日期"/);
  assert.ok(Math.abs(getTextY(datedSvg, 'imessage-date-text') - getTextY(datedSvg, 'imessage-site-name-text', 42)) < 1);
});

test('renderPlatformCardSvg anchors the bottom site row to the QR symbol bottom when url is hidden', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: false, date: false, qr: true },
  });
  assert.ok(getTextY(svg, 'imessage-site-name-text', 42) < getQrSymbolBottom(svg));
});

test('renderPlatformCardSvg renders QR overlay when qr is enabled and url text is hidden', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    smartColors: { backgroundColor: '#4b4120', titleColor: '#f3ebce', urlColor: '#d7c89a' },
    displayOptions: { description: false, url: false, date: false, qr: true },
  });
  assert.match(svg, /data-part="imessage-qr-overlay"/);
  assert.match(svg, /data-part="imessage-qr-mask"[^>]*fill="transparent"/);
  assert.match(svg, /data-part="imessage-qr-symbol"[^>]*fill="#d7c89a"/);
  assert.doesNotMatch(svg, /data-part="imessage-domain-text"/);
});

test('renderPlatformCardSvg wraps metadata text around the QR column', () => {
  const svg = renderPlatformCardSvg(
    createPreludeQrEntry({
      description:
        '这是一段特别长的描述，用来验证当右下角存在二维码时，描述文字会在左侧区域自动换行，不会继续铺到二维码所在的右侧空间。',
    }),
    'imessagePlus',
    {
      displayOptions: { description: true, url: true, date: false, qr: true },
    },
  );
  assert.match(svg, /data-part="imessage-description-text"[\s\S]*<tspan x="42" dy="22">/);
  assert.match(svg, /data-part="imessage-content-column"[^>]*clip-path="url\(#imessage-content-column-clip\)"/);
});

test('buildIMessageCardModel lets the first QR title line use the full panel width while continuation lines avoid the QR rail', () => {
  const model = buildIMessageCardModel(
    createPreludeQrEntry({
      shareTitle: '｢学习色彩科学[1]：光的坐标系——主流色彩空间｣ · Groove Blog',
    }),
    {
      includeDescription: true,
      displayOptions: { description: true, url: false, date: false, qr: true },
    },
  );

  const firstLineWidth = measureTextWidth(model.title.lines[0], {
    fontSize: model.title.fontSize,
    fontWeight: model.title.fontWeight,
  });
  const secondLineWidth = measureTextWidth(model.title.lines[1], {
    fontSize: model.title.fontSize,
    fontWeight: model.title.fontWeight,
  });

  assert.equal(model.title.lines.length, 2);
  assert.ok(model.layout.titleFirstLineWidth > model.layout.contentColumnWidth);
  assert.ok(firstLineWidth > model.layout.contentColumnWidth);
  assert.ok(firstLineWidth <= model.layout.titleFirstLineWidth);
  assert.ok(secondLineWidth <= model.layout.contentColumnWidth);
});

test('renderPlatformCardSvg gives the QR title block a wider first-line clip than the content column clip', () => {
  const svg = renderPlatformCardSvg(
    createPreludeQrEntry({
      shareTitle: '｢学习色彩科学[1]：光的坐标系——主流色彩空间｣ · Groove Blog',
    }),
    'imessagePlus',
    {
      displayOptions: { description: true, url: false, date: false, qr: true },
    },
  );

  const contentClipMatch = svg.match(
    /<clipPath id="imessage-content-column-clip">\s*<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/,
  );
  const titleFirstClipMatch = svg.match(
    /<clipPath id="imessage-title-clip">[\s\S]*?<rect x="([0-9.]+)" y="([0-9.]+)" width="([0-9.]+)" height="([0-9.]+)"/,
  );

  assert.ok(contentClipMatch, 'Expected content column clip path');
  assert.ok(titleFirstClipMatch, 'Expected dedicated title clip path');
  assert.ok(Number(titleFirstClipMatch[3]) > Number(contentClipMatch[3]));
  assert.match(svg, /data-part="imessage-title-group"[^>]*clip-path="url\(#imessage-title-clip\)"/);
});
