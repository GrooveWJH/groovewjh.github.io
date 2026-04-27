import { contrastRatio, relativeLuminance } from './smart-color-space.mjs';
import {
  DEFAULT_SMART_COLOR_TOKENS,
  adjustColorLightnessForContrast,
  normalizeSmartColorTokens,
  resolveSmartPreviewColorsFromPalette,
  softenBackgroundColor,
} from './smart-color-tokens.mjs';

export {
  DEFAULT_SMART_COLOR_TOKENS,
  adjustColorLightnessForContrast,
  contrastRatio,
  normalizeSmartColorTokens,
  relativeLuminance,
  resolveSmartPreviewColorsFromPalette,
  softenBackgroundColor,
};

export function resolveColorThiefRuntimeApi(runtimeValue) {
  if (runtimeValue && typeof runtimeValue.getColor === 'function' && typeof runtimeValue.getPalette === 'function') {
    return runtimeValue;
  }
  if (typeof runtimeValue === 'function') {
    const instance = new runtimeValue();
    if (typeof instance.getColor === 'function' && typeof instance.getPalette === 'function') return instance;
  }
  throw new Error('ColorThief runtime API is unavailable or unsupported');
}

export async function extractPaletteFromColorThiefApi(runtimeApi, image) {
  return {
    dominant: await runtimeApi.getColor(image),
    palette: (await runtimeApi.getPalette(image, 8)) || [],
  };
}
