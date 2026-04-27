import { clamp, hexToOklch, hueDistance, relativeLuminance, rgbToHex, rgbToOklch } from './smart-color-space.mjs';
import { formatSelectionReason, getPanelIntentBias, normalizePanelIntent } from './smart-color-intent.mjs';

const REGION_LABELS = Object.freeze({ top: '上半区', center: '中心区域', bottom: '下半区', left: '左侧区域', right: '右侧区域', bottomEdge: '封面下缘', full: '整张封面' });

function averageRegion(imageData, fromX, toX, fromY, toY) {
  const { width, data } = imageData;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let sumL = 0;
  let sumC = 0;
  let darkCount = 0;
  let brightCount = 0;
  let pixelCount = 0;

  for (let y = fromY; y < toY; y += 1) {
    for (let x = fromX; x < toX; x += 1) {
      const offset = (y * width + x) * 4;
      const rgb = [data[offset], data[offset + 1], data[offset + 2]];
      const oklch = rgbToOklch(rgb);
      sumR += rgb[0];
      sumG += rgb[1];
      sumB += rgb[2];
      sumL += oklch.l;
      sumC += oklch.c;
      darkCount += oklch.l < 0.33 ? 1 : 0;
      brightCount += oklch.l > 0.76 ? 1 : 0;
      pixelCount += 1;
    }
  }

  const rgb = [sumR / pixelCount, sumG / pixelCount, sumB / pixelCount];
  const hex = rgbToHex(rgb);
  return {
    rgb,
    hex,
    oklch: hexToOklch(hex),
    meanLightness: sumL / pixelCount,
    meanChroma: sumC / pixelCount,
    darkRatio: darkCount / pixelCount,
    brightRatio: brightCount / pixelCount,
  };
}

function scoreRegionDarkness(region, bonus = 0) {
  return (1 - region.meanLightness) * 1.6 + region.darkRatio * 1.3 + region.meanChroma * 0.2 + bonus;
}

function scoreRegionLightness(region, bonus = 0) {
  return region.meanLightness * 1.4 + region.brightRatio * 1.25 - region.meanChroma * 0.15 + bonus;
}

function buildZones(imageData) {
  const { width, height } = imageData;
  const topCut = Math.max(1, Math.floor(height * 0.3));
  const bottomStart = Math.max(0, Math.floor(height * 0.68));
  const leftCut = Math.max(1, Math.floor(width * 0.33));
  const rightStart = Math.max(0, Math.floor(width * 0.67));
  const bottomEdgeStart = Math.max(0, height - Math.max(6, Math.floor(height * 0.12)));
  const centerXStart = Math.floor(width * 0.2);
  const centerXEnd = Math.ceil(width * 0.8);
  const centerYStart = Math.floor(height * 0.2);
  const centerYEnd = Math.ceil(height * 0.8);
  return {
    full: averageRegion(imageData, 0, width, 0, height),
    top: averageRegion(imageData, 0, width, 0, topCut),
    center: averageRegion(imageData, centerXStart, centerXEnd, centerYStart, centerYEnd),
    bottom: averageRegion(imageData, 0, width, bottomStart, height),
    left: averageRegion(imageData, 0, leftCut, 0, height),
    right: averageRegion(imageData, rightStart, width, 0, height),
    bottomEdge: averageRegion(imageData, 0, width, bottomEdgeStart, height),
  };
}

function rankByScore(candidates, scorer) {
  return candidates.map((candidate) => ({ ...candidate, score: scorer(candidate) })).sort((a, b) => b.score - a.score);
}

function buildPaletteCandidates(palette) {
  return [...new Set((palette || []).map((color) => rgbToHex(color)))].map((hex, index) => ({ key: `palette-${index}`, sourceLabel: `调色板 ${index + 1}`, sourceType: 'palette', hex, oklch: hexToOklch(hex) }));
}

function buildCandidateFamilies({ dominant, palette = [], spatial }) {
  const zoneCandidates = Object.entries(spatial.zones).map(([key, region]) => ({ key, sourceLabel: REGION_LABELS[key] || '图像主体', sourceType: 'zone', hex: region.hex, oklch: region.oklch, region }));
  const allCandidates = [
    ...zoneCandidates,
    ...buildPaletteCandidates(palette),
    {
      key: 'dominant',
      sourceLabel: '主导色',
      sourceType: 'dominant',
      hex: rgbToHex(dominant || [215, 215, 220]),
      oklch: hexToOklch(rgbToHex(dominant || [215, 215, 220])),
      region: spatial.zones.full,
    },
  ];
  const edge = spatial.zones.bottomEdge.oklch;
  return [
    {
      family: 'anchorDark',
      candidate: rankByScore(allCandidates, (candidate) => {
        const region = candidate.region || spatial.zones.full;
        const zoneBonus = candidate.key === 'top' || candidate.key === 'right' ? 0.22 : candidate.key === 'center' ? 0.12 : 0;
        return scoreRegionDarkness(region, zoneBonus) - candidate.oklch.c * 0.1;
      })[0],
      preferredToneMode: 'dark-panel',
    },
    {
      family: 'atmosphereMid',
      candidate: rankByScore(allCandidates, (candidate) => {
        const cohesion = 1 - hueDistance(candidate.oklch.h, edge.h) / 180;
        const lightnessPenalty = Math.abs(candidate.oklch.l - 0.58);
        return cohesion * 1.2 - lightnessPenalty * 1.4 + 0.45 - candidate.oklch.c * 0.3;
      })[0],
      preferredToneMode: 'auto',
    },
    {
      family: 'surfaceLight',
      candidate: rankByScore(allCandidates, (candidate) => {
        const region = candidate.region || spatial.zones.full;
        return scoreRegionLightness(region, candidate.key === 'bottom' || candidate.key === 'bottomEdge' ? 0.2 : 0);
      })[0],
      preferredToneMode: 'light-panel',
    },
    {
      family: 'accent',
      candidate: rankByScore(allCandidates, (candidate) => {
        const luminance = relativeLuminance(candidate.hex);
        return candidate.oklch.c * 2.2 - Math.abs(luminance - 0.46) * 0.9;
      })[0],
      preferredToneMode: 'auto',
    },
  ].filter((item) => item.candidate);
}

function scorePanelCandidate(item, spatial, panelIntent, normalizePanelCandidate) {
  const bias = getPanelIntentBias(panelIntent);
  const preferredToneMode = bias.toneMode !== 'auto' ? bias.toneMode : item.preferredToneMode;
  const panelBg = normalizePanelCandidate(item.candidate.hex, { preferredToneMode });
  const panel = hexToOklch(panelBg);
  const edge = spatial.zones.bottomEdge.oklch;
  const anchor = spatial.anchorDark.oklch;
  const continuity = clamp(1 - Math.abs(panel.l - edge.l) * 1.5 - hueDistance(panel.h, edge.h) / 240, 0, 1);
  const anchorAffinity = clamp(1 - Math.abs(panel.l - anchor.l) * 1.15 - hueDistance(panel.h, anchor.h) / 220, 0, 1);
  const weightBalance =
    spatial.topHeaviness > 0
      ? clamp((1 - panel.l) * 0.88 + spatial.topHeaviness * 0.75, 0, 1)
      : clamp(panel.l * 0.82 + spatial.bottomHeaviness * 0.55, 0, 1);
  const contrastFeasibility = clamp(Math.abs(panel.l - 0.5) * 1.8 + (panel.c < 0.12 ? 0.28 : 0), 0, 1);
  const paletteCohesion = clamp(
    1 - hueDistance(panel.h, spatial.zones.full.oklch.h) / 210 - Math.abs(panel.c - spatial.zones.full.meanChroma) * 1.4,
    0,
    1,
  );
  return {
    family: item.family,
    panelBg,
    candidate: item.candidate,
    preferredToneMode,
    score:
      continuity * 0.9 +
      weightBalance * 1.35 +
      anchorAffinity * (item.family === 'anchorDark' ? 1.45 : 0.65) +
      contrastFeasibility * 0.8 +
      paletteCohesion * 0.7 +
      (bias[item.family] || 0),
  };
}

export function analyzeImageSpatialData(imageData) {
  const zones = buildZones(imageData);
  const topHeaviness = clamp((zones.bottom.meanLightness - zones.top.meanLightness) * 1.2 + (zones.top.darkRatio - zones.bottom.darkRatio) * 0.95, 0, 1);
  const bottomHeaviness = clamp((zones.top.meanLightness - zones.bottom.meanLightness) * 1.05 + (zones.bottom.darkRatio - zones.top.darkRatio) * 0.8, 0, 1);
  const anchorDark = [zones.top, zones.right, zones.center, zones.full]
    .map((region, index) => ({ region, score: scoreRegionDarkness(region, index < 2 ? 0.18 : 0) }))
    .sort((a, b) => b.score - a.score)[0].region;
  return { zones, topHeaviness, bottomHeaviness, anchorDark };
}

export function createFallbackSpatialProfile(color) {
  const hex = typeof color === 'string' ? color : rgbToHex(color || [215, 215, 220]);
  const oklch = hexToOklch(hex);
  const region = {
    rgb: null,
    hex,
    oklch,
    meanLightness: oklch.l,
    meanChroma: oklch.c,
    darkRatio: oklch.l < 0.33 ? 1 : 0,
    brightRatio: oklch.l > 0.76 ? 1 : 0,
  };
  return {
    zones: { full: region, top: region, center: region, bottom: region, left: region, right: region, bottomEdge: region },
    topHeaviness: 0,
    bottomHeaviness: 0,
    anchorDark: region,
  };
}

export function selectPanelCandidate({ dominant, palette = [], spatial, panelIntent, normalizePanelCandidate }) {
  const resolvedIntent = normalizePanelIntent(panelIntent);
  const safeSpatial = spatial || createFallbackSpatialProfile(dominant);
  const ranked = buildCandidateFamilies({ dominant, palette, spatial: safeSpatial })
    .map((item) => scorePanelCandidate(item, safeSpatial, resolvedIntent, normalizePanelCandidate))
    .sort((a, b) => b.score - a.score);
  const selected = ranked[0] || {
    family: 'surfaceLight',
    candidate: { sourceLabel: '图像主体', oklch: hexToOklch('#d7d7dc') },
    panelBg: normalizePanelCandidate('#d7d7dc', { preferredToneMode: 'light-panel' }),
    preferredToneMode: 'light-panel',
  };
  const toneMode = selected.preferredToneMode === 'auto' ? (hexToOklch(selected.panelBg).l >= 0.58 ? 'light-panel' : 'dark-panel') : selected.preferredToneMode;
  return {
    panelBg: selected.panelBg,
    panelIntent:
      resolvedIntent === 'auto'
        ? { anchorDark: 'dark-anchor', surfaceLight: 'light-air', atmosphereMid: 'surface-match', accent: 'neutral-balance' }[
            selected.family
          ] || 'neutral-balance'
        : resolvedIntent,
    family: selected.family,
    familyHue: selected.candidate.oklch.h,
    toneMode,
    selectionReason: formatSelectionReason({ family: selected.family, sourceLabel: selected.candidate.sourceLabel, toneMode }),
  };
}
