import {
  SOFT_BLACK,
  SOFT_WHITE,
  clamp,
  contrastRatio,
  hexToOklch,
  hueDistance,
  normalizeHue,
  oklchToHex,
  rgbToHex,
} from './smart-color-space.mjs';

const RELEASE_THRESHOLDS = Object.freeze({
  titleFg: 5.5,
  bodyFg: 5.5,
  contextFg: 5.5,
  qrFg: 7.0,
});

export const DEFAULT_SMART_COLOR_TOKENS = Object.freeze({
  panelBg: '#d7d7dc',
  titleFg: '#1d2129',
  bodyFg: '#3a404c',
  contextFg: '#545c68',
  qrMaskBg: '#c8cbd3',
  qrFg: '#434a58',
  familyHue: 255,
  toneMode: 'light-panel',
});

function getPanelChromaCeiling(lightness) {
  const distance = Math.abs(lightness - 0.62);
  return clamp(0.125 - distance * 0.18, 0.028, 0.125);
}

function normalizePanelLightness(lightness) {
  if (lightness >= 0.56) {
    return clamp(0.72 + (lightness - 0.56) * 0.28, 0.72, 0.84);
  }
  if (lightness <= 0.44) {
    return clamp(0.3 + (lightness - 0.44) * 0.25, 0.22, 0.44);
  }
  return 0.72;
}

function getToneModeFromPanel(panelBg) {
  return hexToOklch(panelBg).l >= 0.58 ? 'light-panel' : 'dark-panel';
}

function fallbackTextColor(backgroundColor, minContrast) {
  const candidates = [SOFT_WHITE, SOFT_BLACK, '#ffffff', '#000000'];
  return candidates.find((color) => contrastRatio(color, backgroundColor) >= minContrast) || SOFT_BLACK;
}

function scorePaletteCandidate(candidate, panelBg, panelHue, preferHueMatch) {
  const color = hexToOklch(candidate);
  const contrast = contrastRatio(candidate, panelBg);
  const huePenalty = preferHueMatch ? hueDistance(color.h, panelHue) / 180 : 0;
  return contrast * 1.6 + color.c * 6 - huePenalty * 0.7 + (color.l > 0.1 && color.l < 0.92 ? 0.4 : -0.4);
}

function pickPaletteCandidate(palette, panelBg, panelOklch) {
  const preferHueMatch = panelOklch.c >= 0.02;
  const uniqueColors = [...new Set((palette || []).map((color) => rgbToHex(color)))];
  return (
    uniqueColors
      .map((color) => ({
        color,
        score: scorePaletteCandidate(color, panelBg, panelOklch.h, preferHueMatch),
      }))
      .sort((a, b) => b.score - a.score)[0]?.color || null
  );
}

function solveRoleColor(seed, backgroundColor, minContrast) {
  const background = hexToOklch(backgroundColor);
  const direction = background.l >= 0.58 ? -1 : 1;
  let best = null;

  for (const chromaScale of [1, 0.92, 0.84, 0.72, 0.6, 0.48, 0.32, 0.18, 0]) {
    const nextChroma = seed.c * chromaScale;
    for (let step = 0; step <= 80; step += 1) {
      const progress = step / 80;
      const nextLightness =
        direction > 0 ? seed.l + (1 - seed.l) * progress : seed.l - seed.l * progress;
      const candidate = {
        l: clamp(nextLightness, 0, 1),
        c: nextChroma,
        h: seed.h,
      };
      const candidateHex = oklchToHex(candidate);
      const ratio = contrastRatio(candidateHex, backgroundColor);
      if (ratio < minContrast) {
        continue;
      }
      const score = Math.abs(candidate.l - seed.l) * 3 + Math.abs(candidate.c - seed.c) * 4 + progress * 0.2;
      if (!best || score < best.score) {
        best = { hex: candidateHex, score, ratio };
      }
    }
    if (best) {
      return best.hex;
    }
  }

  return fallbackTextColor(backgroundColor, minContrast);
}

function buildRoleSeeds(familyHue, baseChroma, toneMode) {
  if (toneMode === 'dark-panel') {
    return {
      titleFg: { l: 0.94, c: Math.min(baseChroma, 0.14), h: familyHue },
      bodyFg: { l: 0.88, c: Math.min(baseChroma * 0.78, 0.12), h: familyHue },
      contextFg: { l: 0.81, c: Math.min(baseChroma * 0.58, 0.1), h: familyHue },
      qrFg: { l: 0.93, c: Math.min(baseChroma * 0.72, 0.12), h: familyHue },
    };
  }

  return {
    titleFg: { l: 0.24, c: Math.min(baseChroma, 0.12), h: familyHue },
    bodyFg: { l: 0.31, c: Math.min(baseChroma * 0.8, 0.11), h: familyHue },
    contextFg: { l: 0.38, c: Math.min(baseChroma * 0.62, 0.1), h: familyHue },
    qrFg: { l: 0.23, c: Math.min(baseChroma * 0.72, 0.11), h: familyHue },
  };
}

export function softenBackgroundColor(color) {
  const source = hexToOklch(typeof color === 'string' ? color : rgbToHex(color));
  const lightness = normalizePanelLightness(source.l);
  return oklchToHex({
    l: lightness,
    c: Math.min(source.c, getPanelChromaCeiling(lightness)),
    h: source.h,
  });
}

export function adjustColorLightnessForContrast(color, backgroundColor, minContrast) {
  const seed = hexToOklch(color);
  return solveRoleColor(seed, backgroundColor, minContrast);
}

export function normalizeSmartColorTokens(colors = null) {
  const merged = {
    ...DEFAULT_SMART_COLOR_TOKENS,
    ...(colors || {}),
  };
  const panelBg = merged.panelBg || merged.backgroundColor || DEFAULT_SMART_COLOR_TOKENS.panelBg;
  const toneMode = merged.toneMode || getToneModeFromPanel(panelBg);
  const familyHue = Number.isFinite(merged.familyHue) ? normalizeHue(merged.familyHue) : hexToOklch(panelBg).h;

  return {
    panelBg,
    titleFg: merged.titleFg || merged.titleColor || DEFAULT_SMART_COLOR_TOKENS.titleFg,
    bodyFg: merged.bodyFg || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.bodyFg,
    contextFg: merged.contextFg || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.contextFg,
    qrMaskBg: panelBg,
    qrFg: merged.qrFg || merged.qrCodeColor || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.qrFg,
    familyHue,
    toneMode,
    backgroundColor: panelBg,
    titleColor: merged.titleFg || merged.titleColor || DEFAULT_SMART_COLOR_TOKENS.titleFg,
    urlColor: merged.contextFg || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.contextFg,
    qrCodeColor: merged.qrFg || merged.qrCodeColor || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.qrFg,
  };
}

export function resolveSmartPreviewColorsFromPalette({ dominant, palette = [] }) {
  const panelBg = softenBackgroundColor(dominant || [215, 215, 220]);
  const panel = hexToOklch(panelBg);
  const paletteCandidate = pickPaletteCandidate(palette, panelBg, panel);
  const paletteSeed = paletteCandidate ? hexToOklch(paletteCandidate) : panel;
  const familyHue = panel.c >= 0.02 ? panel.h : paletteSeed.h;
  const toneMode = getToneModeFromPanel(panelBg);
  const baseChroma = clamp(Math.max(paletteSeed.c, panel.c * 1.4, 0.035), 0.035, 0.15);
  const seeds = buildRoleSeeds(familyHue, baseChroma, toneMode);
  const qrMaskBg = panelBg;

  return normalizeSmartColorTokens({
    panelBg,
    titleFg: solveRoleColor(seeds.titleFg, panelBg, RELEASE_THRESHOLDS.titleFg),
    bodyFg: solveRoleColor(seeds.bodyFg, panelBg, RELEASE_THRESHOLDS.bodyFg),
    contextFg: solveRoleColor(seeds.contextFg, panelBg, RELEASE_THRESHOLDS.contextFg),
    qrMaskBg,
    qrFg: solveRoleColor(seeds.qrFg, panelBg, RELEASE_THRESHOLDS.qrFg),
    familyHue,
    toneMode,
  });
}
