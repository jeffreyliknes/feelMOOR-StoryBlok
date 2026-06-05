/**
 * Migrate all local content (JSON pages, Markdown collections) into Storyblok.
 *
 * Usage:  node scripts/migrate-content.mjs
 *
 * Reads every file in src/content/ and pushes it to Storyblok via the
 * Management API.  Requires .env with STORYBLOK_SPACE_ID and
 * STORYBLOK_PERSONAL_TOKEN.
 *
 * Safe to re-run: creates stories with `publish: 0` (draft) so you can
 * review in the Storyblok UI before publishing.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pkg from 'storyblok-markdown-richtext';
const { markdownToRichtext } = pkg;

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const TOKEN = process.env.STORYBLOK_PERSONAL_TOKEN;
const BASE = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`;
const CONTENT = path.resolve('src/content');

const headers = {
  'Content-Type': 'application/json',
  Authorization: TOKEN,
};

// ── helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, apiPath, body) {
  await sleep(400); // stay under 3 req/s rate limit
  const url = `${BASE}${apiPath}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${apiPath} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

  // Simple YAML frontmatter parser (handles our subset)
  const fm = parseYaml(match[1]);
  const body = match[2].trim();
  return { frontmatter: fm, body };
}

/**
 * Minimal YAML parser sufficient for our frontmatter.
 * Handles: scalars, arrays of scalars, arrays of objects (2-level).
 */
function parseYaml(yamlStr) {
  const result = {};
  const lines = yamlStr.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) { i++; continue; }

    // Top-level key: value
    const kvMatch = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
    if (!kvMatch) { i++; continue; }

    const key = kvMatch[1];
    let value = kvMatch[2].trim();

    // Check if next line starts an array
    if ((!value || value === '') && i + 1 < lines.length && lines[i + 1]?.match(/^\s+-/)) {
      // Array
      const arr = [];
      i++;
      while (i < lines.length && lines[i].match(/^\s+-/)) {
        const itemLine = lines[i];
        const itemMatch = itemLine.match(/^\s+-\s+(.*)$/);
        if (itemMatch) {
          let itemVal = itemMatch[1].trim();
          // Check if this is an object item (key: value on same line)
          const objMatch = itemVal.match(/^(\w[\w_]*)\s*:\s*(.*)$/);
          if (objMatch) {
            // Object item — read subsequent indented key: value lines
            const obj = {};
            obj[objMatch[1]] = unquote(objMatch[2]);
            i++;
            while (i < lines.length) {
              const subLine = lines[i];
              const subMatch = subLine.match(/^\s{4,}(\w[\w_]*)\s*:\s*(.*)$/);
              if (subMatch) {
                obj[subMatch[1]] = unquote(subMatch[2]);
                i++;
              } else {
                break;
              }
            }
            arr.push(obj);
            continue;
          } else {
            arr.push(unquote(itemVal));
          }
        }
        i++;
      }
      result[key] = arr;
      continue;
    }

    // Multiline string (|)
    if (value === '|') {
      const multiLines = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
        multiLines.push(lines[i].replace(/^  /, ''));
        i++;
      }
      result[key] = multiLines.join('\n').trim();
      continue;
    }

    // Simple scalar
    result[key] = unquote(value);
    i++;
  }

  return result;
}

function unquote(s) {
  if (!s) return '';
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^\d+$/.test(s)) return Number(s);
  return s;
}

function mdToRichtext(markdown) {
  if (!markdown) return undefined;
  try {
    return markdownToRichtext(markdown);
  } catch {
    return undefined;
  }
}

/** Generate a UUID-like _uid for nestable blocks. */
function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

function blok(component, fields) {
  return { _uid: uid(), component, ...fields };
}

// ── story creation ──────────────────────────────────────────────────────────

async function createStory(name, slug, parentId, component, content) {
  const payload = {
    story: {
      name,
      slug,
      content: { component, ...content },
    },
    publish: 0,
  };
  if (parentId) payload.story.parent_id = parentId;

  console.log(`  Creating story: ${slug} (${component})...`);
  try {
    const result = await api('POST', '/stories', payload);
    console.log(`    -> id ${result.story.id}`);
    return result.story;
  } catch (err) {
    if (err.message.includes('422') && err.message.includes('slug')) {
      console.log(`    -> SKIPPED (slug already exists)`);
      return null;
    }
    throw err;
  }
}

async function createFolder(name, slug, parentId) {
  const payload = {
    story: {
      name,
      slug,
      is_folder: true,
    },
  };
  if (parentId) payload.story.parent_id = parentId;

  console.log(`  Creating folder: ${slug}...`);
  try {
    const result = await api('POST', '/stories', payload);
    console.log(`    -> folder id ${result.story.id}`);
    return result.story.id;
  } catch (err) {
    if (err.message.includes('422')) {
      console.log(`    -> Folder may already exist, looking up...`);
      // Look up existing folder
      const list = await api('GET', `/stories?with_slug=${slug}&is_folder=true`);
      const existing = list?.stories?.find((s) => s.slug === slug && s.is_folder);
      if (existing) {
        console.log(`    -> found existing folder id ${existing.id}`);
        return existing.id;
      }
    }
    throw err;
  }
}

// ── content transformers ────────────────────────────────────────────────────

function transformHomepage(json) {
  const pillars = [];
  for (const key of ['moorheilbad', 'therme', 'nature']) {
    const p = json.pillars[key];
    if (p) {
      pillars.push(blok('pillar_item', {
        number: p.number,
        heading: p.heading,
        body: p.body,
      }));
    }
  }

  const thermeStats = [];
  const tc = json.therme_cta;
  if (tc.stat_1_value) thermeStats.push(blok('stat_item', { value: tc.stat_1_value, label: tc.stat_1_label }));
  if (tc.stat_2_value) thermeStats.push(blok('stat_item', { value: tc.stat_2_value, label: tc.stat_2_label }));
  if (tc.stat_3_value) thermeStats.push(blok('stat_item', { value: tc.stat_3_value, label: tc.stat_3_label }));

  return {
    seo_title: json.seo_title ?? '',
    seo_description: json.seo_description ?? '',
    hero_image: json.hero.image ?? '',
    hero_image_alt: json.hero.image_alt ?? '',
    hero_caption: json.hero.caption ?? '',
    hero_headline_line1: json.hero.headline_line1 ?? '',
    hero_headline_line2: json.hero.headline_line2 ?? '',
    hero_body: json.hero.body ?? '',
    cta_primary_label: json.hero.cta_primary_label ?? '',
    cta_primary_href: json.hero.cta_primary_href ?? '',
    cta_secondary_label: json.hero.cta_secondary_label ?? '',
    cta_secondary_href: json.hero.cta_secondary_href ?? '',
    pillars,
    packages_section_label: json.packages_section?.caption ?? '',
    packages_section_heading: json.packages_section?.heading ?? '',
    packages_section_subheading: json.packages_section?.all_link_label ?? '',
    rooms_heading: json.rooms_section?.heading ?? '',
    rooms_body: json.rooms_section?.body ?? '',
    rooms_cta_label: json.rooms_section?.all_link_label ?? '',
    rooms_image: json.rooms_section?.featured_image ?? '',
    therme_heading: tc.heading ?? '',
    therme_body: tc.body ?? '',
    therme_image: tc.background_image ?? '',
    therme_stats: thermeStats,
    therme_cta_label: tc.cta_primary_label ?? '',
    voucher_heading: json.voucher_strip?.heading ?? '',
    voucher_body: json.voucher_strip?.subheading ?? '',
  };
}

function transformSbPage(json) {
  // Build sections array if the JSON has stat fields (like therme.json)
  const sections = [];

  // Some pages have stats at the top level
  const hasStats = json.stat_1_value || json.stat_2_value || json.stat_3_value;
  if (hasStats) {
    const stats = [];
    if (json.stat_1_value) stats.push(blok('stat_item', { value: json.stat_1_value, label: json.stat_1_label }));
    if (json.stat_2_value) stats.push(blok('stat_item', { value: json.stat_2_value, label: json.stat_2_label }));
    if (json.stat_3_value) stats.push(blok('stat_item', { value: json.stat_3_value, label: json.stat_3_label }));
    sections.push(blok('section_block', {
      heading: '',
      subheading: '',
      stats,
    }));
  }

  return {
    seo_title: json.seo_title ?? '',
    seo_description: json.seo_description ?? '',
    hero_image: json.hero_image ?? '',
    hero_caption: json.hero_caption ?? '',
    hero_heading: json.hero_heading ?? json.heading ?? '',
    hero_intro: json.hero_intro ?? '',
    intro_heading: json.intro_heading ?? '',
    intro_subheading: json.intro_subheading ?? '',
    intro_body: json.intro_body ? mdToRichtext(json.intro_body) : undefined,
    intro_image: json.intro_image ?? '',
    intro_quote: json.intro_quote ?? '',
    sections: sections.length > 0 ? sections : undefined,
  };
}

function transformSiteSettings(json) {
  const footerColumns = (json.footer_columns ?? []).map((col) =>
    blok('footer_column', {
      heading: col.heading,
      links: (col.links ?? []).map((link) =>
        blok('nav_link', { label: link.label, href: link.href })
      ),
    })
  );

  return {
    hotel_name: json.hotel_name ?? '',
    tagline: json.tagline ?? '',
    copyright_name: json.copyright_name ?? '',
    address_street: json.address_street ?? '',
    address_zip_city: json.address_zip_city ?? '',
    phone_display: json.phone_display ?? '',
    phone_link: json.phone_link ?? '',
    email: json.email ?? '',
    footer_columns: footerColumns,
  };
}

function transformPackage(fm, body) {
  const bookingOptions = (fm.booking_options ?? []).map((opt) =>
    blok('booking_option', { label: opt.label ?? '', href: opt.href ?? '' })
  );
  const pricingTiers = (fm.pricing_tiers ?? []).map((t) =>
    blok('pricing_tier', {
      duration: t.duration ?? '',
      price_from: t.price_from ?? '',
      price_note: t.price_note ?? '',
      href: t.href ?? '',
    })
  );
  const highlights = (fm.highlights ?? []).map((h) =>
    blok('highlight_item', { title: h.title ?? '', text: h.text ?? '' })
  );
  const programRows = (fm.program_rows ?? []).map((r) =>
    blok('program_row', {
      treatment: r.treatment ?? '',
      effect: r.effect ?? '',
      values: Array.isArray(r.values) ? r.values.join('\n') : (r.values ?? ''),
    })
  );
  const gallery = (fm.gallery ?? []).map((g) =>
    blok('gallery_item', { image: g.image ?? '', alt: g.alt ?? g.caption ?? '' })
  );

  return {
    title: fm.title ?? '',
    subtitle: fm.subtitle ?? '',
    tag: fm.tag ?? '',
    nights: fm.nights ?? '',
    teaser: fm.teaser ?? '',
    image: fm.image ?? '',
    image_alt: fm.image_alt ?? '',
    price_from: fm.price_from ?? '',
    price_label: fm.price_label ?? '',
    availability: fm.availability ?? '',
    availability_note: fm.availability_note ?? '',
    nav_order: fm.nav_order ?? '',
    show_in_nav: fm.show_in_nav !== false,
    body: body ? mdToRichtext(body) : undefined,
    includes: Array.isArray(fm.includes) ? fm.includes.join('\n') : (fm.includes ?? ''),
    inclusion_note: fm.inclusion_note ?? '',
    recommendations: Array.isArray(fm.recommendations) ? fm.recommendations.join('\n') : '',
    closing_heading: fm.closing_heading ?? '',
    closing_body: fm.closing_body ? mdToRichtext(fm.closing_body) : undefined,
    booking_options: bookingOptions,
    pricing_tiers: pricingTiers,
    highlights,
    program_intro: fm.program_intro ?? '',
    program_columns: Array.isArray(fm.program_columns) ? fm.program_columns.join('\n') : '',
    program_rows: programRows,
    gallery,
  };
}

function transformRoom(fm, body) {
  const gallery = (fm.gallery ?? []).map((g) =>
    blok('gallery_item', { image: g.image ?? '', alt: g.caption ?? g.alt ?? '' })
  );
  const specs = (fm.specs ?? []).map((s) =>
    blok('spec_item', { label: s.label ?? '', value: s.value ?? '' })
  );
  const featureGroups = (fm.feature_groups ?? []).map((fg) =>
    blok('feature_group', {
      heading: fg.heading ?? '',
      items: Array.isArray(fg.items) ? fg.items.join('\n') : (fg.items ?? ''),
    })
  );

  return {
    name: fm.name ?? '',
    variants: fm.variants ?? '',
    tagline: fm.tagline ?? '',
    size: fm.size ?? '',
    capacity: fm.capacity ?? '',
    highlight: fm.highlight ?? false,
    sort_order: fm.sort_order ?? 99,
    seo_title: fm.seo_title ?? '',
    seo_description: fm.seo_description ?? '',
    hero_image: fm.hero_image ?? '',
    preview_image: fm.preview_image ?? '',
    gallery,
    intro_heading: fm.intro_heading ?? '',
    intro_subheading: fm.intro_subheading ?? '',
    body: body ? mdToRichtext(body) : undefined,
    specs,
    feature_groups: featureGroups,
  };
}

function transformBlogPost(fm, body) {
  return {
    title: fm.title ?? '',
    seo_title: fm.seo_title ?? '',
    seo_description: fm.seo_description ?? '',
    date: fm.date ?? '',
    author: fm.author ?? '',
    category: fm.category ?? '',
    teaser: fm.teaser ?? '',
    image: fm.image ?? '',
    image_alt: fm.image_alt ?? '',
    body: body ? mdToRichtext(body) : undefined,
  };
}

// ── slug mapping for JSON pages ─────────────────────────────────────────────

/**
 * Maps JSON filename (without .json) to Storyblok slug.
 * Files in sub-folders (therme/sauna) use the Storyblok folder structure.
 */
const PAGE_SLUG_MAP = {
  // Top-level pages
  'hotel': { slug: 'hotel', name: 'Hotel & Resort' },
  'allgaeu': { slug: 'allgaeu', name: 'Allgäu' },
  'kulinarik': { slug: 'kulinarik', name: 'Kulinarik' },
  'nachhaltigkeit': { slug: 'nachhaltigkeit', name: 'Nachhaltigkeit' },
  'gutscheine': { slug: 'gutscheine', name: 'Gutscheine' },
  'jobs': { slug: 'jobs', name: 'Jobs & Karriere' },
  'newsletter': { slug: 'newsletter', name: 'Newsletter' },
  'oeffnungszeiten': { slug: 'oeffnungszeiten', name: 'Öffnungszeiten' },
  'service-kontakt': { slug: 'service-kontakt', name: 'Service & Kontakt' },
  'news': { slug: 'news', name: 'News & Blog' },
  'impressum': { slug: 'impressum', name: 'Impressum' },
  'datenschutz': { slug: 'datenschutz', name: 'Datenschutz' },

  // Angebote overview
  'angebote': { slug: 'angebote', name: 'Angebote', folder: null },

  // Zimmer overview
  'rooms-overview': { slug: 'zimmer', name: 'Zimmer & Suiten', folder: null },

  // Therme pages → therme/ folder
  'therme': { slug: 'therme', name: 'Therme', folder: 'therme', isIndex: true },
  'therme-thermalbad': { slug: 'thermalbad', name: 'Thermalbad', folder: 'therme' },
  'therme-sauna': { slug: 'sauna', name: 'Sauna', folder: 'therme' },
  'therme-wellness': { slug: 'wellness', name: 'Wellness', folder: 'therme' },
  'therme-preise': { slug: 'preise', name: 'Preise & Öffnungszeiten', folder: 'therme' },

  // Gesundheit pages → gesundheit/ folder
  'gesundheit': { slug: 'gesundheit', name: 'Gesundheit', folder: 'gesundheit', isIndex: true },
  'gesundheit-moorbad': { slug: 'moorbad', name: 'Moorbad', folder: 'gesundheit' },
  'gesundheit-anwendungen': { slug: 'anwendungen', name: 'Anwendungen', folder: 'gesundheit' },
  'gesundheit-aerzte': { slug: 'aerzte-therapeuten', name: 'Ärzte & Therapeuten', folder: 'gesundheit' },

  // Fitness pages → fitness/ folder
  'fitness': { slug: 'fitness', name: 'Fitness', folder: 'fitness', isIndex: true },
  'fitness-studio': { slug: 'fitnessstudio', name: 'Fitnessstudio', folder: 'fitness' },
  'fitness-kurse': { slug: 'kurse', name: 'Kurse', folder: 'fitness' },
  'fitness-mitgliedschaften': { slug: 'mitgliedschaften', name: 'Mitgliedschaften', folder: 'fitness' },
};

// ── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nMigrating content to Storyblok space ${SPACE_ID}...\n`);

  if (!SPACE_ID || !TOKEN) {
    console.error('Missing STORYBLOK_SPACE_ID or STORYBLOK_PERSONAL_TOKEN in .env');
    process.exit(1);
  }

  // ── 1. Create folders ──
  console.log('=== Creating folders ===');
  const folderIds = {};

  for (const folderSlug of ['therme', 'gesundheit', 'fitness', 'zimmer', 'angebote', 'blog']) {
    folderIds[folderSlug] = await createFolder(
      folderSlug.charAt(0).toUpperCase() + folderSlug.slice(1),
      folderSlug,
      null
    );
  }

  // ── 2. Homepage ──
  console.log('\n=== Homepage ===');
  const hpJson = readJson(path.join(CONTENT, 'pages/homepage.json'));
  await createStory('Homepage', 'home', null, 'homepage', transformHomepage(hpJson));

  // ── 3. Site Settings ──
  console.log('\n=== Site Settings ===');
  const siteJson = readJson(path.join(CONTENT, 'settings/site.json'));
  await createStory('Site Settings', 'site-settings', null, 'site_settings', transformSiteSettings(siteJson));

  // ── 4. Static pages (sb_page) ──
  console.log('\n=== Static Pages ===');
  for (const [filename, config] of Object.entries(PAGE_SLUG_MAP)) {
    const filePath = path.join(CONTENT, `pages/${filename}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP ${filename}.json (file not found)`);
      continue;
    }

    const json = readJson(filePath);
    const content = transformSbPage(json);
    const parentId = config.folder ? folderIds[config.folder] : null;

    // For folder index pages, the slug needs to match the folder name
    // and be placed inside the folder
    if (config.isIndex) {
      // Index stories are sometimes the folder itself in Storyblok.
      // We set is_startpage: true inside the folder.
      const payload = {
        story: {
          name: config.name,
          slug: config.slug,
          parent_id: parentId,
          content: { component: 'sb_page', ...content },
          is_startpage: true,
        },
        publish: 0,
      };
      console.log(`  Creating story: ${config.slug} (sb_page, startpage)...`);
      try {
        const result = await api('POST', '/stories', payload);
        console.log(`    -> id ${result.story.id}`);
      } catch (err) {
        if (err.message.includes('422')) {
          console.log(`    -> SKIPPED (already exists)`);
        } else {
          throw err;
        }
      }
    } else {
      await createStory(config.name, config.slug, parentId, 'sb_page', content);
    }
  }

  // ── 5. Packages (Markdown) ──
  console.log('\n=== Packages ===');
  const pkgDir = path.join(CONTENT, 'packages');
  const pkgFiles = fs.readdirSync(pkgDir).filter((f) => f.endsWith('.md'));

  for (const file of pkgFiles) {
    const slug = file.replace('.md', '');
    const { frontmatter, body } = readMarkdown(path.join(pkgDir, file));
    const content = transformPackage(frontmatter, body);
    await createStory(
      frontmatter.title || slug,
      slug,
      folderIds.angebote,
      'package',
      content
    );
  }

  // ── 6. Rooms (Markdown) ──
  console.log('\n=== Rooms ===');
  const roomDir = path.join(CONTENT, 'rooms');
  const roomFiles = fs.readdirSync(roomDir).filter((f) => f.endsWith('.md'));

  for (const file of roomFiles) {
    const slug = file.replace('.md', '');
    const { frontmatter, body } = readMarkdown(path.join(roomDir, file));
    const content = transformRoom(frontmatter, body);
    await createStory(
      frontmatter.name || slug,
      slug,
      folderIds.zimmer,
      'room',
      content
    );
  }

  // ── 7. Blog Posts (Markdown) ──
  console.log('\n=== Blog Posts ===');
  const blogDir = path.join(CONTENT, 'blog');
  const blogFiles = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));

  for (const file of blogFiles) {
    const slug = file.replace('.md', '');
    const { frontmatter, body } = readMarkdown(path.join(blogDir, file));
    const content = transformBlogPost(frontmatter, body);
    await createStory(
      frontmatter.title || slug,
      slug,
      folderIds.blog,
      'blog_post',
      content
    );
  }

  console.log('\n=== Migration complete! ===');
  console.log('All stories created as DRAFTS. Review in Storyblok and publish when ready.');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
