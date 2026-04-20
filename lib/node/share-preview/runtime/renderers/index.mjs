import { getImageHref } from "../svg-utils.mjs";
import { renderIMessageCard, resolveIMessageDescriptionBreakState } from "./imessage.mjs";

function parseSvgSize(svgMarkup) {
  const viewBoxMatch = String(svgMarkup).match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/i);
  return {
    width: Number(viewBoxMatch?.[1] || 600),
    height: Number(viewBoxMatch?.[2] || 400),
  };
}

export function wrapSvgInSquareCanvas(svgMarkup, { backgroundFill = "#edf1f7" } = {}) {
  const { width, height } = parseSvgSize(svgMarkup);
  const side = Math.max(width, height);
  const offsetX = (side - width) / 2;
  const offsetY = (side - height) / 2;
  const innerSvg = String(svgMarkup || "")
    .replace(/^<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${side}" height="${side}"><rect width="${side}" height="${side}" fill="${backgroundFill}"></rect><g transform="translate(${offsetX} ${offsetY})">${innerSvg}</g></svg>`;
}

export function buildExportFileName(entry, platformKey) {
  const safePlatform = String(platformKey || "imessagePlus")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();

  return `${entry.id}__${safePlatform}.png`;
}

export function usesSmartPreviewColors(platformKey) {
  return platformKey === "imessagePlus";
}

export function renderPlatformCardSvg(entry, platformKey, options = {}) {
  const imageHref = getImageHref(entry, options.imageHref);
  const svgMarkup = renderIMessageCard(entry, imageHref, {
    includeDescription: Boolean(entry.description),
    smartColors: options.smartColors,
    displayOptions: {
      ...(options.displayOptions || {}),
      descriptionBreakStartIndex: options.descriptionBreakStartIndex,
    },
  });
  return options.squareCanvas ? wrapSvgInSquareCanvas(svgMarkup) : svgMarkup;
}

export function getPlatformDescriptionBreakState(entry, platformKey, options = {}) {
  return resolveIMessageDescriptionBreakState(entry, {
    includeDescription: Boolean(entry?.description),
    displayOptions: {
      ...(options.displayOptions || {}),
      descriptionBreakStartIndex: options.descriptionBreakStartIndex,
    },
  });
}
