import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPlatformCardSvg } from '../runtime/renderers/index.mjs';
import { contrastRatio } from '../runtime/smart-colors-core.mjs';
import { buildContrastAuditModel, resolveAuditSelectionFromPart } from '../runtime/ui/contrast-audit.mjs';
import { createPreludeQrEntry } from './helpers.mjs';

test('buildContrastAuditModel applies large-text, body-text, and qr heuristic thresholds from rendered svg parts', () => {
  const entry = createPreludeQrEntry();
  const smartColors = {
    backgroundColor: '#ffffff',
    titleColor: '#949494',
    urlColor: '#767676',
    qrCodeColor: '#767676',
  };
  const displayOptions = { description: true, url: false, date: true, qr: true };
  const svgMarkup = renderPlatformCardSvg(entry, 'imessagePlus', {
    smartColors,
    squareCanvas: false,
    displayOptions,
  });
  const audit = buildContrastAuditModel({
    entry,
    svgMarkup,
    displayOptions,
    colorSamplingState: 'ready',
  });

  const title = audit.results.find((result) => result.target === 'titleBlock');
  const description = audit.results.find((result) => result.target === 'descriptionBlock');
  const siteName = audit.results.find((result) => result.target === 'siteNameText');
  const date = audit.results.find((result) => result.target === 'dateText');
  const domain = audit.results.find((result) => result.target === 'domainText');
  const qr = audit.results.find((result) => result.target === 'qrSymbol');

  assert.equal(audit.activeGroup, 'title');
  assert.equal(title.standardLabel, '大号文本');
  assert.ok(Math.abs(title.ratio - contrastRatio('#949494', '#ffffff')) < 0.001);
  assert.equal(title.aaPass, true);
  assert.equal(title.aaPlusPass, false);
  assert.equal(title.aaaPass, false);

  for (const result of [description, siteName, date]) {
    assert.equal(result.standardLabel, '正文文本');
    assert.ok(Math.abs(result.ratio - contrastRatio('#767676', '#ffffff')) < 0.001);
    assert.equal(result.aaPass, true);
    assert.equal(result.aaPlusPass, false);
    assert.equal(result.aaaPass, false);
  }

  assert.equal(domain.visibilityState, 'hidden-by-toggle');
  assert.equal(qr.standardLabel, 'QR 启发式');
  assert.ok(Math.abs(qr.ratio - contrastRatio('#767676', '#ffffff')) < 0.001);
  assert.equal(qr.aaPass, true);
  assert.equal(qr.aaPlusPass, false);
  assert.equal(qr.aaaPass, false);

  assert.equal(audit.summary.failingCount, 5);
  assert.equal(audit.summary.aaCount, 5);
  assert.equal(audit.summary.aaPlusCount, 0);
  assert.equal(audit.summary.aaaCount, 0);
  assert.equal(audit.summary.consideredCount, 5);
  assert.ok(Math.abs(audit.summary.overallWorstRatio - title.ratio) < 0.001);
});

test('buildContrastAuditModel excludes hidden items from summary but counts missing items as failures and defaults to context when all visible items pass', () => {
  const entry = createPreludeQrEntry();
  entry.publishedTime = null;

  const smartColors = {
    backgroundColor: '#ffffff',
    titleColor: '#202020',
    urlColor: '#202020',
    qrCodeColor: '#202020',
  };
  const displayOptions = { description: false, url: true, date: true, qr: true };
  const svgMarkup = renderPlatformCardSvg(entry, 'imessagePlus', {
    smartColors,
    squareCanvas: false,
    displayOptions,
  });
  const audit = buildContrastAuditModel({
    entry,
    svgMarkup,
    displayOptions,
    colorSamplingState: 'error',
  });

  const description = audit.results.find((result) => result.target === 'descriptionBlock');
  const date = audit.results.find((result) => result.target === 'dateText');
  const summaryContext = audit.summary.groupSummaries.find((group) => group.group === 'context');

  assert.equal(audit.colorSamplingLabel, '回退配色');
  assert.equal(description.visibilityState, 'hidden-by-toggle');
  assert.equal(date.visibilityState, 'missing');
  assert.equal(audit.summary.consideredCount, 5);
  assert.equal(audit.summary.failingCount, 1);
  assert.equal(audit.summary.aaCount, 4);
  assert.equal(audit.summary.aaPlusCount, 4);
  assert.equal(audit.summary.aaaCount, 4);
  assert.equal(summaryContext.failingCount, 1);
  assert.equal(summaryContext.worstTarget, 'dateText');

  const allPassingEntry = createPreludeQrEntry();
  const passingSvg = renderPlatformCardSvg(allPassingEntry, 'imessagePlus', {
    smartColors,
    squareCanvas: false,
    displayOptions: { description: true, url: true, date: true, qr: true },
  });
  const passingAudit = buildContrastAuditModel({
    entry: allPassingEntry,
    svgMarkup: passingSvg,
    displayOptions: { description: true, url: true, date: true, qr: true },
    colorSamplingState: 'ready',
  });

  assert.equal(passingAudit.activeGroup, 'context');
  assert.equal(passingAudit.summary.failingCount, 0);
});

test('buildContrastAuditModel summarizes each audit group as complete, partial, or fail for icon treatment', () => {
  const smartColors = {
    backgroundColor: '#ffffff',
    titleColor: '#202020',
    urlColor: '#202020',
    qrCodeColor: '#767676',
  };

  const partialEntry = createPreludeQrEntry();
  partialEntry.publishedTime = null;
  const partialSvg = renderPlatformCardSvg(partialEntry, 'imessagePlus', {
    smartColors,
    squareCanvas: false,
    displayOptions: { description: true, url: true, date: true, qr: true },
  });
  const partialAudit = buildContrastAuditModel({
    entry: partialEntry,
    svgMarkup: partialSvg,
    displayOptions: { description: true, url: true, date: true, qr: true },
    colorSamplingState: 'ready',
  });

  const titleGroup = partialAudit.summary.groupSummaries.find((group) => group.group === 'title');
  const contextGroup = partialAudit.summary.groupSummaries.find((group) => group.group === 'context');
  const qrGroup = partialAudit.summary.groupSummaries.find((group) => group.group === 'qr');

  assert.equal(titleGroup.statusLevel, 'complete');
  assert.equal(contextGroup.statusLevel, 'partial');
  assert.equal(qrGroup.statusLevel, 'fail');
});

test('resolveAuditSelectionFromPart maps rendered iMessage parts back to the approved audit groups', () => {
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-title-block'), { group: 'title', target: 'titleBlock' });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-description-text'), {
    group: 'description',
    target: 'descriptionBlock',
  });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-site-name-text'), {
    group: 'context',
    target: 'siteNameText',
  });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-date-text'), { group: 'context', target: 'dateText' });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-domain-text'), { group: 'context', target: 'domainText' });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-qr-symbol'), { group: 'qr', target: 'qrSymbol' });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-qr-mask'), { group: 'qr', target: 'qrSymbol' });
  assert.deepEqual(resolveAuditSelectionFromPart('imessage-qr-rail'), { group: 'qr', target: 'qrSymbol' });
  assert.equal(resolveAuditSelectionFromPart('imessage-metadata-panel'), null);
});
