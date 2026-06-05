/**
 * Automated Storyblok content model setup for feelMOOR.
 * Creates all blocks (content types + nestable) via the Management API.
 *
 * Usage:  node scripts/setup-storyblok.mjs
 *
 * Requires .env with:
 *   STORYBLOK_SPACE_ID
 *   STORYBLOK_PERSONAL_TOKEN
 */

import 'dotenv/config';

const SPACE_ID = process.env.STORYBLOK_SPACE_ID;
const TOKEN = process.env.STORYBLOK_PERSONAL_TOKEN;
const BASE = `https://mapi.storyblok.com/v1/spaces/${SPACE_ID}`;

const headers = {
  'Content-Type': 'application/json',
  Authorization: TOKEN,
};

// ── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, body) {
  await sleep(250); // stay under 6 req/s rate limit
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function createBlock(name, schema, opts = {}) {
  const payload = {
    component: {
      name,
      schema,
      is_root: opts.isRoot ?? false,
      is_nestable: opts.isNestable ?? false,
      ...opts.extra,
    },
  };
  console.log(`  Creating block: ${name} (${opts.isRoot ? 'content type' : 'nestable'})...`);
  const result = await api('/components', payload);
  console.log(`    -> id ${result.component.id}`);
  return result.component;
}

// Field helper — keeps the schema definitions compact
function text(displayName, opts = {}) {
  return { type: 'text', display_name: displayName, pos: opts.pos ?? 0, required: opts.required ?? false, translatable: opts.translatable ?? true, ...opts.extra };
}
function textarea(displayName, opts = {}) {
  return { type: 'textarea', display_name: displayName, pos: opts.pos ?? 0, translatable: opts.translatable ?? true, ...opts.extra };
}
function number(displayName, opts = {}) {
  return { type: 'number', display_name: displayName, pos: opts.pos ?? 0, translatable: false, ...opts.extra };
}
function boolean(displayName, opts = {}) {
  return { type: 'boolean', display_name: displayName, pos: opts.pos ?? 0, translatable: false, default_value: opts.default ?? false, ...opts.extra };
}
function asset(displayName, opts = {}) {
  return { type: 'asset', display_name: displayName, pos: opts.pos ?? 0, filetypes: ['images'], translatable: false, ...opts.extra };
}
function richtext(displayName, opts = {}) {
  return { type: 'richtext', display_name: displayName, pos: opts.pos ?? 0, translatable: opts.translatable ?? true, ...opts.extra };
}
function date(displayName, opts = {}) {
  return { type: 'datetime', display_name: displayName, pos: opts.pos ?? 0, translatable: false, ...opts.extra };
}
function blocks(displayName, whitelist, opts = {}) {
  return { type: 'bloks', display_name: displayName, pos: opts.pos ?? 0, restrict_type: 'only', restrict_components: true, component_whitelist: whitelist, ...opts.extra };
}
function singleOption(displayName, options, opts = {}) {
  return {
    type: 'option',
    display_name: displayName,
    pos: opts.pos ?? 0,
    translatable: false,
    source: 'self',
    options: options.map(o => ({ name: o, value: o })),
    ...opts.extra,
  };
}
function tab(displayName, opts = {}) {
  return { type: 'tab', display_name: displayName, pos: opts.pos ?? 0 };
}

// ── nestable blocks ──────────────────────────────────────────────────────────

async function createNestableBlocks() {
  console.log('\n--- Nestable Blocks ---');

  await createBlock('nav_link', {
    label: text('Label', { pos: 0 }),
    href: text('URL', { pos: 1, translatable: false }),
  }, { isNestable: true });

  await createBlock('gallery_item', {
    image: asset('Image', { pos: 0 }),
    alt: text('Alt Text', { pos: 1 }),
  }, { isNestable: true });

  await createBlock('stat_item', {
    value: text('Value', { pos: 0 }),
    label: text('Label', { pos: 1 }),
  }, { isNestable: true });

  await createBlock('pillar_item', {
    number: text('Number (e.g. "01")', { pos: 0, translatable: false }),
    heading: text('Heading', { pos: 1 }),
    body: textarea('Description', { pos: 2 }),
  }, { isNestable: true });

  await createBlock('booking_option', {
    label: text('Label', { pos: 0 }),
    href: text('Booking URL', { pos: 1, translatable: false }),
  }, { isNestable: true });

  await createBlock('pricing_tier', {
    duration: text('Duration', { pos: 0 }),
    price_from: number('Price From', { pos: 1 }),
    price_note: text('Price Note', { pos: 2 }),
    href: text('Booking URL', { pos: 3, translatable: false }),
  }, { isNestable: true });

  await createBlock('highlight_item', {
    title: text('Title', { pos: 0 }),
    text: textarea('Text', { pos: 1 }),
  }, { isNestable: true });

  await createBlock('program_row', {
    treatment: text('Treatment', { pos: 0 }),
    effect: text('Effect', { pos: 1 }),
    values: textarea('Values (one per line)', { pos: 2 }),
  }, { isNestable: true });

  await createBlock('spec_item', {
    label: text('Label', { pos: 0 }),
    value: text('Value', { pos: 1 }),
  }, { isNestable: true });

  await createBlock('feature_group', {
    heading: text('Heading', { pos: 0 }),
    items: textarea('Items (one per line)', { pos: 1 }),
  }, { isNestable: true });

  await createBlock('footer_column', {
    heading: text('Column Heading', { pos: 0 }),
    links: blocks('Links', ['nav_link'], { pos: 1 }),
  }, { isNestable: true });

  await createBlock('section_block', {
    heading: text('Heading', { pos: 0 }),
    subheading: text('Subheading', { pos: 1 }),
    body: richtext('Body', { pos: 2 }),
    image: asset('Image', { pos: 3 }),
    stats: blocks('Stats', ['stat_item'], { pos: 4 }),
    cta_label: text('Button Label', { pos: 5 }),
    cta_href: text('Button Link', { pos: 6, translatable: false }),
  }, { isNestable: true });
}

// ── content type blocks ──────────────────────────────────────────────────────

async function createContentTypes() {
  console.log('\n--- Content Type Blocks ---');

  // ── package ──
  let pos = 0;
  await createBlock('package', {
    tab_main: tab('Main', { pos: pos++ }),
    title: text('Title', { pos: pos++, required: true }),
    subtitle: text('Subtitle', { pos: pos++ }),
    tag: singleOption('Category Tag', [
      'Heilung & Regeneration',
      'Entschlackung & Entgiftung',
      'Entschleunigung & Wellness',
      'Saisonal & Specials',
    ], { pos: pos++ }),
    nights: text('Nights', { pos: pos++ }),
    teaser: textarea('Teaser', { pos: pos++ }),
    image: asset('Image', { pos: pos++ }),
    image_alt: text('Image Alt', { pos: pos++ }),
    price_from: number('Price From', { pos: pos++ }),
    price_label: text('Price Label', { pos: pos++ }),
    availability: text('Availability', { pos: pos++ }),
    availability_note: text('Availability Note', { pos: pos++ }),
    nav_order: number('Nav Order', { pos: pos++ }),
    show_in_nav: boolean('Show in Navigation', { pos: pos++, default: true }),

    tab_content: tab('Content', { pos: pos++ }),
    body: richtext('Body', { pos: pos++ }),
    includes: textarea('Included Items (one per line)', { pos: pos++ }),
    recommendations: textarea('Recommendations (one per line)', { pos: pos++ }),
    closing_heading: text('Closing Heading', { pos: pos++ }),
    closing_body: richtext('Closing Body', { pos: pos++ }),

    tab_booking: tab('Booking & Pricing', { pos: pos++ }),
    booking_options: blocks('Booking Options', ['booking_option'], { pos: pos++ }),
    pricing_tiers: blocks('Pricing Tiers', ['pricing_tier'], { pos: pos++ }),

    tab_features: tab('Features & Program', { pos: pos++ }),
    highlights: blocks('Highlights', ['highlight_item'], { pos: pos++ }),
    program_intro: textarea('Program Intro', { pos: pos++ }),
    program_columns: textarea('Program Columns (one per line)', { pos: pos++ }),
    program_rows: blocks('Program Rows', ['program_row'], { pos: pos++ }),

    tab_gallery: tab('Gallery', { pos: pos++ }),
    gallery: blocks('Gallery', ['gallery_item'], { pos: pos++ }),
  }, { isRoot: true });

  // ── room ──
  pos = 0;
  await createBlock('room', {
    tab_main: tab('Main', { pos: pos++ }),
    name: text('Name', { pos: pos++, required: true }),
    variants: text('Variants', { pos: pos++ }),
    tagline: text('Tagline', { pos: pos++ }),
    size: text('Size', { pos: pos++ }),
    capacity: text('Capacity', { pos: pos++ }),
    highlight: boolean('Highlight', { pos: pos++ }),
    sort_order: number('Sort Order', { pos: pos++ }),

    tab_seo: tab('SEO', { pos: pos++ }),
    seo_title: text('SEO Title', { pos: pos++ }),
    seo_description: textarea('SEO Description', { pos: pos++ }),

    tab_images: tab('Images', { pos: pos++ }),
    hero_image: asset('Hero Image', { pos: pos++ }),
    preview_image: asset('Preview Image', { pos: pos++ }),
    gallery: blocks('Gallery', ['gallery_item'], { pos: pos++ }),

    tab_content: tab('Content', { pos: pos++ }),
    intro_heading: text('Intro Heading', { pos: pos++ }),
    intro_subheading: text('Intro Subheading', { pos: pos++ }),
    body: richtext('Body', { pos: pos++ }),
    specs: blocks('Specs', ['spec_item'], { pos: pos++ }),
    feature_groups: blocks('Feature Groups', ['feature_group'], { pos: pos++ }),
  }, { isRoot: true });

  // ── blog_post ──
  pos = 0;
  await createBlock('blog_post', {
    title: text('Title', { pos: pos++, required: true }),
    seo_title: text('SEO Title', { pos: pos++ }),
    seo_description: textarea('SEO Description', { pos: pos++ }),
    date: date('Date', { pos: pos++ }),
    author: text('Author', { pos: pos++ }),
    category: text('Category', { pos: pos++ }),
    teaser: textarea('Teaser', { pos: pos++ }),
    image: asset('Image', { pos: pos++ }),
    image_alt: text('Image Alt', { pos: pos++ }),
    body: richtext('Body', { pos: pos++ }),
  }, { isRoot: true });

  // ── homepage ──
  pos = 0;
  await createBlock('homepage', {
    tab_seo: tab('SEO', { pos: pos++ }),
    seo_title: text('SEO Title', { pos: pos++ }),
    seo_description: textarea('SEO Description', { pos: pos++ }),

    tab_hero: tab('Hero', { pos: pos++ }),
    hero_image: asset('Hero Image', { pos: pos++ }),
    hero_image_alt: text('Hero Image Alt', { pos: pos++ }),
    hero_caption: text('Caption', { pos: pos++ }),
    hero_headline_line1: text('Headline Line 1', { pos: pos++ }),
    hero_headline_line2: text('Headline Line 2 (italic)', { pos: pos++ }),
    hero_body: textarea('Intro Text', { pos: pos++ }),
    cta_primary_label: text('Primary Button Text', { pos: pos++ }),
    cta_primary_href: text('Primary Button Link', { pos: pos++, translatable: false }),
    cta_secondary_label: text('Secondary Button Text', { pos: pos++ }),
    cta_secondary_href: text('Secondary Button Link', { pos: pos++, translatable: false }),

    tab_popup: tab('Popup Banner', { pos: pos++ }),
    popup_enabled: boolean('Popup Enabled', { pos: pos++ }),
    popup_headline: text('Popup Headline', { pos: pos++ }),
    popup_body: richtext('Popup Body', { pos: pos++ }),
    popup_image: asset('Popup Image', { pos: pos++ }),
    popup_link: text('Popup Link URL', { pos: pos++, translatable: false }),

    tab_pillars: tab('Three Pillars', { pos: pos++ }),
    pillars: blocks('Pillars', ['pillar_item'], { pos: pos++ }),

    tab_packages: tab('Packages Section', { pos: pos++ }),
    packages_section_label: text('Section Label', { pos: pos++ }),
    packages_section_heading: text('Section Heading', { pos: pos++ }),
    packages_section_subheading: text('Section Subheading', { pos: pos++ }),

    tab_rooms: tab('Rooms Section', { pos: pos++ }),
    rooms_heading: text('Heading', { pos: pos++ }),
    rooms_body: textarea('Body', { pos: pos++ }),
    rooms_cta_label: text('Button Text', { pos: pos++ }),
    rooms_cta_href: text('Button Link', { pos: pos++, translatable: false }),
    rooms_image: asset('Image', { pos: pos++ }),

    tab_therme: tab('Therme CTA', { pos: pos++ }),
    therme_heading: text('Heading', { pos: pos++ }),
    therme_body: textarea('Body', { pos: pos++ }),
    therme_image: asset('Image', { pos: pos++ }),
    therme_stats: blocks('Stats', ['stat_item'], { pos: pos++ }),
    therme_cta_label: text('Button Text', { pos: pos++ }),
    therme_cta_href: text('Button Link', { pos: pos++, translatable: false }),

    tab_voucher: tab('Voucher Strip', { pos: pos++ }),
    voucher_heading: text('Heading', { pos: pos++ }),
    voucher_body: textarea('Body', { pos: pos++ }),
    voucher_cta_label: text('Button Text', { pos: pos++ }),
    voucher_cta_href: text('Button Link', { pos: pos++, translatable: false }),
  }, { isRoot: true });

  // ── generic page ──
  pos = 0;
  await createBlock('sb_page', {
    tab_seo: tab('SEO', { pos: pos++ }),
    seo_title: text('SEO Title', { pos: pos++ }),
    seo_description: textarea('SEO Description', { pos: pos++ }),

    tab_hero: tab('Hero', { pos: pos++ }),
    hero_image: asset('Hero Image', { pos: pos++ }),
    hero_caption: text('Caption', { pos: pos++ }),
    hero_heading: text('Heading', { pos: pos++ }),
    hero_intro: textarea('Intro Text', { pos: pos++ }),

    tab_content: tab('Content', { pos: pos++ }),
    intro_heading: text('Intro Heading', { pos: pos++ }),
    intro_subheading: text('Intro Subheading', { pos: pos++ }),
    intro_body: richtext('Intro Body', { pos: pos++ }),
    intro_image: asset('Intro Image', { pos: pos++ }),
    intro_quote: text('Quote', { pos: pos++ }),
    sections: blocks('Additional Sections', ['section_block'], { pos: pos++ }),
  }, { isRoot: true });

  // ── site_settings ──
  pos = 0;
  await createBlock('site_settings', {
    tab_general: tab('General', { pos: pos++ }),
    hotel_name: text('Hotel Name', { pos: pos++ }),
    tagline: text('Tagline', { pos: pos++ }),
    copyright_name: text('Copyright Name', { pos: pos++ }),
    default_og_image: asset('Default OG Image', { pos: pos++ }),

    tab_contact: tab('Contact', { pos: pos++ }),
    address_street: text('Street', { pos: pos++, translatable: false }),
    address_zip_city: text('ZIP + City', { pos: pos++, translatable: false }),
    phone_display: text('Phone (Display)', { pos: pos++, translatable: false }),
    phone_link: text('Phone (Link)', { pos: pos++, translatable: false }),
    email: text('Email', { pos: pos++, translatable: false }),

    tab_footer: tab('Footer', { pos: pos++ }),
    footer_columns: blocks('Footer Columns', ['footer_column'], { pos: pos++ }),
  }, { isRoot: true });
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Setting up Storyblok content models for space ${SPACE_ID}...\n`);

  if (!SPACE_ID || !TOKEN) {
    console.error('Missing STORYBLOK_SPACE_ID or STORYBLOK_PERSONAL_TOKEN in .env');
    process.exit(1);
  }

  // Delete the default "page" block that comes with new spaces
  console.log('Cleaning up default blocks...');
  try {
    const res = await fetch(`${BASE}/components`, { headers });
    const { components } = await res.json();
    for (const c of components) {
      if (['page', 'feature', 'grid', 'teaser'].includes(c.name)) {
        console.log(`  Deleting default block: ${c.name}`);
        await fetch(`${BASE}/components/${c.id}`, { method: 'DELETE', headers });
      }
    }
  } catch (e) {
    console.warn('Could not clean up defaults:', e.message);
  }

  // Create nestable blocks first (content types reference them)
  await createNestableBlocks();

  // Then content types
  await createContentTypes();

  console.log('\nDone! All content models created.');
  console.log('Go to Storyblok > Block Library to verify.');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
