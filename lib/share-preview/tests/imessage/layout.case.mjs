import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIMessageCardModel } from '../../runtime/renderers/imessage-model.mjs';
import { renderPlatformCardSvg } from '../../runtime/renderers/index.mjs';
import { createPreludeEntry, createPreludeQrEntry, getQrSymbolBottom, getRectBox, getTextY } from '../helpers.mjs';

test('renderPlatformCardSvg places description before site name in the metadata flow', () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: true, date: false, qr: false },
  });
  assert.ok(getTextY(svg, 'imessage-description-text', 42) < getTextY(svg, 'imessage-site-name-text', 42));
});

test('renderPlatformCardSvg uses multiline descriptionText and grows beyond the previous two-line cap', () => {
  const model = buildIMessageCardModel(
    createPreludeEntry({
      description: '第一行 第二行 第三行 第四行',
      descriptionText:
        '第一行\n第二行需要继续自动换行以验证描述区域会继续增长而不是被限制在两行之内。\n第三行也应当继续保留。',
    }),
    {
      includeDescription: true,
      displayOptions: { description: true, url: false, date: false, qr: false },
    },
  );

  assert.ok(model.description);
  assert.ok(model.description.lines.length > 2);
  assert.equal(model.description.lines[0], '第一行');
  assert.ok(model.infoHeight > 148);
});

test('renderPlatformCardSvg anchors site metadata above a separate bottom url line', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  assert.ok(getTextY(svg, 'imessage-site-name-text', 42) < getTextY(svg, 'imessage-domain-text', 42));
  assert.ok(getTextY(svg, 'imessage-domain-text', 42) < getQrSymbolBottom(svg));
});

test('renderPlatformCardSvg places QR overlay inside the metadata panel', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  const panel = getRectBox(svg, 'imessage-metadata-panel');
  const qrMask = getRectBox(svg, 'imessage-qr-mask');
  assert.ok(qrMask.y > panel.y);
  assert.ok(qrMask.y + qrMask.height <= panel.y + panel.height);
});

test('renderPlatformCardSvg keeps QR right and bottom safety insets aligned', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  const panel = getRectBox(svg, 'imessage-metadata-panel');
  const qrMask = getRectBox(svg, 'imessage-qr-mask');
  const panelRightInset = 20 + 560 - (qrMask.x + qrMask.width);
  const panelBottomInset = panel.y + panel.height - (qrMask.y + qrMask.height);
  assert.equal(qrMask.width, qrMask.height);
  assert.equal(panelRightInset, panelBottomInset);
});

test('renderPlatformCardSvg reserves a fixed QR rail and content gutter when qr is enabled', () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: true, date: true, qr: true },
  });
  const contentColumnMatch = svg.match(/data-part="imessage-content-column"[^>]*data-layout-right="([0-9.]+)"/);
  const qrRailMatch = svg.match(
    /data-part="imessage-qr-rail"[^>]*data-layout-left="([0-9.]+)"[^>]*data-layout-width="([0-9.]+)"/,
  );
  const qrMask = getRectBox(svg, 'imessage-qr-mask');
  const contentRight = Number(contentColumnMatch[1]);
  const qrRailLeft = Number(qrRailMatch[1]);
  const qrRailWidth = Number(qrRailMatch[2]);
  const panelRightInset = 20 + 560 - (qrMask.x + qrMask.width);
  assert.equal(qrRailLeft - contentRight, 22);
  assert.equal(qrRailWidth, qrMask.width + panelRightInset);
  assert.equal(contentRight + 22 <= qrMask.x, true);
});

test('renderPlatformCardSvg omits QR overlay when qr is disabled or unavailable', () => {
  const disabledSvg = renderPlatformCardSvg(createPreludeQrEntry(), 'imessagePlus', {
    displayOptions: { description: true, url: true, date: false, qr: false },
  });
  const unavailableSvg = renderPlatformCardSvg({ ...createPreludeEntry(), qrUrl: null }, 'imessagePlus', {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  assert.doesNotMatch(disabledSvg, /data-part="imessage-qr-overlay"/);
  assert.doesNotMatch(unavailableSvg, /data-part="imessage-qr-overlay"/);
});
