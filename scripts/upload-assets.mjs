/**
 * Upload all images from public/images/ to Storyblok's asset manager.
 *
 * Usage:  node scripts/upload-assets.mjs
 *
 * Preserves folder structure (e.g. images/therme/sauna-2.webp → therme/sauna-2.webp).
 * After upload, updates all stories to replace local image paths with Storyblok CDN URLs.
 *
 * Requires .env with STORYBLOK_SPACE_ID and STORYBLOK_PERSONAL_TOKEN.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const TOKEN = process.env.STORYBLOK_PERSONAL_TOKEN;
const BASE = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`;
const IMAGES_DIR = path.resolve('public/images');

const headers = {
  'Content-Type': 'application/json',
  Authorization: TOKEN,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Map from local path (/images/hotel/foo.webp) to Storyblok CDN URL
const assetMap = {};

// Track stats
let uploaded = 0;
let skipped = 0;
let failed = 0;

/**
 * Upload a single file to Storyblok.
 * Returns the CDN URL or null on failure.
 *
 * Storyblok asset upload is a 2-step process:
 * 1. POST to /assets to get a signed S3 upload URL + fields
 * 2. POST (multipart) to that S3 URL with the file
 */
async function uploadAsset(filePath, folder) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  const contentTypeMap = {
    webp: 'image/webp',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    gif: 'image/gif',
  };
  const contentType = contentTypeMap[ext] || 'application/octet-stream';
  const fileSize = fs.statSync(filePath).size;

  // Step 1: Register the asset
  await sleep(400);
  const registerRes = await fetch(`${BASE}/assets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filename,
      size: `${Math.round(fileSize / 1024)}x0`,
      asset_folder_id: folder?.id || null,
    }),
  });

  if (!registerRes.ok) {
    const text = await registerRes.text();
    console.error(`    FAILED to register ${filename}: ${registerRes.status} ${text}`);
    return null;
  }

  const registerData = await registerRes.json();
  const signedUrl = registerData.post_url;
  const fields = registerData.fields;
  const publicUrl = registerData.public_url;
  const prettyUrl = registerData.pretty_url;

  // Step 2: Upload to S3
  const fileBuffer = fs.readFileSync(filePath);
  const formData = new FormData();

  // Add all signed fields first
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  // Add the file last
  formData.append('file', new Blob([fileBuffer], { type: contentType }), filename);

  const uploadRes = await fetch(signedUrl, {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok && uploadRes.status !== 204) {
    console.error(`    FAILED to upload ${filename}: ${uploadRes.status}`);
    return null;
  }

  return prettyUrl || publicUrl;
}

/**
 * Create or find an asset folder in Storyblok.
 */
const folderCache = {};

async function getOrCreateFolder(folderName, parentId) {
  const cacheKey = `${parentId || 'root'}/${folderName}`;
  if (folderCache[cacheKey]) return folderCache[cacheKey];

  await sleep(400);

  // Try to create
  const res = await fetch(`${BASE}/asset_folders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      asset_folder: {
        name: folderName,
        parent_id: parentId || null,
      },
    }),
  });

  if (res.ok) {
    const data = await res.json();
    folderCache[cacheKey] = data.asset_folder;
    return data.asset_folder;
  }

  // If it already exists, find it
  await sleep(400);
  const listRes = await fetch(`${BASE}/asset_folders`, { headers });
  if (listRes.ok) {
    const { asset_folders } = await listRes.json();
    const existing = asset_folders.find(
      (f) => f.name === folderName && (f.parent_id || null) === (parentId || null)
    );
    if (existing) {
      folderCache[cacheKey] = existing;
      return existing;
    }
  }

  return null;
}

/**
 * Recursively collect all image files with their relative paths.
 */
function collectImages(dir, relBase = '') {
  const entries = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, item.name);
    const relPath = relBase ? `${relBase}/${item.name}` : item.name;
    if (item.isDirectory()) {
      entries.push(...collectImages(fullPath, relPath));
    } else if (/\.(webp|jpg|jpeg|png|svg|gif)$/i.test(item.name)) {
      entries.push({ fullPath, relPath, dir: relBase });
    }
  }
  return entries;
}

async function main() {
  console.log(`\nUploading images to Storyblok space ${SPACE_ID}...\n`);

  if (!SPACE_ID || !TOKEN) {
    console.error('Missing STORYBLOK_SPACE_ID or STORYBLOK_PERSONAL_TOKEN in .env');
    process.exit(1);
  }

  const images = collectImages(IMAGES_DIR);
  console.log(`Found ${images.length} images to upload.\n`);

  // Create folders first
  const uniqueDirs = [...new Set(images.map((img) => img.dir).filter(Boolean))];
  console.log('=== Creating asset folders ===');
  const assetFolders = {};

  for (const dir of uniqueDirs) {
    const parts = dir.split('/');
    let parentId = null;
    let folderPath = '';

    for (const part of parts) {
      folderPath = folderPath ? `${folderPath}/${part}` : part;
      const folder = await getOrCreateFolder(part, parentId);
      if (folder) {
        assetFolders[folderPath] = folder;
        parentId = folder.id;
        console.log(`  Folder: ${folderPath} → id ${folder.id}`);
      } else {
        console.error(`  FAILED to create folder: ${folderPath}`);
      }
    }
  }

  // Upload images
  console.log('\n=== Uploading images ===');
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const folder = img.dir ? assetFolders[img.dir] : null;
    const localPath = `/images/${img.relPath}`;

    process.stdout.write(`  [${i + 1}/${images.length}] ${img.relPath}...`);

    try {
      const cdnUrl = await uploadAsset(img.fullPath, folder);
      if (cdnUrl) {
        assetMap[localPath] = cdnUrl;
        uploaded++;
        console.log(' OK');
      } else {
        failed++;
        console.log(' FAILED');
      }
    } catch (err) {
      failed++;
      console.log(` ERROR: ${err.message}`);
    }
  }

  // Save the mapping for reference
  const mapPath = path.resolve('scripts/asset-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(assetMap, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Failed:   ${failed}`);
  console.log(`Asset map saved to scripts/asset-map.json`);
  console.log(`\nRun "node scripts/update-story-assets.mjs" to update stories with CDN URLs.`);
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
