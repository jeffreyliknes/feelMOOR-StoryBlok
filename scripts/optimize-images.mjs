#!/usr/bin/env node
/**
 * Convert raster images under public/images to WebP and optionally remove originals.
 * Also resizes photos wider than MAX_WIDTH to cut transfer size on Vercel.
 *
 * Usage: node scripts/optimize-images.mjs [--replace]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('public/images');
const REPLACE = process.argv.includes('--replace');
const MAX_WIDTH = 1920;
const QUALITY = 82;
const LOGO_MAX_WIDTH = 1200;
const LOGO_DIRS = new Set(['Logos', 'zertifizierungen']);

const RASTER = new Set(['.jpg', '.jpeg', '.png']);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function convert(file) {
  const ext = path.extname(file).toLowerCase();
  if (!RASTER.has(ext)) return null;

  const out = file.replace(/\.(jpe?g|png)$/i, '.webp');
  const relParts = path.relative(ROOT, file).split(path.sep);
  const maxWidth = relParts.some((p) => LOGO_DIRS.has(p)) ? LOGO_MAX_WIDTH : MAX_WIDTH;

  const inputStat = await fs.stat(file);
  let pipeline = sharp(file, { failOn: 'none' });
  const meta = await pipeline.metadata();
  if (meta.width && meta.width > maxWidth) {
    pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
  }

  await pipeline.webp({ quality: QUALITY, effort: 4 }).toFile(out);
  const outStat = await fs.stat(out);

  if (REPLACE) {
    await fs.unlink(file);
  }

  return {
    file: path.relative('public', file),
    out: path.relative('public', out),
    before: inputStat.size,
    after: outStat.size,
  };
}

const files = await walk(ROOT);
let converted = 0;
let saved = 0;
let beforeTotal = 0;
let afterTotal = 0;

console.log(`Optimizing ${files.length} files under public/images ...`);

for (const file of files) {
  try {
    const result = await convert(file);
    if (!result) continue;
    converted += 1;
    beforeTotal += result.before;
    afterTotal += result.after;
    saved += result.before - result.after;
    if (converted % 25 === 0) {
      console.log(`  ${converted} converted ...`);
    }
  } catch (err) {
    console.error(`Failed: ${file}\n  ${err.message}`);
  }
}

console.log('');
console.log(`Converted: ${converted}`);
console.log(`Before:    ${formatBytes(beforeTotal)}`);
console.log(`After:     ${formatBytes(afterTotal)}`);
console.log(`Saved:     ${formatBytes(saved)} (${beforeTotal ? Math.round((saved / beforeTotal) * 100) : 0}%)`);
if (REPLACE) console.log('Original JPG/PNG files removed.');
