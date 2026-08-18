import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type BlogImageSize = { width: number; height: number };

const cache = new Map<string, BlogImageSize>();
const DEFAULT_SIZE: BlogImageSize = { width: 1600, height: 900 };

function publicFile(src: string) {
  return join(process.cwd(), 'public', src.replace(/^\/+/, ''));
}

export function isLocalBlogImage(src?: string): src is string {
  return Boolean(src && src.startsWith('/') && !src.startsWith('//'));
}

export function localBlogImageSize(src?: string): BlogImageSize {
  if (!isLocalBlogImage(src)) return DEFAULT_SIZE;
  const hit = cache.get(src);
  if (hit) return hit;
  const file = publicFile(src);
  if (!existsSync(file)) return DEFAULT_SIZE;
  const size = probeSize(readFileSync(file)) || DEFAULT_SIZE;
  cache.set(src, size);
  return size;
}

function probeSize(buffer: Buffer): BlogImageSize | null {
  if (buffer.length < 24) return null;
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return probeWebp(buffer);
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return probeJpeg(buffer);
  return null;
}

function probeWebp(buffer: Buffer): BlogImageSize | null {
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X' && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8 ' && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === 'VP8L' && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

function probeJpeg(buffer: Buffer): BlogImageSize | null {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}
