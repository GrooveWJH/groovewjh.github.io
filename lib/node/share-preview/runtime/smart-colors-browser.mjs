import {
  extractPaletteFromColorThiefApi,
  resolveColorThiefRuntimeApi,
  resolveSmartPreviewColorsFromPalette,
} from "./smart-colors-core.mjs";

const DEFAULT_SMART_COLORS = {
  backgroundColor: "#d7d7dc",
  titleColor: "#111111",
  urlColor: "#74747a",
};

const colorCache = new Map();

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCacheKey(imageUrl) {
  if (typeof window === "undefined") return collapseWhitespace(imageUrl);
  return new URL(imageUrl, window.location.href).href;
}

async function loadImage(src) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolvePromise(image);
    image.onerror = () => rejectPromise(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

async function downsampleImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable for smart color extraction");
  context.drawImage(image, 0, 0, 64, 64);
  return await loadImage(canvas.toDataURL("image/png"));
}

async function extractPaletteFromImage(imageUrl) {
  if (typeof window === "undefined" || !window.ColorThief) {
    throw new Error("ColorThief is unavailable in preview runtime");
  }

  const sourceImage = await loadImage(imageUrl);
  const sampledImage = await downsampleImage(sourceImage);
  const thief = resolveColorThiefRuntimeApi(window.ColorThief);
  return await extractPaletteFromColorThiefApi(thief, sampledImage);
}

export function getCachedSmartPreviewColors(imageUrl) {
  const cached = colorCache.get(getCacheKey(imageUrl));
  return cached && !(cached instanceof Promise) ? cached : null;
}

export async function resolveSmartPreviewColors(imageUrl) {
  const key = getCacheKey(imageUrl);
  const cached = colorCache.get(key);
  if (cached) return await cached;

  const pending = extractPaletteFromImage(imageUrl)
    .then(resolveSmartPreviewColorsFromPalette)
    .catch(() => DEFAULT_SMART_COLORS)
    .then((resolved) => {
      colorCache.set(key, resolved);
      return resolved;
    });

  colorCache.set(key, pending);
  return await pending;
}

export function prefetchSmartPreviewColors(imageUrl) {
  return resolveSmartPreviewColors(imageUrl);
}
