import { buildExportFileName, renderPlatformCardSvg, usesSmartPreviewColors } from '../renderers/index.mjs';
import { resolveSmartPreviewColors } from '../smart-colors.mjs';

function svgSizeFromMarkup(svgMarkup) {
  const match = String(svgMarkup).match(/viewBox="0 0 ([0-9.]+) ([0-9.]+)"/i);
  return {
    width: Number(match?.[1] || 600),
    height: Number(match?.[2] || 400),
  };
}

async function imageUrlToDataUrl(url) {
  if (!url) {
    return '';
  }

  if (String(url).startsWith('data:')) {
    return url;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image for export: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();

  return new Promise((resolvePromise, rejectPromise) => {
    const reader = new FileReader();
    reader.onload = () => resolvePromise(String(reader.result || ''));
    reader.onerror = () => rejectPromise(reader.error || new Error('Failed to read export image blob'));
    reader.readAsDataURL(blob);
  });
}

async function createSvgImage(svgMarkup) {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(svgBlob);

  try {
    return await new Promise((resolvePromise, rejectPromise) => {
      const image = new Image();
      image.onload = () => resolvePromise(image);
      image.onerror = () => rejectPromise(new Error('Failed to decode SVG export image'));
      image.src = blobUrl;
    });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export async function exportPlatformCardToPngBlob(
  entry,
  platformKey,
  { width = null, height = null, squareCanvas = false, displayOptions = null, descriptionBreakStartIndex = null } = {},
) {
  const sourceImageUrl = entry.imageUrl || entry.imagePath || '';
  const imageHref = await imageUrlToDataUrl(sourceImageUrl);
  const smartColors =
    usesSmartPreviewColors(platformKey) && sourceImageUrl ? await resolveSmartPreviewColors(sourceImageUrl) : null;
  const svgMarkup = renderPlatformCardSvg(entry, platformKey, {
    imageHref,
    smartColors,
    squareCanvas,
    displayOptions,
    descriptionBreakStartIndex,
  });
  const svgSize = svgSizeFromMarkup(svgMarkup);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context is unavailable for PNG export');
  }

  const targetWidth = Math.round(width || svgSize.width);
  const targetHeight = Math.round(height || svgSize.height);
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.clearRect(0, 0, targetWidth, targetHeight);

  const image = await createSvgImage(svgMarkup);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return new Promise((resolvePromise, rejectPromise) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        rejectPromise(new Error('Canvas failed to encode PNG blob'));
        return;
      }
      resolvePromise(blob);
    }, 'image/png');
  });
}

export async function downloadPlatformCardPng(entry, platformKey, options = {}) {
  const pngBlob = await exportPlatformCardToPngBlob(entry, platformKey, options);
  const fileName = buildExportFileName(entry, platformKey);
  const blobUrl = URL.createObjectURL(pngBlob);
  const link = document.createElement('a');

  try {
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  return {
    blob: pngBlob,
    fileName,
  };
}
