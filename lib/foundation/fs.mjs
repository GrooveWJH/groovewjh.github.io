import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function normalizePosixPath(pathValue) {
  return pathValue.replace(/\\/g, '/');
}

export function safeRead(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return '';
    }

    throw error;
  }
}

export function walkFiles(dir, predicate = () => true) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    const children = readdirSync(current, { withFileTypes: true });

    for (const child of children) {
      const abs = join(current, child.name);
      if (child.isDirectory()) {
        stack.push(abs);
      } else if (predicate(abs)) {
        files.push(abs);
      }
    }
  }

  return files;
}

export function ensureDirForFile(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function writeJson(filePath, value) {
  ensureDirForFile(filePath);
  writeFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}
