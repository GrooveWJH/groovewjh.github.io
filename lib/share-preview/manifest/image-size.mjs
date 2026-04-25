import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function decodePublicPathToFilesystemPath(path) {
  return String(path || '')
    .split('/')
    .map((segment) => {
      if (!segment) {
        return segment;
      }

      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join('/');
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function parsePngSize(buffer) {
  if (buffer.length < 24) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function parseGifSize(buffer) {
  if (buffer.length < 10) {
    return null;
  }

  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function parseWebpSize(buffer) {
  if (buffer.length < 30) {
    return null;
  }

  const chunkType = buffer.toString('ascii', 12, 16);

  if (chunkType === 'VP8 ') {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunkType === 'VP8X') {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
    };
  }

  return null;
}

function parseJpegSize(buffer) {
  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const size = buffer.readUInt16BE(offset + 2);

    if (size < 2) {
      return null;
    }

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += size + 2;
  }

  return null;
}

function parseImageSize(buffer) {
  if (buffer.length < 12) {
    return null;
  }

  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return parseWebpSize(buffer);
  }

  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return parsePngSize(buffer);
  }

  if (buffer.toString('ascii', 0, 3) === 'GIF') {
    return parseGifSize(buffer);
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return parseJpegSize(buffer);
  }

  return null;
}

export function resolvePreviewImageSize(outputSiteDir, imagePath) {
  const normalizedPath = String(imagePath || '').trim();
  if (!normalizedPath.startsWith('/')) {
    return null;
  }

  const absolutePath = join(outputSiteDir, decodePublicPathToFilesystemPath(normalizedPath).replace(/^\/+/, ''));
  if (!existsSync(absolutePath)) {
    return null;
  }

  const parsed = parseImageSize(readFileSync(absolutePath));
  if (!parsed?.width || !parsed?.height) {
    return null;
  }

  return {
    width: parsed.width,
    height: parsed.height,
  };
}
