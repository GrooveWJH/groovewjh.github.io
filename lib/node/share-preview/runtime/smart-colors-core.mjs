const SOFT_WHITE = '#f7f7fa';
const SOFT_BLACK = '#17181c';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRgbColor(color) {
  if (Array.isArray(color)) return color;
  if (color && typeof color.array === 'function') return color.array();
  if (color && typeof color.rgb === 'function') {
    const rgb = color.rgb();
    if (Array.isArray(rgb)) return rgb;
    if (rgb && typeof rgb === 'object') return [rgb.r, rgb.g, rgb.b];
  }
  if (color && typeof color === 'object') {
    if ('_r' in color && '_g' in color && '_b' in color) return [color._r, color._g, color._b];
    if ('r' in color && 'g' in color && 'b' in color) return [color.r, color.g, color.b];
  }
  throw new TypeError('Unsupported RGB color shape');
}

function rgbToHex(color) {
  const [r, g, b] = normalizeRgbColor(color);
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(color) {
  const normalized = collapseWhitespace(color).replace(/^#/, '');
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rgbToHsl(color) {
  const [r, g, b] = normalizeRgbColor(color);
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const max = Math.max(r1, g1, b1);
  const min = Math.min(r1, g1, b1);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r1) h = ((g1 - b1) / d + (g1 < b1 ? 6 : 0)) / 6;
    else if (max === g1) h = ((b1 - r1) / d + 2) / 6;
    else h = ((r1 - g1) / d + 4) / 6;
  }

  return { h: h * 360, s, l };
}

function hueToRgb(p, q, t) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

function hslToRgb({ h, s, l }) {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = h / 360;
  return [
    Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    Math.round(hueToRgb(p, q, hue) * 255),
    Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
  ];
}

function relativeLuminance(color) {
  const [r, g, b] = typeof color === 'string' ? hexToRgb(color) : normalizeRgbColor(color);
  const toLinear = (value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function fallbackTextColor(backgroundColor, minContrast) {
  const candidates = [SOFT_WHITE, SOFT_BLACK, '#ffffff', '#000000'];
  return candidates.find((color) => contrastRatio(color, backgroundColor) >= minContrast) || SOFT_BLACK;
}

function hueDistance(h1, h2) {
  const diff = Math.abs(h1 - h2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function chooseCandidateColor(palette, backgroundColor, excluded = []) {
  const backgroundHsl = rgbToHsl(hexToRgb(backgroundColor));
  const excludedSet = new Set(excluded.map((color) => color.toLowerCase()));

  return (
    palette
      .map((color) => {
        const hex = rgbToHex(color);
        const hsl = rgbToHsl(color);
        return {
          color: hex,
          score: contrastRatio(hex, backgroundColor) * 2 + hueDistance(hsl.h, backgroundHsl.h) / 180 + hsl.s,
        };
      })
      .filter((item) => !excludedSet.has(item.color.toLowerCase()))
      .sort((a, b) => b.score - a.score)[0]?.color || null
  );
}

function deriveUrlColor(titleColor, backgroundColor) {
  const hsl = rgbToHsl(hexToRgb(titleColor));
  const backgroundLuminance = relativeLuminance(backgroundColor);

  for (let step = 1; step <= 40; step += 1) {
    const nextLightness = clamp(hsl.l + (backgroundLuminance < 0.5 ? -1 : 1) * (step / 200), 0, 1);
    const nextColor = rgbToHex(hslToRgb({ ...hsl, l: nextLightness }));
    const ratio = contrastRatio(nextColor, backgroundColor);
    if (ratio >= 3 && ratio < contrastRatio(titleColor, backgroundColor)) return nextColor;
  }

  return adjustColorLightnessForContrast(titleColor, backgroundColor, 3);
}

export function contrastRatio(colorA, colorB) {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function softenBackgroundColor(color) {
  const hsl = rgbToHsl(typeof color === 'string' ? hexToRgb(color) : normalizeRgbColor(color));
  return rgbToHex(hslToRgb({ h: hsl.h, s: Math.min(hsl.s, 0.6), l: clamp(hsl.l, 0.18, 0.82) }));
}

export function adjustColorLightnessForContrast(color, backgroundColor, minContrast) {
  if (contrastRatio(color, backgroundColor) >= minContrast) return rgbToHex(hexToRgb(color));

  const hsl = rgbToHsl(hexToRgb(color));
  const lighten = relativeLuminance(backgroundColor) < 0.5;

  for (let step = 1; step <= 100; step += 1) {
    const nextLightness = clamp(hsl.l + (lighten ? 1 : -1) * (step / 100), 0, 1);
    const nextColor = rgbToHex(hslToRgb({ ...hsl, l: nextLightness }));
    if (contrastRatio(nextColor, backgroundColor) >= minContrast) return nextColor;
  }

  const darkest = rgbToHex(hslToRgb({ ...hsl, l: 0 }));
  if (contrastRatio(darkest, backgroundColor) >= minContrast) return darkest;
  const lightest = rgbToHex(hslToRgb({ ...hsl, l: 1 }));
  if (contrastRatio(lightest, backgroundColor) >= minContrast) return lightest;
  return fallbackTextColor(backgroundColor, minContrast);
}

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

export function resolveSmartPreviewColorsFromPalette({ dominant, palette = [] }) {
  const backgroundColor = softenBackgroundColor(dominant || [215, 215, 220]);
  const titleCandidate = chooseCandidateColor(palette, backgroundColor) || '#2b3445';
  const titleColor = adjustColorLightnessForContrast(titleCandidate, backgroundColor, 4.5);
  const urlCandidate = chooseCandidateColor(palette, backgroundColor, [titleColor]);
  const urlColor = urlCandidate
    ? adjustColorLightnessForContrast(urlCandidate, backgroundColor, 3)
    : deriveUrlColor(titleColor, backgroundColor);
  return { backgroundColor, titleColor, urlColor };
}
