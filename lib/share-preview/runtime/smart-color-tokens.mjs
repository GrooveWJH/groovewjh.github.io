import { createFallbackSpatialProfile, selectPanelCandidate } from './smart-color-analysis.mjs';
import { DEFAULT_PANEL_INTENT, normalizePanelIntent } from './smart-color-intent.mjs';
import { SOFT_BLACK, SOFT_WHITE, clamp, contrastRatio, hexToOklch, normalizeHue, oklchToHex, rgbToHex } from './smart-color-space.mjs';

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
  qrMaskBg: '#d2d5dd',
  qrFg: '#434a58',
  familyHue: 255,
  toneMode: 'light-panel',
  panelIntent: DEFAULT_PANEL_INTENT,
  selectionReason: '未采样封面图，已回退到默认卡片配色。',
});

function getPanelChromaCeiling(lightness) {
  const distance = Math.abs(lightness - 0.58);
  return clamp(0.132 - distance * 0.2, 0.024, 0.132);
}

function normalizePanelCandidateLightness(lightness, preferredToneMode) {
  if (preferredToneMode === 'dark-panel') {
    if (lightness > 0.38) {
      return clamp(0.26 + (lightness - 0.38) * 0.12, 0.18, 0.34);
    }
    return clamp(lightness * 0.78, 0.16, 0.34);
  }
  if (preferredToneMode === 'light-panel') {
    if (lightness >= 0.56) {
      return clamp(0.72 + (lightness - 0.56) * 0.28, 0.72, 0.85);
    }
    if (lightness <= 0.44) {
      return clamp(0.64 + (lightness - 0.44) * 0.18, 0.58, 0.72);
    }
    return 0.74;
  }
  return lightness >= 0.58 ? normalizePanelCandidateLightness(lightness, 'light-panel') : normalizePanelCandidateLightness(lightness, 'dark-panel');
}

function fallbackTextColor(backgroundColor, minContrast) {
  const candidates = [SOFT_WHITE, SOFT_BLACK, '#ffffff', '#000000'];
  return candidates.find((color) => contrastRatio(color, backgroundColor) >= minContrast) || SOFT_BLACK;
}

function solveRoleColor(seed, backgroundColor, minContrast) {
  const background = hexToOklch(backgroundColor);
  const direction = background.l >= 0.58 ? -1 : 1;
  let best = null;

  for (const chromaScale of [1, 0.92, 0.84, 0.72, 0.6, 0.48, 0.32, 0.18, 0]) {
    const nextChroma = seed.c * chromaScale;
    for (let step = 0; step <= 80; step += 1) {
      const progress = step / 80;
      const nextLightness = direction > 0 ? seed.l + (1 - seed.l) * progress : seed.l - seed.l * progress;
      const candidate = { l: clamp(nextLightness, 0, 1), c: nextChroma, h: seed.h };
      const candidateHex = oklchToHex(candidate);
      const ratio = contrastRatio(candidateHex, backgroundColor);
      if (ratio < minContrast) {
        continue;
      }
      const score = Math.abs(candidate.l - seed.l) * 3 + Math.abs(candidate.c - seed.c) * 4 + progress * 0.2;
      if (!best || score < best.score) {
        best = { hex: candidateHex, score };
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
      bodyFg: { l: 0.87, c: Math.min(baseChroma * 0.74, 0.115), h: familyHue },
      contextFg: { l: 0.8, c: Math.min(baseChroma * 0.56, 0.095), h: familyHue },
      qrFg: { l: 0.92, c: Math.min(baseChroma * 0.68, 0.11), h: familyHue },
    };
  }

  return {
    titleFg: { l: 0.24, c: Math.min(baseChroma, 0.12), h: familyHue },
    bodyFg: { l: 0.31, c: Math.min(baseChroma * 0.8, 0.11), h: familyHue },
    contextFg: { l: 0.39, c: Math.min(baseChroma * 0.6, 0.1), h: familyHue },
    qrFg: { l: 0.24, c: Math.min(baseChroma * 0.68, 0.1), h: familyHue },
  };
}

function buildQrMask(panelBg, toneMode) {
  const panel = hexToOklch(panelBg);
  return oklchToHex({
    l: toneMode === 'dark-panel' ? clamp(panel.l + 0.026, 0, 1) : clamp(panel.l - 0.028, 0, 1),
    c: clamp(panel.c * 0.82, 0, 0.09),
    h: panel.h,
  });
}

export function normalizePanelCandidate(color, { preferredToneMode = 'auto' } = {}) {
  const source = hexToOklch(typeof color === 'string' ? color : rgbToHex(color));
  const lightness = normalizePanelCandidateLightness(source.l, preferredToneMode);
  return oklchToHex({
    l: lightness,
    c: Math.min(source.c, getPanelChromaCeiling(lightness)),
    h: source.h,
  });
}

export function softenBackgroundColor(color) {
  return normalizePanelCandidate(color, { preferredToneMode: 'light-panel' });
}

export function adjustColorLightnessForContrast(color, backgroundColor, minContrast) {
  const seed = hexToOklch(color);
  return solveRoleColor(seed, backgroundColor, minContrast);
}

export function normalizeSmartColorTokens(colors = null) {
  const merged = { ...DEFAULT_SMART_COLOR_TOKENS, ...(colors || {}) };
  const panelBg = merged.panelBg || DEFAULT_SMART_COLOR_TOKENS.panelBg;
  const toneMode = merged.toneMode || (hexToOklch(panelBg).l >= 0.58 ? 'light-panel' : 'dark-panel');
  const familyHue = Number.isFinite(merged.familyHue) ? normalizeHue(merged.familyHue) : hexToOklch(panelBg).h;

  return {
    panelBg,
    titleFg: merged.titleFg || merged.titleColor || DEFAULT_SMART_COLOR_TOKENS.titleFg,
    bodyFg: merged.bodyFg || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.bodyFg,
    contextFg: merged.contextFg || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.contextFg,
    qrMaskBg: merged.qrMaskBg || panelBg,
    qrFg: merged.qrFg || merged.qrCodeColor || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.qrFg,
    familyHue,
    toneMode,
    panelIntent: normalizePanelIntent(merged.panelIntent),
    selectionReason: merged.selectionReason || DEFAULT_SMART_COLOR_TOKENS.selectionReason,
    backgroundColor: panelBg,
    titleColor: merged.titleFg || merged.titleColor || DEFAULT_SMART_COLOR_TOKENS.titleFg,
    urlColor: merged.contextFg || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.contextFg,
    qrCodeColor: merged.qrFg || merged.qrCodeColor || merged.urlColor || DEFAULT_SMART_COLOR_TOKENS.qrFg,
  };
}

export function resolveSmartPreviewColorsFromPalette({ dominant, palette = [], spatial = null, panelIntent = DEFAULT_PANEL_INTENT }) {
  const spatialProfile = spatial || createFallbackSpatialProfile(dominant || [215, 215, 220]);
  const selection = selectPanelCandidate({
    dominant,
    palette,
    spatial: spatialProfile,
    panelIntent,
    normalizePanelCandidate,
  });
  const familyHue = selection.familyHue;
  const baseChroma = clamp(Math.max(hexToOklch(selection.panelBg).c * 1.35, 0.038), 0.038, 0.14);
  const seeds = buildRoleSeeds(familyHue, baseChroma, selection.toneMode);
  const qrMaskBg = buildQrMask(selection.panelBg, selection.toneMode);

  return normalizeSmartColorTokens({
    panelBg: selection.panelBg,
    titleFg: solveRoleColor(seeds.titleFg, selection.panelBg, RELEASE_THRESHOLDS.titleFg),
    bodyFg: solveRoleColor(seeds.bodyFg, selection.panelBg, RELEASE_THRESHOLDS.bodyFg),
    contextFg: solveRoleColor(seeds.contextFg, selection.panelBg, RELEASE_THRESHOLDS.contextFg),
    qrMaskBg,
    qrFg: solveRoleColor(seeds.qrFg, qrMaskBg, RELEASE_THRESHOLDS.qrFg),
    familyHue,
    toneMode: selection.toneMode,
    panelIntent: selection.panelIntent,
    selectionReason: selection.selectionReason,
  });
}
