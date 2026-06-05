# feelMOOR: Storyblok Migration Plan

Migrate from Pages CMS (local JSON + Markdown) to Storyblok CMS while keeping existing Astro components, Tailwind styling, and Vercel deployment.

---

## Phase 1: Install & Configure Storyblok SDK

**What to do:**
1. Install `@storyblok/astro` package
2. Add Storyblok integration to `astro.config.mjs` with the space token
3. Create a `.env` file with `STORYBLOK_TOKEN=LZmng2VJBYHn7fbQJO71Vgtt`
4. Add `.env` to `.gitignore` if not already there
5. Register component mappings in the Astro config (empty initially, filled in Phase 3)

**Verification:**
- `npm run dev` starts without errors
- `useStoryblokApi()` returns a working client
- Can fetch a test story from the space

---

## Phase 2: Define Content Models in Storyblok Dashboard

This phase happens in the Storyblok UI (not in code). Define these content types ("bloks"):

### 2a. Page Components (for static pages)

**`page`** — Generic page wrapper
- `seo_title` (text)
- `seo_description` (textarea)
- `hero_image` (asset)
- `hero_caption` (text)
- `hero_heading` (text)
- `hero_intro` (textarea)
- `body` (blocks field — accepts nested bloks below)

**Nested bloks for page sections:**
- `intro_section` — heading, subheading, body (richtext), image (asset)
- `stats_row` — repeatable: value (text), label (text)
- `highlight_card` — heading, body (textarea)
- `cta_banner` — heading, body, button_label, button_href, image

### 2b. Homepage Component

**`homepage`** — Dedicated type (too unique for generic page)
- `seo_title`, `seo_description`
- `hero` (nested blok): image, caption, headline_line1, headline_line2, body, cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href
- `pillars` (3x nested blok): number, heading, body
- `packages_section`: section_label, heading, subheading
- `rooms_section`: heading, body, cta_label, cta_href, image
- `therme_cta`: heading, body, stats (3x value/label), image, cta_label, cta_href
- `voucher_strip`: heading, body, cta_label, cta_href
- `popup_enabled` (boolean)
- `popup_headline` (text)
- `popup_body` (richtext)
- `popup_image` (asset)
- `popup_link` (link)

### 2c. Collection Types

**`room`**
- name, variants, tagline, size, capacity
- highlight (boolean), sort_order (number)
- seo_title, seo_description
- hero_image, preview_image (assets)
- gallery (repeatable blok): image, caption
- intro_heading, intro_subheading
- specs (repeatable blok): label, value
- feature_groups (repeatable blok): heading, items (textarea, one per line)
- body (richtext)

**`package`**
- title, subtitle, tag (single-option: Heilung & Regeneration | Entschlackung & Entgiftung | Entschleunigung & Wellness | Saisonal & Specials)
- nights, teaser (textarea), image, image_alt
- price_from (number), price_label
- booking_options (repeatable blok): label, href
- includes (textarea, one per line)
- recommendations (textarea, one per line)
- availability, availability_note
- pricing_tiers (repeatable blok): duration, price_from, price_note, href
- highlights (repeatable blok): title, text
- program_intro (textarea)
- program_columns (textarea, one per line)
- program_rows (repeatable blok): treatment, effect, values (textarea)
- gallery (repeatable blok): image, alt
- closing_heading, closing_body (richtext)
- nav_order (number), show_in_nav (boolean, default true)
- body (richtext)

**`blog_post`**
- title, seo_title, seo_description
- date (date), author, category
- teaser (textarea), image, image_alt
- body (richtext)

### 2d. Global Settings

**`site_settings`** (as a Storyblok "Global" story)
- hotel_name, tagline
- address_street, address_zip_city, address_region, address_country
- phone_display, phone_link, email
- social_instagram, social_facebook
- default_og_image (asset)
- copyright_name
- header_nav_links (repeatable blok): mega_menu_id, column_heading, label, href, sort_order
- footer_columns (repeatable blok): heading, links (nested repeatable: label, href)

### 2e. Folder Structure in Storyblok

```
/ (root)
  home              → homepage component
  settings          → site_settings (Global)
  hotel             → page
  therme/           → page (index)
    thermalbad      → page
    sauna           → page
    wellness        → page
    preise          → page
  gesundheit/       → page (index)
    moorbad         → page
    anwendungen     → page
    aerzte          → page
  fitness/          → page (index)
    studio          → page
    kurse           → page
    mitgliedschaften → page
  zimmer/           → folder
    doppelzimmer    → room
    einzelzimmer    → room
    suiten          → room
  angebote/         → folder
    moorintensivkur → package
    basenfasten     → package
    ... (22 total)
  blog/             → folder
    beispiel-beitrag → blog_post
  allgaeu           → page
  kulinarik         → page
  nachhaltigkeit    → page
  gutscheine        → page
  jobs              → page
  newsletter        → page
  oeffnungszeiten   → page
  service-kontakt   → page
  datenschutz       → page
  impressum         → page
```

### 2f. i18n Configuration

- Enable "Field-level translation" in Storyblok Space Settings
- Add two locales: `de` (default) and `en`
- Mark translatable fields (text, textarea, richtext, assets with alt text) as "translatable"
- Non-translatable fields (URLs, sort_order, booleans, numbers) stay shared

---

## Phase 3: Create Storyblok Wrapper Components

**What to do:**
Create thin wrapper components at `src/storyblok/` that receive Storyblok `blok` props and pass them to existing components. This avoids rewriting your UI components.

Example pattern:
```astro
---
// src/storyblok/SbPackage.astro
import { storyblokEditable } from "@storyblok/astro";
import PackageDetail from "@/components/PackageDetail.astro";

const { blok } = Astro.props;

// Transform Storyblok data shape → existing component props
const packageData = {
  title: blok.title,
  tag: blok.tag,
  nights: blok.nights,
  // ... map all fields
};
---
<div {...storyblokEditable(blok)}>
  <PackageDetail {...packageData} />
</div>
```

**Components to create:**
1. `SbHomepage.astro` — maps homepage blok → existing homepage sections
2. `SbPage.astro` — maps generic page blok → existing page sections
3. `SbRoom.astro` — maps room blok → existing room detail
4. `SbPackage.astro` — maps package blok → existing package detail
5. `SbBlogPost.astro` — maps blog blok → existing blog detail

**Register all in `astro.config.mjs`:**
```javascript
components: {
  homepage: "storyblok/SbHomepage",
  page: "storyblok/SbPage",
  room: "storyblok/SbRoom",
  package: "storyblok/SbPackage",
  blog_post: "storyblok/SbBlogPost",
}
```

**Verification:**
- Each component renders identically to current output
- Visual diff: screenshot before/after for key pages

---

## Phase 4: Migrate Page Data Fetching

**What to do:**
Update each Astro page file to fetch from Storyblok API instead of local JSON/Markdown.

### 4a. Static pages (homepage, hotel, therme, etc.)

Before:
```astro
const page = await getEntry("pages", "homepage");
```

After:
```astro
const storyblokApi = useStoryblokApi();
const { data } = await storyblokApi.get("cdn/stories/home", {
  version: import.meta.env.DEV ? "draft" : "published",
});
const page = data.story.content;
```

### 4b. Dynamic collections (packages, rooms, blog)

Before:
```astro
export async function getStaticPaths() {
  const packages = await getCollection("packages");
  return packages.map(p => ({ params: { slug: p.slug }, props: { pkg: p } }));
}
```

After:
```astro
export async function getStaticPaths() {
  const storyblokApi = useStoryblokApi();
  const { data } = await storyblokApi.get("cdn/stories", {
    starts_with: "angebote/",
    version: import.meta.env.DEV ? "draft" : "published",
    per_page: 100,
  });
  return data.stories.map(story => ({
    params: { slug: story.slug },
    props: { story },
  }));
}
```

### 4c. Navigation

Update `src/lib/header-nav.ts` to accept Storyblok package data instead of Astro collection entries. The grouping/sorting logic stays the same — just the data source changes.

### 4d. Site settings

Fetch the global settings story once in the layout:
```astro
const { data } = await storyblokApi.get("cdn/stories/settings", {
  version: import.meta.env.DEV ? "draft" : "published",
});
```

**Verification:**
- Every page renders with Storyblok data
- Navigation builds correctly with package tags
- SEO meta tags populate correctly
- `npm run build` completes with no errors

---

## Phase 5: Add i18n Routing

**What to do:**
1. Set up Astro i18n routing with `de` (default, no prefix) and `en` (prefix `/en/`)
2. Fetch locale-specific content from Storyblok using the `language` query parameter
3. Create `/en/` route variants for all pages that need English

### Routing structure:
```
src/pages/
  index.astro              → fetches home story (default locale = de)
  en/index.astro           → fetches home story (language: "en")
  angebote/[slug].astro    → de packages
  en/angebote/[slug].astro → en packages (if translated)
  ... etc
```

### Fetching translated content:
```astro
const { data } = await storyblokApi.get("cdn/stories/home", {
  version: "published",
  language: "en",  // returns English field values, falls back to German for untranslated fields
});
```

### Language switcher:
Add a DE/EN toggle to the Header component that links between locale routes.

**Verification:**
- `/` shows German content
- `/en/` shows English content
- Untranslated fields fall back to German
- Language switcher works

---

## Phase 6: Populate Content in Storyblok

**What to do:**
1. Create all stories in Storyblok matching the folder structure from Phase 2e
2. Copy content from existing JSON/Markdown files into each story
3. Upload images to Storyblok's asset manager (or keep serving from `/public/images/` initially and migrate images later)
4. Translate priority pages into English (homepage, key packages)

**Image strategy — two options:**
- **Quick:** Keep images in `public/images/`, reference them by path in Storyblok text fields. Migrate to Storyblok assets later.
- **Proper:** Upload all images to Storyblok asset manager now. Update all references. Client can then manage images through Storyblok UI.

Recommend: Quick approach first, migrate images in a follow-up.

**Verification:**
- Every page matches the current live site visually
- All 22 packages render correctly
- All 3 room pages render correctly
- Blog post renders correctly

---

## Phase 7: Webhook & Deploy Pipeline

**What to do:**
1. In Vercel: Create a Deploy Hook (Project Settings > Git > Deploy Hooks)
2. In Storyblok: Add webhook (Settings > Webhooks) pointing to the Vercel deploy hook URL
3. Set webhook to fire on `story.published` and `story.unpublished` events
4. Test: publish a change in Storyblok → Vercel rebuilds → change appears on site

**Verification:**
- Edit content in Storyblok → publish → site rebuilds within ~60 seconds
- Deleting/unpublishing a package removes it from nav and its page

---

## Phase 8: Cleanup

**What to do:**
1. Remove `src/content/pages/` (all JSON files)
2. Remove `src/content/rooms/`, `src/content/packages/`, `src/content/blog/` (all Markdown)
3. Remove `src/content/settings/site.json`
4. Remove or simplify `src/content/config.ts` (no more local collections)
5. Remove `.pages.yml` and `pages.config.yml`
6. Update `CLAUDE.md` to reflect new Storyblok architecture
7. Remove Pages CMS references from any docs

**Do NOT remove:**
- `vercel.json` (still has legacy redirects)
- Image files in `public/images/` (still serving them unless migrated to Storyblok assets)
- Any Astro components or layouts (they're still in use)

**Verification:**
- `npm run build` succeeds with no references to old content files
- Site looks identical to pre-migration
- Client can log into Storyblok and edit content
- Client can create a new package → it appears on the site after publish
- Client can toggle homepage popup on/off

---

## Estimated Effort

| Phase | Work |
|-------|------|
| 1. SDK setup | 30 min |
| 2. Content models (Storyblok UI) | 2-3 hours |
| 3. Wrapper components | 2-3 hours |
| 4. Data fetching migration | 3-4 hours |
| 5. i18n routing | 2-3 hours |
| 6. Content population | 3-4 hours |
| 7. Webhook setup | 30 min |
| 8. Cleanup | 1 hour |

**Total: ~15-20 hours across multiple sessions**

---

## Risk Notes

- **Storyblok repo was archived June 2025** — development moved to `storyblok/monoblok` monorepo. The `@storyblok/astro` package still works but install from the latest published version.
- **Rich text conversion** — Markdown body content in packages/rooms/blog needs to be converted to Storyblok's rich text format. Use Storyblok's markdown importer or paste formatted text.
- **Image migration** — Can be deferred. Keep serving from `public/images/` initially.
- **Visual Editor** — Works in static mode for basic editing. Full live preview requires SSR mode, which is optional.
