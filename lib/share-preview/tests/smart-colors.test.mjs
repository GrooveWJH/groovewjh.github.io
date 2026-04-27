import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adjustColorLightnessForContrast,
  contrastRatio,
  extractPaletteFromColorThiefApi,
  relativeLuminance,
  resolveColorThiefRuntimeApi,
  resolveSmartPreviewColorsFromPalette,
  softenBackgroundColor,
} from '../runtime/smart-colors.mjs';

test('contrastRatio matches WCAG expectations for black and white', () => {
  const ratio = contrastRatio('#000000', '#ffffff');
  assert.ok(ratio > 20.9 && ratio < 21.1);
});

test('softenBackgroundColor clamps extreme saturation and lightness', () => {
  const softened = softenBackgroundColor('#ff0000');
  assert.notEqual(softened, '#ff0000');
});

test('adjustColorLightnessForContrast preserves hue direction while meeting threshold', () => {
  const adjusted = adjustColorLightnessForContrast('#3d5afe', '#6b7280', 4.5);
  assert.ok(contrastRatio(adjusted, '#6b7280') >= 4.5);
});

test('resolveSmartPreviewColorsFromPalette returns semantic role tokens with guaranteed release thresholds', () => {
  const result = resolveSmartPreviewColorsFromPalette({
    dominant: [231, 62, 84],
    palette: [
      [231, 62, 84],
      [255, 255, 255],
      [245, 206, 78],
      [43, 52, 69],
      [162, 210, 255],
    ],
  });

  assert.deepEqual(
    Object.keys(result).filter((key) => ['panelBg', 'titleFg', 'bodyFg', 'contextFg', 'qrMaskBg', 'qrFg'].includes(key)),
    ['panelBg', 'titleFg', 'bodyFg', 'contextFg', 'qrMaskBg', 'qrFg'],
  );
  assert.ok(contrastRatio(result.titleFg, result.panelBg) >= 5.5);
  assert.ok(contrastRatio(result.bodyFg, result.panelBg) >= 5.5);
  assert.ok(contrastRatio(result.contextFg, result.panelBg) >= 5.5);
  assert.ok(contrastRatio(result.qrFg, result.qrMaskBg) >= 7.0);
  assert.equal(result.backgroundColor, result.panelBg);
  assert.equal(result.titleColor, result.titleFg);
  assert.equal(result.urlColor, result.contextFg);
  assert.equal(result.qrCodeColor, result.qrFg);
  assert.match(result.toneMode, /^(light-panel|dark-panel)$/);
  assert.ok(Number.isFinite(result.familyHue));
  assert.notEqual(result.panelBg, '#e73e54');
  assert.ok(relativeLuminance(result.panelBg) > 0.03);
  assert.ok(relativeLuminance(result.panelBg) < 0.92);
});

test('resolveSmartPreviewColorsFromPalette accepts ColorThief color objects', () => {
  const result = resolveSmartPreviewColorsFromPalette({
    dominant: { _r: 203, _g: 202, _b: 198 },
    palette: [
      { _r: 206, _g: 205, _b: 200 },
      { _r: 102, _g: 101, _b: 97 },
      { _r: 19, _g: 19, _b: 15 },
    ],
  });

  assert.notEqual(result.panelBg, '#d7d7dc');
  assert.ok(contrastRatio(result.titleFg, result.panelBg) >= 5.5);
  assert.ok(contrastRatio(result.bodyFg, result.panelBg) >= 5.5);
  assert.ok(contrastRatio(result.contextFg, result.panelBg) >= 5.5);
  assert.ok(contrastRatio(result.qrFg, result.qrMaskBg) >= 7.0);
});

test('resolveColorThiefRuntimeApi supports method-style browser globals', () => {
  const runtimeApi = {
    getColor: () => [10, 20, 30],
    getPalette: () => [
      [10, 20, 30],
      [200, 210, 220],
    ],
  };

  const resolved = resolveColorThiefRuntimeApi(runtimeApi);
  assert.deepEqual(resolved.getColor(), [10, 20, 30]);
  assert.deepEqual(resolved.getPalette(), [
    [10, 20, 30],
    [200, 210, 220],
  ]);
});

test('resolveColorThiefRuntimeApi supports constructor-style browser globals', () => {
  class LegacyColorThief {
    getColor() {
      return [30, 40, 50];
    }

    getPalette() {
      return [
        [30, 40, 50],
        [230, 240, 250],
      ];
    }
  }

  const resolved = resolveColorThiefRuntimeApi(LegacyColorThief);
  assert.deepEqual(resolved.getColor(), [30, 40, 50]);
  assert.deepEqual(resolved.getPalette(), [
    [30, 40, 50],
    [230, 240, 250],
  ]);
});

test('extractPaletteFromColorThiefApi awaits async method-style runtime APIs', async () => {
  const palette = await extractPaletteFromColorThiefApi(
    {
      getColor: async () => ({ _r: 203, _g: 202, _b: 198 }),
      getPalette: async () => [{ _r: 206, _g: 205, _b: 200 }],
    },
    {},
  );

  assert.deepEqual(palette, {
    dominant: { _r: 203, _g: 202, _b: 198 },
    palette: [{ _r: 206, _g: 205, _b: 200 }],
  });
});
