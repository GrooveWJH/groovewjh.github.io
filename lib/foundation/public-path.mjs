function normalizeSegment(segment) {
  if (segment === '') {
    return '';
  }

  try {
    return encodeURIComponent(decodeURIComponent(segment));
  } catch {
    return encodeURIComponent(segment);
  }
}

export function encodePublicPath(path) {
  return String(path || '')
    .split('/')
    .map((segment) => normalizeSegment(segment))
    .join('/');
}

export function toPublicPath(path) {
  const normalized = String(path || '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.startsWith('/') ? encodePublicPath(normalized) : `/${encodePublicPath(normalized)}`;
}

export function toPublicUrl(pagePath) {
  const normalized = String(pagePath || '').replace(/^\/+|\/+$/g, '');
  return normalized ? toPublicPath(`${normalized}/`) : '/';
}

export function normalizePublicUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return toPublicPath(normalized);
  }

  const matched = normalized.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
  if (!matched) {
    return normalized;
  }

  const [, origin, rawRest = '/'] = matched;
  const queryIndex = rawRest.indexOf('?');
  const rawPath = queryIndex >= 0 ? rawRest.slice(0, queryIndex) : rawRest;
  const rawQuery = queryIndex >= 0 ? rawRest.slice(queryIndex) : '';
  return `${origin}${toPublicPath(rawPath)}${rawQuery}`;
}

export function toAbsoluteUrl(siteUrl, path) {
  if (!siteUrl || !path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return normalizePublicUrl(path);
  }

  const cleanBase = String(siteUrl).replace(/\/+$/, '');
  return `${cleanBase}${toPublicPath(path)}`;
}
