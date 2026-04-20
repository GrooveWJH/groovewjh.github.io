import test from "node:test";
import assert from "node:assert/strict";
import { renderPlatformCardSvg } from "./share-preview/runtime/renderers/index.mjs";
import { createPreludeEntry, createPreludeQrEntry, getQrSymbolBottom, getRectBox, getTextY } from "./share-preview-test-helpers.mjs";

test("renderPlatformCardSvg applies smart colors to iMessage+ output", () => {
  const svg = renderPlatformCardSvg(createPreludeEntry({ includeDescription: false }), "imessagePlus", {
    smartColors: { backgroundColor: "#213547", titleColor: "#f7f8fa", urlColor: "#d6dde8" },
  });
  assert.match(svg, /fill="#213547"/);
  assert.match(svg, /fill="#f7f8fa"/);
  assert.match(svg, /fill="#d6dde8"/);
});

test("renderPlatformCardSvg names iMessage+ metadata panel parts and maps smart colors onto them", () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), "imessagePlus", {
    smartColors: { backgroundColor: "#223344", titleColor: "#f6f7fb", urlColor: "#d0dae8" },
  });
  assert.match(svg, /data-part="imessage-card"/);
  assert.match(svg, /data-part="imessage-metadata-panel"[^>]*fill="#223344"/);
  assert.match(svg, /data-part="imessage-title-block"[^>]*fill="#f6f7fb"/);
  assert.match(svg, /data-part="imessage-description-text"[^>]*fill="#d0dae8"/);
  assert.match(svg, /data-part="imessage-site-name-text"[^>]*fill="#d0dae8"/);
  assert.match(svg, /data-part="imessage-domain-text"[^>]*fill="#d0dae8"/);
});

test("renderPlatformCardSvg respects display toggles for description, url, and date", () => {
  const entry = createPreludeEntry();
  const hiddenSvg = renderPlatformCardSvg(entry, "imessagePlus", { displayOptions: { description: false, url: false, date: false } });
  const datedSvg = renderPlatformCardSvg(entry, "imessagePlus", { displayOptions: { description: false, url: false, date: true } });
  assert.doesNotMatch(hiddenSvg, /那时候，你就会明白/);
  assert.doesNotMatch(hiddenSvg, /data-part="imessage-description-text"/);
  assert.doesNotMatch(hiddenSvg, /data-part="imessage-domain-text"/);
  assert.doesNotMatch(hiddenSvg, /data-part="imessage-date-text"/);
  assert.match(datedSvg, /data-part="imessage-date-text"[^>]*aria-label="iMessage Published Date"/);
  assert.ok(Math.abs(getTextY(datedSvg, "imessage-date-text") - getTextY(datedSvg, "imessage-site-name-text", 42)) < 1);
});

test("renderPlatformCardSvg anchors the bottom site row to the QR symbol bottom when url is hidden", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    displayOptions: { description: true, url: false, date: false, qr: true },
  });
  assert.ok(getTextY(svg, "imessage-site-name-text", 42) < getQrSymbolBottom(svg));
});

test("renderPlatformCardSvg renders QR overlay when qr is enabled and url text is hidden", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    smartColors: { backgroundColor: "#4b4120", titleColor: "#f3ebce", urlColor: "#d7c89a" },
    displayOptions: { description: false, url: false, date: false, qr: true },
  });
  assert.match(svg, /data-part="imessage-qr-overlay"/);
  assert.match(svg, /data-part="imessage-qr-mask"[^>]*fill="transparent"/);
  assert.match(svg, /data-part="imessage-qr-symbol"[^>]*fill="#d7c89a"/);
  assert.doesNotMatch(svg, /data-part="imessage-domain-text"/);
});

test("renderPlatformCardSvg wraps metadata text around the QR column", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry({
    description: "这是一段特别长的描述，用来验证当右下角存在二维码时，描述文字会在左侧区域自动换行，不会继续铺到二维码所在的右侧空间。",
  }), "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  assert.match(svg, /data-part="imessage-description-text"[\s\S]*<tspan x="42" dy="22">/);
  assert.match(svg, /data-part="imessage-content-column"[^>]*clip-path="url\(#imessage-content-column-clip\)"/);
});

test("renderPlatformCardSvg places description before site name in the metadata flow", () => {
  const svg = renderPlatformCardSvg(createPreludeEntry(), "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: false },
  });
  assert.ok(getTextY(svg, "imessage-description-text", 42) < getTextY(svg, "imessage-site-name-text", 42));
});

test("renderPlatformCardSvg accepts a manual description break start index", () => {
  const svg = renderPlatformCardSvg(createPreludeEntry({
    includeDescription: true,
  }), "imessagePlus", {
    displayOptions: { description: true, url: false, date: false, qr: false },
    descriptionBreakStartIndex: 6,
  });
  assert.match(svg, /data-part="imessage-description-text"/);
});

test("renderPlatformCardSvg anchors site metadata above a separate bottom url line", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  assert.ok(getTextY(svg, "imessage-site-name-text", 42) < getTextY(svg, "imessage-domain-text", 42));
  assert.ok(getTextY(svg, "imessage-domain-text", 42) < getQrSymbolBottom(svg));
});

test("renderPlatformCardSvg places QR overlay inside the metadata panel", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  const panel = getRectBox(svg, "imessage-metadata-panel");
  const qrMask = getRectBox(svg, "imessage-qr-mask");
  assert.ok(qrMask.y > panel.y);
  assert.ok(qrMask.y + qrMask.height <= panel.y + panel.height);
});

test("renderPlatformCardSvg keeps QR right and bottom safety insets aligned", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  const panel = getRectBox(svg, "imessage-metadata-panel");
  const qrMask = getRectBox(svg, "imessage-qr-mask");
  const panelRightInset = 20 + 560 - (qrMask.x + qrMask.width);
  const panelBottomInset = panel.y + panel.height - (qrMask.y + qrMask.height);
  assert.equal(qrMask.width, qrMask.height);
  assert.equal(panelRightInset, panelBottomInset);
});

test("renderPlatformCardSvg reserves a fixed QR rail and content gutter when qr is enabled", () => {
  const svg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    displayOptions: { description: true, url: true, date: true, qr: true },
  });
  const contentColumnMatch = svg.match(/data-part="imessage-content-column"[^>]*data-layout-right="([0-9.]+)"/);
  const qrRailMatch = svg.match(/data-part="imessage-qr-rail"[^>]*data-layout-left="([0-9.]+)"[^>]*data-layout-width="([0-9.]+)"/);
  const qrMask = getRectBox(svg, "imessage-qr-mask");
  const contentRight = Number(contentColumnMatch[1]);
  const qrRailLeft = Number(qrRailMatch[1]);
  const qrRailWidth = Number(qrRailMatch[2]);
  const panelRightInset = 20 + 560 - (qrMask.x + qrMask.width);
  assert.equal(qrRailLeft - contentRight, 22);
  assert.equal(qrRailWidth, qrMask.width + panelRightInset);
  assert.equal(contentRight + 22 <= qrMask.x, true);
});

test("renderPlatformCardSvg omits QR overlay when qr is disabled or unavailable", () => {
  const disabledSvg = renderPlatformCardSvg(createPreludeQrEntry(), "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: false },
  });
  const unavailableSvg = renderPlatformCardSvg({ ...createPreludeEntry(), qrUrl: null }, "imessagePlus", {
    displayOptions: { description: true, url: true, date: false, qr: true },
  });
  assert.doesNotMatch(disabledSvg, /data-part="imessage-qr-overlay"/);
  assert.doesNotMatch(unavailableSvg, /data-part="imessage-qr-overlay"/);
});
