import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIMessageCardModel } from '../../runtime/renderers/imessage-model.mjs';
import { renderPlatformCardSvg } from '../../runtime/renderers/index.mjs';
import { measureTextWidth } from '../../runtime/svg-utils.mjs';
import { createPreludeEntry, createPreludeQrEntry, getQrSymbolBottom, getTextY } from '../helpers.mjs';

test('renderPlatformCardSvg applies smart colors to iMessage+ output', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus', {
    smartColors: {
      panelBg: '#213547',
      titleFg: '#f7f8fa',
      bodyFg: '#d8deea',
      contextFg: '#c1ccdb',
      qrMaskBg: '#31445d',
      qrFg: '#cad6e7',
    },
  });
  assert.match(svg, /fill="#213547"/);
  assert.match(svg, /fill="#f7f8fa"/);
  assert.match(svg, /fill="#d8deea"/);
  assert.match(svg, /fill="#c1ccdb"/);
});

test('renderPlatformCardSvg names iMessage+ metadata panel parts and maps smart colors onto them', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus', {
    smartColors: {
      panelBg: '#223344',
      titleFg: '#f6f7fb',
      bodyFg: '#d8dfeb',
      contextFg: '#bcc9da',
      qrMaskBg: '#314253',
      qrFg: '#c7d3e3',
    },
  });
  assert.match(svg, /data-part="imessage-card"/);
  assert.match(svg, /data-part="imessage-metadata-panel"[^>]*fill="#223344"/);
  assert.match(svg, /data-part="imessage-title-block"[^>]*fill="#f6f7fb"/);
  assert.match(svg, /data-part="imessage-description-text"[^>]*fill="#d8dfeb"/);
  assert.match(svg, /data-part="imessage-site-name-text"[^>]*fill="#bcc9da"/);
  assert.match(svg, /data-part="imessage-domain-text"[^>]*fill="#bcc9da"/);
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

test('renderPlatformCardSvg can hide title brackets without mutating the site suffix', () => {
  const entry = createPreludeEntry();

  const bracketedSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    displayOptions: { description: true, url: false, date: false, qr: false, brackets: true },
  });
  const plainSvg = renderPlatformCardSvg(entry, 'imessagePlus', {
    displayOptions: { description: true, url: false, date: false, qr: false, brackets: false },
  });

  assert.match(bracketedSvg, /｢Prelude——美好祝愿的开始｣/);
  assert.match(plainSvg, /Prelude——美好祝愿的开始/);
  assert.doesNotMatch(plainSvg, /｢Prelude——美好祝愿的开始｣/);
  assert.match(plainSvg, /<tspan x="42" dy="0">Groove Blog<\/tspan>/);
});

test('renderPlatformCardSvg anchors the bottom site row to the QR symbol bottom when url is hidden', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: false, date: false, qr: true },
  });
  assert.ok(getTextY(svg, 'imessage-site-name-text', 42) < getQrSymbolBottom(svg));
});

test('renderPlatformCardSvg renders QR overlay when qr is enabled and url text is hidden', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    smartColors: {
      panelBg: '#4b4120',
      titleFg: '#f3ebce',
      bodyFg: '#dccc9b',
      contextFg: '#d7c89a',
      qrMaskBg: '#5d5130',
      qrFg: '#dccc9b',
    },
    displayOptions: { description: false, url: false, date: false, qr: true },
  });
  assert.match(svg, /data-part="imessage-qr-overlay"/);
  assert.match(svg, /data-part="imessage-qr-mask"[^>]*fill="#4b4120"/);
  assert.match(svg, /data-part="imessage-qr-symbol"[^>]*fill="#dccc9b"/);
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
