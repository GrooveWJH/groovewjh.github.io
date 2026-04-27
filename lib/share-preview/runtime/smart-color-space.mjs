export const SOFT_WHITE = '#f7f7fa';
export const SOFT_BLACK = '#17181c';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function collapseWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeHue(value) {
  const normalized = Number(value || 0) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function hueDistance(h1, h2) {
  const diff = Math.abs(normalizeHue(h1) - normalizeHue(h2)) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function normalizeRgbColor(color) {
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

export function rgbToHex(color) {
  const [r, g, b] = normalizeRgbColor(color);
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgb(color) {
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

function srgbChannelToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function linearChannelToSrgb(value) {
  const normalized = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return clamp(Math.round(normalized * 255), 0, 255);
}

function rgbToLinearSrgb(color) {
  const [r, g, b] = typeof color === 'string' ? hexToRgb(color) : normalizeRgbColor(color);
  return [srgbChannelToLinear(r), srgbChannelToLinear(g), srgbChannelToLinear(b)];
}

function linearSrgbToRgb(color) {
  return color.map((channel) => linearChannelToSrgb(clamp(channel, 0, 1)));
}

export function relativeLuminance(color) {
  const [r, g, b] = rgbToLinearSrgb(color);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(colorA, colorB) {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function linearSrgbToOklab(color) {
  const [r, g, b] = color;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearSrgb(color) {
  const l = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const m = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const s = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l3 = l ** 3;
  const m3 = m ** 3;
  const s3 = s ** 3;

  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

export function rgbToOklab(color) {
  return linearSrgbToOklab(rgbToLinearSrgb(color));
}

export function oklabToRgb(color) {
  return linearSrgbToRgb(oklabToLinearSrgb(color));
}

export function oklabToOklch(color) {
  const chroma = Math.sqrt(color.a ** 2 + color.b ** 2);
  return {
    l: clamp(color.l, 0, 1),
    c: chroma,
    h: chroma > 1e-7 ? normalizeHue((Math.atan2(color.b, color.a) * 180) / Math.PI) : 0,
  };
}

export function oklchToOklab(color) {
  const hue = normalizeHue(color.h);
  const radians = (hue * Math.PI) / 180;
  return {
    l: clamp(color.l, 0, 1),
    a: color.c * Math.cos(radians),
    b: color.c * Math.sin(radians),
  };
}

export function rgbToOklch(color) {
  return oklabToOklch(rgbToOklab(color));
}

export function hexToOklch(color) {
  return rgbToOklch(color);
}

function isInGamut(color) {
  return color.every((value) => value >= 0 && value <= 1);
}

function fitOklchToLinearSrgb(color) {
  const seed = {
    l: clamp(color.l, 0, 1),
    c: Math.max(0, Number(color.c || 0)),
    h: normalizeHue(color.h),
  };
  const direct = oklabToLinearSrgb(oklchToOklab(seed));
  if (isInGamut(direct)) {
    return direct;
  }

  let low = 0;
  let high = seed.c;
  let best = oklabToLinearSrgb(oklchToOklab({ ...seed, c: 0 }));

  for (let step = 0; step < 18; step += 1) {
    const nextChroma = (low + high) / 2;
    const nextLinear = oklabToLinearSrgb(oklchToOklab({ ...seed, c: nextChroma }));
    if (isInGamut(nextLinear)) {
      low = nextChroma;
      best = nextLinear;
    } else {
      high = nextChroma;
    }
  }

  return best;
}

export function oklchToRgb(color) {
  return linearSrgbToRgb(fitOklchToLinearSrgb(color));
}

export function oklchToHex(color) {
  return rgbToHex(oklchToRgb(color));
}
