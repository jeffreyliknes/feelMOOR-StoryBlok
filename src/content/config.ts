import { defineCollection, z } from 'astro:content';

// Singleton JSON pages — imported directly, registered here only to suppress
// Astro's auto-collection deprecation warning for src/content/pages/ and settings/.
const pages = defineCollection({ type: 'data', schema: z.any() });
const settings = defineCollection({ type: 'data', schema: z.any() });

const rooms = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    /** e.g. "Comfort · Classic" — shown on cards and detail pages */
    variants: z.string().optional(),
    tagline: z.string().optional(),
    size: z.string().optional(),
    capacity: z.string().optional(),
    highlight: z.boolean().optional().default(false),
    sort_order: z.number().optional().default(99),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    hero_image: z.string(),
    preview_image: z.string(),
    gallery: z.array(z.object({
      image: z.string(),
      caption: z.string().optional().default(''),
    })).optional().default([]),
    intro_heading: z.string().optional(),
    intro_subheading: z.string().optional(),
    specs: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional().default([]),
    feature_groups: z.array(z.object({
      heading: z.string(),
      items: z.array(z.string()).optional().default([]),
    })).optional().default([]),
  }),
});

const packages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tag: z.string().optional(),
    nights: z.string().optional(),
    teaser: z.string().optional(),
    image: z.string().optional(),
    image_alt: z.string().optional(),
    price_from: z.number().optional(),
    price_label: z.string().optional(),
    booking_link: z.string().optional(),
    booking_options: z.array(z.object({
      label: z.string(),
      href: z.string(),
    })).optional().default([]),
    includes: z.array(z.string()).optional().default([]),
    /** Short tagline shown under the title (e.g. "Das Baukastensystem für individuelle Wünsche") */
    subtitle: z.string().optional(),
    /** Note shown beneath the inclusions list (conditions, asterisk explanations) */
    inclusion_note: z.string().optional(),
    /** "Unsere Empfehlung" bullet list */
    recommendations: z.array(z.string()).optional().default([]),
    /** "Termine" availability text, e.g. "ganzjährig buchbar" */
    availability: z.string().optional(),
    availability_note: z.string().optional(),
    /** Pricing rows by duration: "ab X € im Classic Doppelzimmer" + booking link */
    pricing_tiers: z.array(z.object({
      duration: z.string(),
      price_from: z.number().optional(),
      price_note: z.string().optional(),
      href: z.string().optional(),
    })).optional().default([]),
    /** Feature cards (Health Balance & Spa, Moorbad, Therme, Natur …) */
    highlights: z.array(z.object({
      title: z.string(),
      text: z.string().optional(),
    })).optional().default([]),
    /** Intro paragraph above the program / Punktekatalog block */
    program_intro: z.string().optional(),
    /** Punktekatalog rows: { points: "11 Punkte", items: "A | B | C" } */
    points_catalog: z.array(z.object({
      points: z.string(),
      items: z.string(),
    })).optional().default([]),
    /** Column headers for the per-duration treatment table, e.g. ["10 Nächte","14 Nächte","21 Nächte"] */
    program_columns: z.array(z.string()).optional().default([]),
    /** Treatment table rows; values align to program_columns */
    program_rows: z.array(z.object({
      treatment: z.string(),
      effect: z.string().optional(),
      values: z.array(z.string()).optional().default([]),
    })).optional().default([]),
    /** Extra image gallery */
    gallery: z.array(z.object({
      image: z.string(),
      alt: z.string().optional().default(''),
    })).optional().default([]),
    /** Closing philosophy section heading + prose (e.g. "Warum ins Moor?") */
    closing_heading: z.string().optional(),
    closing_body: z.string().optional(),
    /** Lower sorts first in mega menu within each column */
    nav_order: z.number().optional(),
    /** Set false to hide this package from Angebote mega menu */
    show_in_nav: z.boolean().optional().default(true),
  }),
});

const blogDate = z
  .union([z.string(), z.date()])
  .transform((val) => (val instanceof Date ? val.toISOString().slice(0, 10) : val));

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    seo_title: z.string().optional(),
    seo_description: z.string().optional(),
    date: blogDate,
    author: z.string().optional(),
    teaser: z.string().optional(),
    image: z.string().optional().default(''),
    image_alt: z.string().optional().default(''),
    category: z.string().optional(),
  }),
});

export const collections = { rooms, packages, pages, settings, blog };
