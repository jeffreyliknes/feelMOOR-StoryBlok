/**
 * Storyblok fetch helpers for feelMOOR.
 *
 * Provides typed functions that fetch stories from the Storyblok CDN API
 * and transform them into the shapes that existing page templates expect.
 */

import { useStoryblokApi, renderRichText } from '@storyblok/astro';

const api = useStoryblokApi();

// ── generic helpers ─────────────────────────────────────────────────────────

/** Extract the URL string from a Storyblok asset field (or return fallback). */
export function assetUrl(field: any, fallback = ''): string {
  if (!field) return fallback;
  if (typeof field === 'string') return field;
  return field.filename ?? fallback;
}

/** Strip Storyblok internal keys (_uid, component) from a nestable block. */
function cleanBlock(block: any): any {
  if (!block || typeof block !== 'object') return block;
  const { _uid, component, ...rest } = block;
  return rest;
}

/** Convert a blocks (bloks) array, stripping internal keys from each item. */
export function cleanBlocks(blocks: any[] | undefined): any[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map(cleanBlock);
}

/** Split a textarea "one item per line" field into a string array. */
export function splitLines(field: string | undefined): string[] {
  if (!field) return [];
  return field.split('\n').map((s) => s.trim()).filter(Boolean);
}

/** Convert richtext field to HTML string. Returns empty string if empty. */
export function richTextHtml(field: any): string {
  if (!field) return '';
  return renderRichText(field) ?? '';
}

// ── story fetchers ──────────────────────────────────────────────────────────

/**
 * Fetch a single story by its full slug.
 * Returns the story content (story.content) or null if not found.
 */
export async function fetchStory(slug: string) {
  try {
    const { data } = await api.get('cdn/stories/' + slug, {
      version: 'published',
    });
    return data?.story ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch all stories matching a content type (by_slugs starts_with a folder,
 * or filter by component).
 */
export async function fetchStories(
  startsWith: string,
  opts: { contentType?: string; sortBy?: string; perPage?: number } = {}
) {
  try {
    const params: Record<string, any> = {
      version: 'published',
      starts_with: startsWith,
      per_page: opts.perPage ?? 100,
    };
    if (opts.contentType) {
      params.filter_query = {
        component: { in: opts.contentType },
      };
    }
    if (opts.sortBy) {
      params.sort_by = opts.sortBy;
    }

    const { data } = await api.get('cdn/stories', params);
    return data?.stories ?? [];
  } catch {
    return [];
  }
}

// ── domain-specific transformers ────────────────────────────────────────────

/**
 * Fetch all packages from Storyblok and return them in the shape
 * that header-nav.ts and page templates expect:
 *   { slug: string, data: { title, tag, booking_link, nav_order, ... } }
 */
export async function fetchPackages() {
  const stories = await fetchStories('angebote/', { contentType: 'package' });
  return stories.map((story: any) => {
    const c = story.content;
    return {
      slug: story.slug,
      data: {
        title: c.title ?? '',
        subtitle: c.subtitle ?? '',
        tag: c.tag ?? '',
        nights: c.nights ?? '',
        teaser: c.teaser ?? '',
        image: assetUrl(c.image),
        image_alt: c.image_alt ?? '',
        price_from: c.price_from ? Number(c.price_from) : undefined,
        price_label: c.price_label ?? '',
        booking_link: c.booking_link ?? '',
        booking_options: cleanBlocks(c.booking_options),
        includes: splitLines(c.includes),
        inclusion_note: c.inclusion_note ?? '',
        recommendations: splitLines(c.recommendations),
        availability: c.availability ?? '',
        availability_note: c.availability_note ?? '',
        pricing_tiers: cleanBlocks(c.pricing_tiers).map((t: any) => ({
          ...t,
          price_from: t.price_from ? Number(t.price_from) : undefined,
        })),
        highlights: cleanBlocks(c.highlights),
        program_intro: c.program_intro ?? '',
        program_columns: splitLines(c.program_columns),
        program_rows: cleanBlocks(c.program_rows).map((r: any) => ({
          ...r,
          values: splitLines(r.values),
        })),
        gallery: cleanBlocks(c.gallery).map((g: any) => ({
          image: assetUrl(g.image),
          alt: g.alt ?? '',
        })),
        closing_heading: c.closing_heading ?? '',
        closing_body: c.closing_body ?? '',
        nav_order: c.nav_order ? Number(c.nav_order) : undefined,
        show_in_nav: c.show_in_nav !== false,
        // Rich text fields — rendered to HTML
        body_html: richTextHtml(c.body),
        closing_body_html: richTextHtml(c.closing_body),
      },
    };
  });
}

/**
 * Fetch all rooms from Storyblok.
 * Returns { slug, data: { name, variants, tagline, ... } }
 */
export async function fetchRooms() {
  const stories = await fetchStories('zimmer/', { contentType: 'room' });
  return stories.map((story: any) => {
    const c = story.content;
    return {
      slug: story.slug,
      data: {
        name: c.name ?? '',
        variants: c.variants ?? '',
        tagline: c.tagline ?? '',
        size: c.size ?? '',
        capacity: c.capacity ?? '',
        highlight: c.highlight ?? false,
        sort_order: c.sort_order ? Number(c.sort_order) : 99,
        seo_title: c.seo_title ?? '',
        seo_description: c.seo_description ?? '',
        hero_image: assetUrl(c.hero_image),
        preview_image: assetUrl(c.preview_image),
        gallery: cleanBlocks(c.gallery).map((g: any) => ({
          image: assetUrl(g.image),
          caption: g.alt ?? '',
        })),
        intro_heading: c.intro_heading ?? '',
        intro_subheading: c.intro_subheading ?? '',
        specs: cleanBlocks(c.specs),
        feature_groups: cleanBlocks(c.feature_groups).map((fg: any) => ({
          heading: fg.heading ?? '',
          items: splitLines(fg.items),
        })),
        // Rich text body
        body_html: richTextHtml(c.body),
      },
    };
  });
}

/**
 * Fetch all blog posts from Storyblok.
 */
export async function fetchBlogPosts() {
  const stories = await fetchStories('blog/', { contentType: 'blog_post' });
  return stories.map((story: any) => {
    const c = story.content;
    return {
      slug: story.slug,
      data: {
        title: c.title ?? '',
        seo_title: c.seo_title ?? '',
        seo_description: c.seo_description ?? '',
        date: c.date ?? '',
        author: c.author ?? '',
        category: c.category ?? '',
        teaser: c.teaser ?? '',
        image: assetUrl(c.image),
        image_alt: c.image_alt ?? '',
        body_html: richTextHtml(c.body),
      },
    };
  });
}

/**
 * Fetch the homepage story and transform into the shape matching homepage.json.
 */
export async function fetchHomepage() {
  const story = await fetchStory('home');
  if (!story) return null;
  const c = story.content;

  const pillarsArray = cleanBlocks(c.pillars);
  const pillarKeys = ['moorheilbad', 'therme', 'nature'];
  const pillars: Record<string, any> = {};
  pillarKeys.forEach((key, i) => {
    const p = pillarsArray[i];
    if (p) {
      pillars[key] = {
        number: p.number ?? `0${i + 1}`,
        heading: p.heading ?? '',
        body: p.body ?? '',
      };
    }
  });

  return {
    seo_title: c.seo_title ?? '',
    seo_description: c.seo_description ?? '',
    hero: {
      image: assetUrl(c.hero_image),
      image_alt: c.hero_image_alt ?? '',
      caption: c.hero_caption ?? '',
      headline_line1: c.hero_headline_line1 ?? '',
      headline_line2: c.hero_headline_line2 ?? '',
      body: c.hero_body ?? '',
      cta_primary_label: c.cta_primary_label ?? '',
      cta_primary_href: c.cta_primary_href ?? '',
      cta_secondary_label: c.cta_secondary_label ?? '',
      cta_secondary_href: c.cta_secondary_href ?? '',
    },
    pillars,
    packages_section: {
      caption: c.packages_section_label ?? '',
      heading: c.packages_section_heading ?? '',
      all_link_label: c.packages_section_subheading ?? 'Alle Angebote',
    },
    rooms_section: {
      caption: c.rooms_heading ? 'Unterkunft' : '',
      heading: c.rooms_heading ?? '',
      body: c.rooms_body ?? '',
      all_link_label: c.rooms_cta_label ?? 'Alle Zimmer',
      featured_image: assetUrl(c.rooms_image),
    },
    therme_cta: {
      background_image: assetUrl(c.therme_image),
      caption: 'feelMOOR Therme',
      heading: c.therme_heading ?? '',
      body: c.therme_body ?? '',
      stat_1_value: cleanBlocks(c.therme_stats)[0]?.value ?? '',
      stat_1_label: cleanBlocks(c.therme_stats)[0]?.label ?? '',
      stat_2_value: cleanBlocks(c.therme_stats)[1]?.value ?? '',
      stat_2_label: cleanBlocks(c.therme_stats)[1]?.label ?? '',
      stat_3_value: cleanBlocks(c.therme_stats)[2]?.value ?? '',
      stat_3_label: cleanBlocks(c.therme_stats)[2]?.label ?? '',
      cta_primary_label: c.therme_cta_label ?? '',
      cta_secondary_label: 'Preise & Öffnungszeiten',
    },
    voucher_strip: {
      caption: 'Verschenken Sie Erholung',
      heading: c.voucher_heading ?? '',
      subheading: c.voucher_body ?? '',
    },
    // Popup fields
    popup_enabled: c.popup_enabled ?? false,
    popup_headline: c.popup_headline ?? '',
    popup_body_html: richTextHtml(c.popup_body),
    popup_image: assetUrl(c.popup_image),
    popup_link: c.popup_link ?? '',
  };
}

/**
 * Fetch site settings (singleton story).
 * Returns shape matching site.json.
 */
export async function fetchSiteSettings() {
  const story = await fetchStory('site-settings');
  if (!story) return null;
  const c = story.content;

  return {
    hotel_name: c.hotel_name ?? '',
    tagline: c.tagline ?? '',
    address_street: c.address_street ?? '',
    address_zip_city: c.address_zip_city ?? '',
    address_region: 'Bayern',
    address_country: 'Deutschland',
    phone_display: c.phone_display ?? '',
    phone_link: c.phone_link ?? '',
    email: c.email ?? '',
    social_instagram: '#',
    social_facebook: '#',
    default_og_image: assetUrl(c.default_og_image, '/images/og-default.webp'),
    copyright_name: c.copyright_name ?? '',
    header_nav_links: [] as any[],
    footer_columns: cleanBlocks(c.footer_columns).map((col: any) => ({
      heading: col.heading ?? '',
      links: cleanBlocks(col.links).map((link: any) => ({
        label: link.label ?? '',
        href: link.href ?? '',
      })),
    })),
  };
}

/**
 * Fetch a generic sb_page story by slug.
 * Returns flat hero_* fields matching the JSON page data shape so existing
 * templates can consume it without per-page transformation.
 */
export async function fetchPage(slug: string) {
  const story = await fetchStory(slug);
  if (!story) return null;
  const c = story.content;

  return {
    seo_title: c.seo_title ?? '',
    seo_description: c.seo_description ?? '',
    hero_image: assetUrl(c.hero_image),
    hero_image_alt: '',
    hero_caption: c.hero_caption ?? '',
    hero_heading: c.hero_heading ?? '',
    hero_intro: c.hero_intro ?? '',
    heading: c.hero_heading ?? '',
    intro_heading: c.intro_heading ?? '',
    intro_subheading: c.intro_subheading ?? '',
    intro_body_html: richTextHtml(c.intro_body),
    intro_image: assetUrl(c.intro_image),
    intro_quote: c.intro_quote ?? '',
    sections: cleanBlocks(c.sections).map((s: any) => ({
      heading: s.heading ?? '',
      subheading: s.subheading ?? '',
      body_html: richTextHtml(s.body),
      image: assetUrl(s.image),
      stats: cleanBlocks(s.stats),
      cta_label: s.cta_label ?? '',
      cta_href: s.cta_href ?? '',
    })),
  };
}
