/**
 * Update all Storyblok stories to replace local /images/... paths
 * with Storyblok CDN URLs from the asset map.
 *
 * Usage:  node scripts/update-story-assets.mjs
 *
 * Reads scripts/asset-map.json (produced by upload-assets.mjs) and
 * walks every story in the space, replacing string values that match
 * local image paths with their CDN equivalents.
 *
 * Requires .env with STORYBLOK_SPACE_ID and STORYBLOK_PERSONAL_TOKEN.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const TOKEN = process.env.STORYBLOK_PERSONAL_TOKEN;
const BASE = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`;

const headers = {
  'Content-Type': 'application/json',
  Authorization: TOKEN,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Load asset map
const mapPath = path.resolve('scripts/asset-map.json');
const assetMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

// Add https: prefix to CDN URLs
for (const [key, val] of Object.entries(assetMap)) {
  if (typeof val === 'string' && val.startsWith('//')) {
    assetMap[key] = 'https:' + val;
  }
}

console.log(`Loaded ${Object.keys(assetMap).length} asset mappings.\n`);

let updated = 0;
let skipped = 0;

// Known asset field names (Storyblok requires these as objects, not strings)
const ASSET_FIELDS = new Set([
  'image', 'hero_image', 'preview_image', 'intro_image',
  'therme_image', 'rooms_image', 'popup_image', 'default_og_image',
]);

// Known numeric string fields (Storyblok wants string, migration stored number)
const NUMERIC_STRING_FIELDS = new Set(['sort_order', 'price_from', 'nav_order']);

/** Build a Storyblok asset object from a CDN URL. */
function assetObject(cdnUrl) {
  return {
    id: null,
    alt: '',
    name: '',
    focus: '',
    title: '',
    filename: cdnUrl,
    fieldtype: 'asset',
    is_external_url: false,
  };
}

/**
 * Recursively walk an object/array and:
 * 1. Replace local /images/... strings with Storyblok CDN asset objects
 * 2. Convert number values in numeric-string fields to strings
 * Returns true if any change was made.
 */
function replaceAssetPaths(obj) {
  if (!obj || typeof obj !== 'object') return false;

  let changed = false;

  for (const key of Object.keys(obj)) {
    const val = obj[key];

    if (typeof val === 'string') {
      if (assetMap[val]) {
        if (ASSET_FIELDS.has(key)) {
          obj[key] = assetObject(assetMap[val]);
        } else {
          obj[key] = assetMap[val];
        }
        changed = true;
      } else if (ASSET_FIELDS.has(key)) {
        // Empty or unmatched string in an asset field → convert to empty asset object
        obj[key] = assetObject(val || '');
        changed = true;
      }
    } else if (typeof val === 'number' && NUMERIC_STRING_FIELDS.has(key)) {
      obj[key] = String(val);
      changed = true;
    } else if (typeof val === 'object' && val !== null) {
      // Check if it's a Storyblok asset object with a filename field
      if (val.filename && typeof val.filename === 'string' && assetMap[val.filename]) {
        val.filename = assetMap[val.filename];
        changed = true;
      }
      // Recurse
      if (replaceAssetPaths(val)) {
        changed = true;
      }
    }
  }

  return changed;
}

async function fetchAllStories() {
  const stories = [];
  let page = 1;
  const perPage = 25;

  while (true) {
    await sleep(400);
    const res = await fetch(`${BASE}/stories?per_page=${perPage}&page=${page}`, { headers });
    if (!res.ok) {
      console.error(`Failed to fetch stories page ${page}: ${res.status}`);
      break;
    }
    const data = await res.json();
    stories.push(...data.stories);

    const total = parseInt(res.headers.get('total') || '0', 10);
    if (stories.length >= total || data.stories.length === 0) break;
    page++;
  }

  return stories;
}

async function main() {
  if (!SPACE_ID || !TOKEN) {
    console.error('Missing STORYBLOK_SPACE_ID or STORYBLOK_PERSONAL_TOKEN in .env');
    process.exit(1);
  }

  console.log('Fetching story list...');
  const storyList = await fetchAllStories();
  console.log(`Found ${storyList.length} stories. Fetching full content for each...\n`);

  for (let i = 0; i < storyList.length; i++) {
    const { id, full_slug } = storyList[i];

    // Fetch full story (list endpoint doesn't include content)
    await sleep(400);
    const storyRes = await fetch(`${BASE}/stories/${id}`, { headers });
    if (!storyRes.ok) {
      console.error(`  FAILED to fetch ${full_slug}: ${storyRes.status}`);
      skipped++;
      continue;
    }

    const { story } = await storyRes.json();
    const content = story.content;
    if (!content) {
      skipped++;
      continue;
    }

    const changed = replaceAssetPaths(content);

    if (changed) {
      await sleep(400);
      const res = await fetch(`${BASE}/stories/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          story: {
            content,
          },
        }),
      });

      if (res.ok) {
        updated++;
        console.log(`  [${i + 1}/${storyList.length}] Updated: ${full_slug}`);
      } else {
        const text = await res.text();
        console.error(`  [${i + 1}/${storyList.length}] FAILED to update ${full_slug}: ${res.status} ${text}`);
      }
    } else {
      skipped++;
      process.stdout.write(`  [${i + 1}/${storyList.length}] ${full_slug} — no changes\n`);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped} (no local image paths found)`);
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
