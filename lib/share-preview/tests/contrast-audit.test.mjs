import assert from 'node:assert/strict';
import test from 'node:test';
import { renderPlatformCardSvg } from '../runtime/renderers/index.mjs';
import { contrastRatio } from '../runtime/smart-colors-core.mjs';
import { buildContrastAuditModel, resolveAuditSelectionFromPart } from '../runtime/ui/contrast-audit.mjs';
import { createPreludeQrEntry } from './helpers.mjs';

test('buildContrastAuditModel applies large-text, body-text, and qr heuristic thresholds from rendered svg parts', () => {
  const entry = createPreludeQrEntry();
  const smartColors = {
    panelBg: '#ffffff',
    titleFg: '#949494',
    bodyFg: '#767676',
    contextFg: '#767676',
    qrMaskBg: '#ececec',
    qrFg: '#767676',
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
  assert.equal(title.token, 'titleFg');
  assert.equal(title.releaseThreshold, 5.5);
  assert.ok(Math.abs(title.ratio - contrastRatio('#949494', '#ffffff')) < 0.001);
  assert.equal(title.releasePass, false);

  for (const result of [description, siteName, date]) {
    assert.ok(Math.abs(result.ratio - contrastRatio('#767676', '#ffffff')) < 0.001);
    assert.equal(result.releaseThreshold, 5.5);
    assert.equal(result.releasePass, false);
  }

  assert.equal(domain.visibilityState, 'hidden-by-toggle');
  assert.equal(qr.token, 'qrFg');
  assert.ok(Math.abs(qr.ratio - contrastRatio('#767676', '#ffffff')) < 0.001);
  assert.equal(qr.releaseThreshold, 7.0);
  assert.equal(qr.releasePass, false);

  assert.equal(audit.summary.failingCount, 5);
  assert.equal(audit.summary.rolePassCount, 0);
  assert.equal(audit.summary.roleTotalCount, 4);
  assert.equal(audit.summary.consideredCount, 5);
  assert.ok(Math.abs(audit.summary.overallWorstRatio - title.ratio) < 0.001);
});

test('buildContrastAuditModel excludes hidden items from summary but counts missing items as failures and defaults to context when all visible items pass', () => {
  const entry = createPreludeQrEntry();
  entry.publishedTime = null;

  const smartColors = {
    panelBg: '#ffffff',
    titleFg: '#202020',
    bodyFg: '#202020',
    contextFg: '#202020',
    qrMaskBg: '#f2f2f2',
    qrFg: '#202020',
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
  assert.equal(audit.summary.rolePassCount, 2);
  assert.equal(audit.summary.roleTotalCount, 4);
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
    smartColors,
  });

  assert.equal(passingAudit.activeGroup, 'context');
  assert.equal(passingAudit.summary.failingCount, 0);
  assert.equal(passingAudit.summary.rolePassCount, 4);
});

test('buildContrastAuditModel summarizes each audit role from semantic tokens instead of SVG fill readback', () => {
  const smartColors = {
    panelBg: '#ffffff',
    titleFg: '#202020',
    bodyFg: '#202020',
    contextFg: '#202020',
    qrMaskBg: '#ededed',
    qrFg: '#767676',
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
    svgMarkup: partialSvg.replace(/fill="#202020"/g, 'fill="#ff00aa"'),
    displayOptions: { description: true, url: true, date: true, qr: true },
    colorSamplingState: 'ready',
    smartColors,
  });

  const titleGroup = partialAudit.summary.groupSummaries.find((group) => group.group === 'title');
  const contextGroup = partialAudit.summary.groupSummaries.find((group) => group.group === 'context');
  const qrGroup = partialAudit.summary.groupSummaries.find((group) => group.group === 'qr');

  assert.equal(titleGroup.statusLevel, 'complete');
  assert.equal(contextGroup.statusLevel, 'partial');
  assert.equal(qrGroup.statusLevel, 'fail');
  assert.ok(Math.abs(partialAudit.results.find((result) => result.target === 'titleBlock').ratio - contrastRatio('#202020', '#ffffff')) < 0.001);
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
