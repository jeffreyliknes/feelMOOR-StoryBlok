// One-time migration: src/content/** -> Storyblok stories, referenced images -> assets.
// Idempotent: re-runs update existing stories and reuse the asset manifest.
// Run: node scripts/storyblok/migrate-content.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import * as yaml from 'js-yaml';
import mdrt from 'storyblok-markdown-richtext';
const { markdownToRichtext } = mdrt;
import { mapi } from './lib.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const MANIFEST = join(ROOT, 'scripts/storyblok/.assets-map.json');

// ---- page registry: json file -> content type, story slug, real URL path ----
const sub = (slug, path) => ({ type: 'subpage', slug, path });
const PAGES = {
  'homepage': { type: 'homepage', slug: 'home', path: '/' },
  'homepage-en': { type: 'homepage', slug: 'home-en', path: '/en/' },
  'hotel': { type: 'page_hotel', slug: 'hotel', path: '/hotel/' },
  'therme': { type: 'page_therme', slug: 'therme', path: '/therme/' },
  'gesundheit': { type: 'page_gesundheit', slug: 'gesundheit', path: '/gesundheit/' },
  'kulinarik': { type: 'page_kulinarik', slug: 'kulinarik', path: '/kulinarik/' },
  'allgaeu': { type: 'page_allgaeu', slug: 'allgaeu', path: '/allgaeu/' },
  'gutscheine': { type: 'page_gutscheine', slug: 'gutscheine', path: '/gutscheine/' },
  'angebote': sub('angebote', '/angebote/'),
  'fitness': sub('fitness', '/fitness/'),
  'fitness-kurse': sub('fitness-kurse', '/fitness/kurse/'),
  'fitness-mitgliedschaften': sub('fitness-mitgliedschaften', '/fitness/mitgliedschaften/'),
  'fitness-studio': sub('fitness-studio', '/fitness/fitnessstudio/'),
  'gesundheit-aerzte': sub('gesundheit-aerzte', '/gesundheit/aerzte-therapeuten/'),
  'gesundheit-anwendungen': sub('gesundheit-anwendungen', '/gesundheit/anwendungen/'),
  'gesundheit-moorbad': sub('gesundheit-moorbad', '/gesundheit/moorbad/'),
  'jobs': sub('jobs', '/jobs/'),
  'news': sub('news', '/news/'),
  'newsletter': sub('newsletter', '/newsletter/'),
  'oeffnungszeiten': sub('oeffnungszeiten', '/oeffnungszeiten/'),
  'therme-preise': sub('therme-preise', '/therme/preise/'),
  'therme-sauna': sub('therme-sauna', '/therme/sauna/'),
  'therme-thermalbad': sub('therme-thermalbad', '/therme/thermalbad/'),
  'therme-wellness': sub('therme-wellness', '/therme/wellness/'),
  'allgaeu-action-adrenalin': { type: 'page_allgaeu_action', slug: 'allgaeu-action-adrenalin', path: '/allgaeu/action-adrenalin/' },
  'allgaeu-aktiv-sein': { type: 'page_allgaeu_aktiv', slug: 'allgaeu-aktiv-sein', path: '/allgaeu/aktiv-sein/' },
  'allgaeu-ausflugsziele': { type: 'page_allgaeu_ausflug', slug: 'allgaeu-ausflugsziele', path: '/allgaeu/ausflugsziele/' },
  'hotel-resort-uebersicht': { type: 'page_hotel_uebersicht', slug: 'hotel-resort-uebersicht', path: '/hotel/resort-uebersicht/' },
  'kulinarik-vitalkueche': { type: 'page_vitalkueche', slug: 'kulinarik-vitalkueche', path: '/kulinarik/vitalkueche/' },
  'nachhaltigkeit': { type: 'page_nachhaltigkeit', slug: 'nachhaltigkeit', path: '/nachhaltigkeit/' },
  'rooms-overview': { type: 'page_rooms_overview', slug: 'rooms-overview', path: '/zimmer/' },
  'service-kontakt': { type: 'page_service_kontakt', slug: 'service-kontakt', path: '/service-kontakt/' },
  'impressum': { type: 'page_impressum', slug: 'impressum', path: '/impressum/' },
  'datenschutz': { type: 'page_datenschutz', slug: 'datenschutz', path: '/datenschutz/' },
};

// which fields hold bloks, per component (content types and nested bloks)
const BLOK_OF = {
  homepage: {
    hero: 'hero', pillars: 'pillar', packages_section: 'packages_section',
    rooms_section: 'rooms_section', therme_cta: 'therme_cta',
    voucher_strip: 'voucher_strip', popup: 'popup',
  },
  page_kulinarik: { venues: 'venue', buffet_items: 'buffet_item' },
  page_allgaeu: { activities: 'activity_card', features: 'feature_section' },
  page_gutscheine: { categories: 'voucher_category' },
  page_allgaeu_action: { activities: 'action_activity' },
  page_allgaeu_aktiv: { sections: 'aktiv_section' },
  page_allgaeu_ausflug: { excursions: 'excursion' },
  page_hotel_uebersicht: { facility_sections: 'facility_section' },
  page_nachhaltigkeit: { initiatives: 'initiative' },
  room: { gallery: 'gallery_item', specs: 'spec', feature_groups: 'feature_group' },
  package: {
    booking_options: 'link', pricing_tiers: 'pricing_tier', highlights: 'highlight_card',
    points_catalog: 'points_row', program_rows: 'program_row', gallery: 'gallery_item',
  },
  site_settings: { header_nav_links: 'nav_link', footer_columns: 'footer_column' },
  feature_section: { links: 'link' },
  footer_column: { links: 'link' },
};

// ---- assets ----
const assetMap = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

async function assetUrl(localPath) {
  if (assetMap[localPath]) return assetMap[localPath];
  const file = join(ROOT, 'public', localPath);
  if (!existsSync(file)) {
    console.warn(`  ! missing image on disk, keeping path: ${localPath}`);
    return localPath;
  }
  const buf = readFileSync(file);
  const signed = await mapi('POST', '/assets/', { filename: basename(localPath) });
  const form = new FormData();
  for (const [k, v] of Object.entries(signed.fields)) form.append(k, v);
  form.append('file', new Blob([buf]), basename(localPath));
  const up = await fetch(signed.post_url, { method: 'POST', body: form });
  if (!up.ok && up.status !== 201 && up.status !== 204) {
    throw new Error(`S3 upload failed for ${localPath}: ${up.status}`);
  }
  const fin = await mapi('GET', `/assets/${signed.id}/finish_upload`);
  const url = fin?.filename || `https://a.storyblok.com/${signed.fields.key}`;
  assetMap[localPath] = url;
  writeFileSync(MANIFEST, JSON.stringify(assetMap, null, 2));
  console.log(`  uploaded ${localPath}`);
  return url;
}

const asset = (url) => ({ fieldtype: 'asset', filename: url, alt: '' });

// ---- transform ----
async function tx(obj, component) {
  const blokMap = BLOK_OF[component] || {};
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (key === 'body' && component !== 'homepage' && typeof value === 'string' && ['room', 'package', 'article'].includes(component)) {
      out[key] = markdownToRichtext(value);
    } else if (typeof value === 'string') {
      out[key] = value.startsWith('/images/') ? asset(await assetUrl(value)) : value;
    } else if (Array.isArray(value)) {
      if (value.every((v) => typeof v === 'string')) {
        out[key] = value.join('\n');
      } else if (blokMap[key]) {
        out[key] = [];
        for (const item of value) out[key].push({ component: blokMap[key], ...(await tx(item, blokMap[key])) });
      } else if (value.every((v) => v && typeof v === 'object' && Object.keys(v).join() === 'label')) {
        out[key] = value.map((v) => v.label).join('\n'); // rooms-overview amenities
      } else {
        throw new Error(`unmapped object list "${key}" in ${component}`);
      }
    } else if (typeof value === 'object') {
      if (key === 'pillars' && component === 'homepage') {
        out[key] = [];
        for (const p of Object.values(value)) out[key].push({ component: 'pillar', ...(await tx(p, 'pillar')) });
      } else if (blokMap[key]) {
        out[key] = [{ component: blokMap[key], ...(await tx(value, blokMap[key])) }];
      } else {
        throw new Error(`unmapped object "${key}" in ${component}`);
      }
    } else {
      out[key] = value; // number / boolean
    }
  }
  return out;
}

// ---- markdown files ----
function parseMd(file) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const data = yaml.load(m[1]) || {};
  const body = m[2].trim();
  if (body) data.body = body;
  return data;
}

// ---- stories ----
const existing = new Map();
for (let page = 1; ; page++) {
  const res = await mapi('GET', `/stories/?per_page=100&page=${page}`);
  res.stories.forEach((s) => existing.set(s.full_slug, s));
  if (res.stories.length < 100) break;
}

async function folderId(slug, name) {
  if (existing.has(slug)) return existing.get(slug).id;
  const res = await mapi('POST', '/stories/', { story: { name, slug, is_folder: true } });
  existing.set(slug, res.story);
  console.log(`folder   ${slug}/`);
  return res.story.id;
}

async function upsert({ name, slug, parent_id, full_slug, content, path }) {
  const story = { name, slug, parent_id, content, path };
  const prev = existing.get(full_slug);
  if (prev) {
    await mapi('PUT', `/stories/${prev.id}`, { story, publish: 1 });
    console.log(`updated  ${full_slug}`);
  } else {
    await mapi('POST', '/stories/', { story, publish: 1 });
    console.log(`created  ${full_slug}`);
  }
}

const pagesFolder = await folderId('pages', 'Pages');
const roomsFolder = await folderId('rooms', 'Rooms');
const packagesFolder = await folderId('packages', 'Packages');
const blogFolder = await folderId('blog', 'Blog');

// pages
for (const [file, { type, slug, path }] of Object.entries(PAGES)) {
  const data = JSON.parse(readFileSync(join(ROOT, `src/content/pages/${file}.json`), 'utf8'));
  const content = { component: type, ...(await tx(data, type)) };
  const name = data.hero_heading || data.heading || data.hero?.headline_line1 || slug;
  await upsert({ name, slug, parent_id: pagesFolder, full_slug: `pages/${slug}`, content, path });
}

// collections
const collections = [
  { dir: 'rooms', type: 'room', folder: roomsFolder, prefix: 'rooms', pathOf: (s) => `/zimmer/${s}/`, nameOf: (d) => d.name },
  { dir: 'packages', type: 'package', folder: packagesFolder, prefix: 'packages', pathOf: (s) => `/angebote/${s}/`, nameOf: (d) => d.title },
  { dir: 'blog', type: 'article', folder: blogFolder, prefix: 'blog', pathOf: (s) => `/blog/${s}/`, nameOf: (d) => d.title },
];
for (const { dir, type, folder, prefix, pathOf, nameOf } of collections) {
  for (const f of readdirSync(join(ROOT, `src/content/${dir}`)).filter((f) => f.endsWith('.md'))) {
    const slug = f.replace(/\.md$/, '');
    const data = parseMd(join(ROOT, `src/content/${dir}`, f));
    const content = { component: type, ...(await tx(data, type)) };
    await upsert({ name: nameOf(data) || slug, slug, parent_id: folder, full_slug: `${prefix}/${slug}`, content, path: pathOf(slug) });
  }
}

// settings
const site = JSON.parse(readFileSync(join(ROOT, 'src/content/settings/site.json'), 'utf8'));
await upsert({
  name: 'Site Settings', slug: 'site-settings', parent_id: 0,
  full_slug: 'site-settings',
  content: { component: 'site_settings', ...(await tx(site, 'site_settings')) },
  path: '/',
});

console.log('\nMigration complete.');
