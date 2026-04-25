import { existsSync, readFileSync } from 'node:fs';
import { normalizePosixPath } from '../../foundation/fs.mjs';
import { ROOT_DIR } from '../../foundation/paths.mjs';

export function readSiteConfigInputs(siteConfigPath) {
  if (!existsSync(siteConfigPath)) {
    return { siteUrl: null, localSiteUrl: null, author: null, siteTitle: null, language: null };
  }

  const raw = readFileSync(siteConfigPath, 'utf8').trim();
  if (raw.length === 0) {
    return { siteUrl: null, localSiteUrl: null, author: null, siteTitle: null, language: null };
  }

  try {
    const parsed = JSON.parse(raw);
    const siteUrl =
      String(parsed.siteUrl || '')
        .trim()
        .replace(/\/+$/, '') || null;
    const localSiteUrl =
      String(parsed.localSiteUrl || '')
        .trim()
        .replace(/\/+$/, '') || null;
    const author = String(parsed.author || '').trim() || null;
    const siteTitle = String(parsed.siteTitle || '').trim() || null;
    const language =
      String(parsed.language || '')
        .trim()
        .toLowerCase() || null;
    return { siteUrl, localSiteUrl, author, siteTitle, language };
  } catch {
    throw new Error(`Invalid JSON in ${normalizePosixPath(siteConfigPath.replace(`${ROOT_DIR}/`, ''))}`);
  }
}

export function resolveActiveShareSiteUrl(siteInputs, shareOrigin) {
  return shareOrigin === 'prod' ? siteInputs.siteUrl : siteInputs.localSiteUrl;
}

export function buildExtraInputs(siteInputs = {}) {
  const extraInputs = [];
  if (siteInputs.activeSiteUrl) {
    extraInputs.push(['website-url', siteInputs.activeSiteUrl]);
  }
  if (siteInputs.author) {
    extraInputs.push(['author', siteInputs.author]);
  }
  if (siteInputs.fontMode) {
    extraInputs.push(['font-mode', siteInputs.fontMode]);
  }
  return extraInputs;
}
