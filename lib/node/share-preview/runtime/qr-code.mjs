import { adjustColorLightnessForContrast } from './smart-colors-core.mjs';

const QR_QUIET_ZONE = 4;

function resolveQrRuntime() {
  if (typeof globalThis.qrcode === 'function') {
    return globalThis.qrcode;
  }
  if (typeof window !== 'undefined') {
    throw new Error('QRCode runtime API is unavailable in share preview.');
  }
  return null;
}

function fallbackMatrix(text) {
  const size = 21;
  let seed = 0;
  for (const char of String(text || '')) {
    seed = (seed * 33 + char.charCodeAt(0)) >>> 0;
  }
  function isFinder(row, col, top, left) {
    const localRow = row - top;
    const localCol = col - left;
    return (
      localRow >= 0 &&
      localRow < 7 &&
      localCol >= 0 &&
      localCol < 7 &&
      (localRow === 0 ||
        localRow === 6 ||
        localCol === 0 ||
        localCol === 6 ||
        (localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4))
    );
  }
  return {
    moduleCount: size,
    isDark(row, col) {
      if (isFinder(row, col, 0, 0) || isFinder(row, col, 0, size - 7) || isFinder(row, col, size - 7, 0)) {
        return true;
      }
      return (((seed >> ((row + col) % 16)) ^ (row * 17) ^ (col * 31)) & 1) === 1;
    },
  };
}

function buildMatrix(url) {
  const runtime = resolveQrRuntime();
  if (!runtime) {
    return fallbackMatrix(url);
  }
  const qr = runtime(0, 'M');
  qr.addData(url, 'Byte');
  qr.make();
  return {
    moduleCount: qr.getModuleCount(),
    isDark(row, col) {
      return qr.isDark(row, col);
    },
  };
}

export function buildQrGeometry(url, options = {}) {
  if (!url) {
    return null;
  }
  const x = Number(options.x || 0);
  const y = Number(options.y || 0);
  const size = Number(options.size || 88);
  const radius = Number(options.radius || 18);
  const padding = Number(options.padding || 8);
  const matrix = buildMatrix(url);
  const totalModules = matrix.moduleCount + QR_QUIET_ZONE * 2;
  const moduleSize = (size - padding * 2) / totalModules;
  let path = '';
  let bounds = null;

  for (let row = 0; row < matrix.moduleCount; row += 1) {
    for (let col = 0; col < matrix.moduleCount; col += 1) {
      if (!matrix.isDark(row, col)) {
        continue;
      }
      const cellX = x + padding + (col + QR_QUIET_ZONE) * moduleSize;
      const cellY = y + padding + (row + QR_QUIET_ZONE) * moduleSize;
      path += `M${cellX},${cellY}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
      bounds = bounds
        ? {
            left: Math.min(bounds.left, cellX),
            top: Math.min(bounds.top, cellY),
            right: Math.max(bounds.right, cellX + moduleSize),
            bottom: Math.max(bounds.bottom, cellY + moduleSize),
          }
        : {
            left: cellX,
            top: cellY,
            right: cellX + moduleSize,
            bottom: cellY + moduleSize,
          };
    }
  }

  return {
    x,
    y,
    size,
    radius,
    padding,
    moduleSize,
    path,
    symbolBounds: bounds || { left: x, top: y, right: x + size, bottom: y + size },
  };
}

export function deriveQrColors(smartColors = null) {
  const backgroundColor = smartColors?.backgroundColor || '#d7d7dc';
  const urlColor = smartColors?.urlColor || '#74747a';
  return {
    overlayColor: 'transparent',
    symbolColor: smartColors?.qrCodeColor || adjustColorLightnessForContrast(urlColor, backgroundColor, 3.2),
  };
}

export function renderQrOverlay(geometry, smartColors = null) {
  if (!geometry) {
    return '';
  }
  const colors = deriveQrColors(smartColors);
  return `<g data-part="imessage-qr-overlay" aria-label="iMessage QR Overlay">
    <rect x="${geometry.x}" y="${geometry.y}" width="${geometry.size}" height="${geometry.size}" rx="${geometry.radius}" ry="${geometry.radius}" data-part="imessage-qr-mask" aria-label="iMessage QR Mask" fill="${colors.overlayColor}"></rect>
    <path d="${geometry.path}" data-part="imessage-qr-symbol" aria-label="iMessage QR Symbol" fill="${colors.symbolColor}"></path>
  </g>`;
}
