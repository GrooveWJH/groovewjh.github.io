import { buildIMessageCardModel } from '../renderers/imessage-model.mjs';
import { measureTextMetrics, measureTextWidth } from '../svg-utils.mjs';

function getViewBoxDimensions(model, squareCanvas) {
  if (!squareCanvas) {
    return {
      width: 600,
      height: model.cardHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const side = Math.max(600, model.cardHeight);
  return {
    width: side,
    height: side,
    offsetX: (side - 600) / 2,
    offsetY: (side - model.cardHeight) / 2,
  };
}

function inflateBox(box, xPadding, yPadding) {
  if (!box) {
    return null;
  }

  return {
    x: box.x - xPadding,
    y: box.y - yPadding,
    width: box.width + xPadding * 2,
    height: box.height + yPadding * 2,
  };
}

function offsetBox(box, offsetX, offsetY) {
  if (!box) {
    return null;
  }

  return {
    x: box.x + offsetX,
    y: box.y + offsetY,
    width: box.width,
    height: box.height,
  };
}

function unionBoxes(boxes) {
  const visibleBoxes = boxes.filter(Boolean);
  if (!visibleBoxes.length) {
    return null;
  }

  const left = Math.min(...visibleBoxes.map((box) => box.x));
  const top = Math.min(...visibleBoxes.map((box) => box.y));
  const right = Math.max(...visibleBoxes.map((box) => box.x + box.width));
  const bottom = Math.max(...visibleBoxes.map((box) => box.y + box.height));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function getTextBlockBox(block, { paddingX = 10, paddingY = 8 } = {}) {
  if (!block?.lines?.length) {
    return null;
  }

  const widths = block.lines.map((line) =>
    measureTextWidth(line, { fontSize: block.fontSize, fontWeight: block.fontWeight }),
  );
  const firstMetrics = measureTextMetrics(block.lines[0], { fontSize: block.fontSize, fontWeight: block.fontWeight });
  const lastMetrics = measureTextMetrics(block.lines[block.lines.length - 1], {
    fontSize: block.fontSize,
    fontWeight: block.fontWeight,
  });
  const rawBox = {
    x: block.x,
    y: block.y - firstMetrics.ascent,
    width: Math.max(...widths),
    height: firstMetrics.ascent + Math.max(0, block.lines.length - 1) * block.lineHeight + lastMetrics.descent,
  };

  return inflateBox(rawBox, paddingX, paddingY);
}

export function buildStageGeometry(entry, displayOptions, smartColors, squareCanvas) {
  const model = buildIMessageCardModel(entry, {
    includeDescription: Boolean(entry?.descriptionText || entry?.description),
    smartColors,
    displayOptions,
  });
  const viewBox = getViewBoxDimensions(model, squareCanvas);
  const titleBox = offsetBox(
    getTextBlockBox(model.title, { paddingX: 12, paddingY: 10 }),
    viewBox.offsetX,
    viewBox.offsetY,
  );
  const descriptionBox = offsetBox(
    getTextBlockBox(model.description, { paddingX: 10, paddingY: 8 }),
    viewBox.offsetX,
    viewBox.offsetY,
  );
  const siteNameBox = offsetBox(getTextBlockBox(model.siteName), viewBox.offsetX, viewBox.offsetY);
  const dateBox = offsetBox(getTextBlockBox(model.date), viewBox.offsetX, viewBox.offsetY);
  const domainBox = offsetBox(getTextBlockBox(model.domain), viewBox.offsetX, viewBox.offsetY);
  const qrBox = model.qrGeometry
    ? offsetBox(
        inflateBox(
          {
            x: model.qrGeometry.x,
            y: model.qrGeometry.y,
            width: model.qrGeometry.size,
            height: model.qrGeometry.size,
          },
          8,
          8,
        ),
        viewBox.offsetX,
        viewBox.offsetY,
      )
    : null;
  const fallbackContextBox = offsetBox(
    inflateBox(
      {
        x: model.layout.contentColumnX,
        y: model.infoY + Math.max(model.infoHeight - 120, 0),
        width: model.layout.contentColumnWidth,
        height: 92,
      },
      10,
      10,
    ),
    viewBox.offsetX,
    viewBox.offsetY,
  );

  return {
    viewBoxWidth: viewBox.width,
    viewBoxHeight: viewBox.height,
    targetBoxes: {
      titleBlock: titleBox,
      descriptionBlock: descriptionBox,
      siteNameText: siteNameBox,
      dateText: dateBox,
      domainText: domainBox,
      qrSymbol: qrBox,
    },
    groupBoxes: {
      title: titleBox,
      description: descriptionBox,
      context: unionBoxes([siteNameBox, dateBox, domainBox]) || fallbackContextBox,
      qr: qrBox,
    },
  };
}
