import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, relative } from 'node:path';
import { normalizePosixPath, walkFiles } from '../../foundation/fs.mjs';
import { PAGES_DIR, POSTS_DIR } from '../../foundation/paths.mjs';

const POEM_FRAME_TOKEN = '#poem-frame';
const EXCLUDED_POST_ROOT_DIRS = new Set(['_hidden', '_drafts']);
const POEM_TEXT_FIELD_PATTERNS = [/(?:^|\n)\s*title:\s*"([^"]*)"/u, /(?:^|\n)\s*description:\s*"([^"]*)"/u];

function skipWhitespace(text, index) {
  let cursor = index;
  while (cursor < text.length && /\s/u.test(text[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function findMatchingDelimiter(text, startIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];
    const prev = index > 0 ? text[index - 1] : '';

    if (quote != null) {
      if (char === quote && prev !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === openChar) {
      depth += 1;
      continue;
    }

    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function normalizeSimplePoemFrameBody(bodyText) {
  const normalized = String(bodyText).replace(/\r\n?/g, '\n');
  const lines = [];
  let currentLine = '';

  for (const rawLine of normalized.split('\n')) {
    const trimmed = rawLine.trim();
    if (trimmed === '') {
      continue;
    }

    if (trimmed.includes('#') || trimmed.includes('[') || trimmed.includes(']')) {
      return null;
    }

    const hasExplicitLinebreak = trimmed.endsWith('\\\\');
    const lineText = hasExplicitLinebreak ? trimmed.slice(0, -2).trim() : trimmed;
    currentLine += lineText;

    if (hasExplicitLinebreak) {
      lines.push(currentLine);
      currentLine = '';
    }
  }

  if (currentLine !== '') {
    lines.push(currentLine);
  }

  return lines.join('\n');
}

export function extractPoemFrameTextFromSource(sourceText = '') {
  const source = String(sourceText).replace(/\r\n?/g, '\n');
  const extractedBodies = [];
  let searchIndex = 0;

  while (searchIndex < source.length) {
    const tokenIndex = source.indexOf(POEM_FRAME_TOKEN, searchIndex);
    if (tokenIndex === -1) {
      break;
    }

    let cursor = skipWhitespace(source, tokenIndex + POEM_FRAME_TOKEN.length);
    if (source[cursor] === '(') {
      const paramsEnd = findMatchingDelimiter(source, cursor, '(', ')');
      if (paramsEnd === -1) {
        searchIndex = tokenIndex + POEM_FRAME_TOKEN.length;
        continue;
      }
      cursor = skipWhitespace(source, paramsEnd + 1);
    }

    if (source[cursor] !== '[') {
      searchIndex = tokenIndex + POEM_FRAME_TOKEN.length;
      continue;
    }

    const bodyEnd = findMatchingDelimiter(source, cursor, '[', ']');
    if (bodyEnd === -1) {
      searchIndex = tokenIndex + POEM_FRAME_TOKEN.length;
      continue;
    }

    const bodyText = normalizeSimplePoemFrameBody(source.slice(cursor + 1, bodyEnd));
    if (bodyText != null && bodyText !== '') {
      extractedBodies.push(bodyText);
    }

    searchIndex = bodyEnd + 1;
  }

  return extractedBodies.join('\n');
}

function extractPoemHeaderTextFromSource(sourceText = '') {
  const source = String(sourceText).replace(/\r\n?/g, '\n');
  const chunks = [];

  for (const pattern of POEM_TEXT_FIELD_PATTERNS) {
    const match = source.match(pattern);
    const value = match?.[1]?.trim() || '';
    if (value !== '') {
      chunks.push(value);
    }
  }

  return chunks.join('\n');
}

function isPublishedPostTypFile(postsDir, filePath) {
  const rel = normalizePosixPath(relative(postsDir, filePath));
  const [rootSegment = ''] = rel.split('/');
  return !EXCLUDED_POST_ROOT_DIRS.has(rootSegment);
}

function listTypFiles(rootDir, filter = () => true) {
  if (!existsSync(rootDir)) {
    return [];
  }

  return walkFiles(rootDir, (filePath) => extname(filePath).toLowerCase() === '.typ' && filter(filePath)).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function collectPublishedPoemFrameCorpusText({ postsDir = POSTS_DIR, pagesDir = PAGES_DIR } = {}) {
  const postFiles = listTypFiles(postsDir, (filePath) => isPublishedPostTypFile(postsDir, filePath));
  const pageFiles = listTypFiles(pagesDir);
  const corpusChunks = [];

  for (const filePath of [...postFiles, ...pageFiles]) {
    if (basename(filePath).toLowerCase() !== 'index.typ') {
      continue;
    }
    const sourceText = readFileSync(filePath, 'utf8');
    const extracted = extractPoemFrameTextFromSource(sourceText);
    if (extracted !== '') {
      corpusChunks.push(extracted);
    }
    if (normalizePosixPath(relative(postsDir, filePath)).startsWith('poems/')) {
      const headerText = extractPoemHeaderTextFromSource(sourceText);
      if (headerText !== '') {
        corpusChunks.push(headerText);
      }
    }
  }

  return corpusChunks.join('\n');
}
