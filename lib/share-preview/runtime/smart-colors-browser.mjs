import {
  DEFAULT_SMART_COLOR_TOKENS,
  extractPaletteFromColorThiefApi,
  resolveColorThiefRuntimeApi,
  resolveSmartPreviewColorsFromPalette,
} from './smart-colors-core.mjs';
import { analyzeImageSpatialData } from './smart-color-analysis.mjs';
import { normalizePanelIntent } from './smart-color-intent.mjs';

const DEFAULT_SMART_COLORS = DEFAULT_SMART_COLOR_TOKENS;

const colorCache = new Map();

function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCacheKey(imageUrl, panelIntent = 'auto') {
  const suffix = normalizePanelIntent(panelIntent);
  if (typeof window === 'undefined') return `${collapseWhitespace(imageUrl)}::${suffix}`;
  return `${new URL(imageUrl, window.location.href).href}::${suffix}`;
}

async function loadImage(src) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolvePromise(image);
    image.onerror = () => rejectPromise(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function downsampleImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable for smart color extraction');
  context.drawImage(image, 0, 0, 64, 64);
  return {
    sampledImageUrl: canvas.toDataURL('image/png'),
    spatial: analyzeImageSpatialData(context.getImageData(0, 0, 64, 64)),
  };
}

async function extractPaletteFromImage(imageUrl) {
  if (typeof window === 'undefined' || !window.ColorThief) {
    throw new Error('ColorThief is unavailable in preview runtime');
  }

  const sourceImage = await loadImage(imageUrl);
  const { sampledImageUrl, spatial } = downsampleImage(sourceImage);
  const sampledImage = await loadImage(sampledImageUrl);
  const thief = resolveColorThiefRuntimeApi(window.ColorThief);
  return {
    ...(await extractPaletteFromColorThiefApi(thief, sampledImage)),
    spatial,
  };
}

export function getCachedSmartPreviewColors(imageUrl, options = {}) {
  const cached = colorCache.get(getCacheKey(imageUrl, options.panelIntent));
  return cached && !(cached instanceof Promise) ? cached : null;
}

export async function resolveSmartPreviewColors(imageUrl, options = {}) {
  const key = getCacheKey(imageUrl, options.panelIntent);
  const cached = colorCache.get(key);
  if (cached) return await cached;

  const pending = extractPaletteFromImage(imageUrl)
    .then((paletteResult) =>
      resolveSmartPreviewColorsFromPalette({
        ...paletteResult,
        panelIntent: options.panelIntent,
      }),
    )
    .catch(() => DEFAULT_SMART_COLORS)
    .then((resolved) => {
      colorCache.set(key, resolved);
      return resolved;
    });

  colorCache.set(key, pending);
  return await pending;
}

export function prefetchSmartPreviewColors(imageUrl, options = {}) {
  return resolveSmartPreviewColors(imageUrl, options);
}
