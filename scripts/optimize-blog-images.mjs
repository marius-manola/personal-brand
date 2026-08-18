import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'public', 'blog');
const CONTENT_DIR = join(ROOT, 'content', 'blog');
export const BLOG_IMAGE_MAX_EDGE = 1600;
export const BLOG_IMAGE_QUALITY = 75;
const RASTER = /\.(png|jpe?g|webp)$/i;

export async function optimizeBlogImageBuffer(buffer) {
  const image = sharp(buffer, { failOn: 'none', animated: false });
  const meta = await image.metadata();
  const edge = Math.max(meta.width || 0, meta.height || 0);
  const resized = image.rotate().resize({
    width: meta.width && meta.width >= (meta.height || 0) ? Math.min(meta.width, BLOG_IMAGE_MAX_EDGE) : undefined,
    height: meta.height && meta.height > (meta.width || 0) ? Math.min(meta.height, BLOG_IMAGE_MAX_EDGE) : undefined,
    fit: 'inside',
    withoutEnlargement: true,
  });
  const output = await resized.webp({ quality: BLOG_IMAGE_QUALITY, effort: 4 }).toBuffer();
  return {
    buffer: output,
    width: meta.width && edge > BLOG_IMAGE_MAX_EDGE
      ? Math.round(meta.width * (BLOG_IMAGE_MAX_EDGE / edge))
      : meta.width || 1600,
    height: meta.height && edge > BLOG_IMAGE_MAX_EDGE
      ? Math.round(meta.height * (BLOG_IMAGE_MAX_EDGE / edge))
      : meta.height || 900,
  };
}

export function webpPublicPath(publicPath) {
  const cleaned = String(publicPath || '').replace(/^\/+/, '');
  const next = cleaned.replace(RASTER, '.webp');
  return `/${next.endsWith('.webp') ? next : `${next}.webp`}`;
}

export async function writeOptimizedBlogImage(root, publicPath, buffer) {
  const nextPath = webpPublicPath(publicPath);
  const alreadyLeanWebp = /\.webp$/i.test(String(publicPath)) && buffer.length <= 400_000;
  const output = alreadyLeanWebp ? buffer : (await optimizeBlogImageBuffer(buffer)).buffer;
  const abs = join(root, 'public', nextPath.replace(/^\//, ''));
  if (!alreadyLeanWebp || nextPath !== publicPath) {
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, output);
  }
  const original = join(root, 'public', String(publicPath).replace(/^\//, ''));
  if (original !== abs && existsSync(original)) {
    try { await unlink(original); } catch { /* already gone */ }
  }
  return nextPath;
}

export async function optimizeBlogImageFile(root, absOrPublic) {
  const abs = absOrPublic.startsWith('/') && !absOrPublic.startsWith(root)
    ? join(root, 'public', absOrPublic.replace(/^\//, ''))
    : absOrPublic;
  const buffer = await readFile(abs);
  const publicPath = `/${relative(join(root, 'public'), abs)}`;
  return writeOptimizedBlogImage(root, publicPath, buffer);
}

function rewriteImageRefs(source) {
  return source.replace(/(\/blog\/[A-Za-z0-9._/-]+)\.(png|jpe?g)/gi, '$1.webp');
}

async function optimizeTree() {
  const files = (await readdir(BLOG_DIR)).filter((name) => RASTER.test(name));
  let saved = 0;
  let before = 0;
  let after = 0;
  for (const name of files) {
    const abs = join(BLOG_DIR, name);
    const input = await readFile(abs);
    before += input.length;
    const dest = await writeOptimizedBlogImage(ROOT, `/blog/${name}`, input);
    const output = await readFile(join(ROOT, 'public', dest.replace(/^\//, '')));
    after += output.length;
    saved += 1;
    console.log(`${name} → ${dest} (${Math.round(input.length / 1024)}KB → ${Math.round(output.length / 1024)}KB)`);
  }

  const posts = (await readdir(CONTENT_DIR)).filter((name) => name.endsWith('.mdx'));
  for (const name of posts) {
    const file = join(CONTENT_DIR, name);
    const source = await readFile(file, 'utf8');
    const next = rewriteImageRefs(source);
    if (next !== source) await writeFile(file, next, 'utf8');
  }

  console.log(`optimized ${saved} images · ${Math.round(before / 1024 / 1024)}MB → ${Math.round(after / 1024 / 1024)}MB`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('optimize-blog-images.mjs')) {
  await optimizeTree();
}
