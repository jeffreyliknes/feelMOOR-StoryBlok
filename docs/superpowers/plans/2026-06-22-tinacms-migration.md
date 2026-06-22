# TinaCMS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the recently-added Storyblok integration with TinaCMS, giving hotel staff a `/admin` form UI to edit the existing `src/content/**` JSON/Markdown files, with zero changes to the static-export deployment model.

**Architecture:** Revert the Storyblok migration commit (`caadea4`) so every page reads `src/content/**` directly again (the pattern this codebase used before Storyblok), exactly as Astro's content collections and plain JSON imports already worked. Then add TinaCMS in its classic framework-agnostic mode (`tina/config.ts` + `@tinacms/cli`), which builds a static admin SPA into `public/admin` — no SSR adapter, no serverless functions, the site keeps shipping as a static export.

**Tech Stack:** Astro 5 (static), TinaCMS (`tinacms` + `@tinacms/cli`), existing `src/content/**` JSON/Markdown as the data source.

## Global Constraints

- Do not rebuild or redesign any existing component or page layout — restored pages must be byte-for-byte the pre-Storyblok versions.
- Do not add React, a database, or an SSR adapter. Static export stays static export (decided with user: "Admin forms only", no live in-page click-to-edit bridge).
- Do not move, rename, or re-host any image. Tina media root points at the existing `public/images`.
- Do not touch `.env` (contains live Storyblok credentials) — flag for the user to revoke later, don't act on it.
- Never write inline secrets into committed files. `TINA_CLIENT_ID` / `TINA_TOKEN` are read from environment variables, left empty for local dev.

---

### Task 1: Revert the Storyblok integration, restore local-content pages

The Storyblok migration (`caadea4`) only touched 43 files and was confirmed (via `git diff caadea4 HEAD`) to be untouched by every later commit except `package.json`. Every page already had a local-JSON-import fallback before the migration, so reverting is a clean `git checkout` of the parent commit for the affected files, not a manual rewrite.

**Files:**
- Restore (checkout from `caadea4^`): all 37 files listed in Step 1 below
- Delete: `src/lib/storyblok.ts`, `scripts/setup-storyblok.mjs`, `scripts/migrate-content.mjs`, `scripts/upload-assets.mjs`, `scripts/update-story-assets.mjs`, `scripts/asset-map.json`, `MIGRATION-PLAN.md`

- [ ] **Step 1: Restore every Storyblok-touched file to its pre-migration version**

```bash
git checkout caadea4^ -- \
  .pages.yml pages.config.yml astro.config.mjs package.json \
  src/components/common/Footer.astro \
  src/components/common/Header.astro \
  src/pages/allgaeu/index.astro \
  "src/pages/angebote/[slug].astro" \
  src/pages/angebote/index.astro \
  "src/pages/blog/[slug].astro" \
  src/pages/datenschutz.astro \
  src/pages/en/index.astro \
  src/pages/fitness/fitnessstudio.astro \
  src/pages/fitness/index.astro \
  src/pages/fitness/kurse.astro \
  src/pages/fitness/mitgliedschaften.astro \
  src/pages/gesundheit/aerzte-therapeuten.astro \
  src/pages/gesundheit/anwendungen.astro \
  src/pages/gesundheit/index.astro \
  src/pages/gesundheit/moorbad.astro \
  src/pages/gutscheine/index.astro \
  src/pages/hotel/index.astro \
  src/pages/impressum.astro \
  src/pages/index.astro \
  src/pages/jobs/index.astro \
  src/pages/kulinarik/index.astro \
  src/pages/nachhaltigkeit/index.astro \
  src/pages/news/index.astro \
  src/pages/newsletter/index.astro \
  src/pages/oeffnungszeiten/index.astro \
  src/pages/service-kontakt/index.astro \
  src/pages/therme/index.astro \
  src/pages/therme/preise.astro \
  src/pages/therme/sauna.astro \
  src/pages/therme/thermalbad.astro \
  src/pages/therme/wellness.astro \
  "src/pages/zimmer/[slug].astro" \
  src/pages/zimmer/index.astro
```

Note: `.gitignore` is intentionally **not** in this list — its only post-revert diff is an unrelated `.env`/`.env.*` ignore rule that's still wanted, plus the user's pre-existing uncommitted `.vercel` line. Leave it untouched.

- [ ] **Step 2: Delete the Storyblok-only files (they didn't exist before the migration, so there's nothing to check out)**

```bash
rm src/lib/storyblok.ts
rm scripts/setup-storyblok.mjs scripts/migrate-content.mjs scripts/upload-assets.mjs scripts/update-story-assets.mjs scripts/asset-map.json
rm MIGRATION-PLAN.md
```

- [ ] **Step 3: Confirm no file still references Storyblok**

```bash
grep -rl "storyblok\|STORYBLOK" --include="*" src/ scripts/ astro.config.mjs package.json 2>/dev/null
```

Expected: no output.

- [ ] **Step 4: Reinstall to drop the Storyblok packages from the lockfile**

```bash
npm install
```

Expected: `@storyblok/astro` and `storyblok-markdown-richtext` are gone from `package.json`/`package-lock.json` (restored `package.json` from `caadea4^` never had them).

- [ ] **Step 5: Verify the site still builds on local content only**

```bash
npm run build
```

Expected: build succeeds, no Storyblok-related errors, `dist/` contains the full static site.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Revert Storyblok integration, restore local-content pages"
```

---

### Task 2: Install TinaCMS packages and wire npm scripts

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `tinacms dev` / `tinacms build` CLI commands used by Task 3's manual verification.

- [ ] **Step 1: Install Tina's core package and CLI**

```bash
npm install tinacms
npm install --save-dev @tinacms/cli
```

- [ ] **Step 2: Update npm scripts in `package.json`**

```json
{
  "scripts": {
    "dev": "tinacms dev -c \"astro dev\"",
    "build": "tinacms build && astro build",
    "preview": "astro preview",
    "optimize-images": "node scripts/optimize-images.mjs --replace",
    "update-image-references": "node scripts/update-image-references.mjs"
  }
}
```

`tinacms dev -c "<cmd>"` starts Tina's local filesystem-backed content API and runs the wrapped command alongside it — no Tina Cloud account needed for local editing. `tinacms build` regenerates the admin SPA into `public/admin` before the Astro static build picks it up.

- [ ] **Step 3: Ignore Tina's generated output**

Add to `.gitignore`:

```
# TinaCMS
tina/__generated__
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "Install TinaCMS CLI and wire dev/build scripts"
```

---

### Task 3: Write `tina/config.ts` matching the existing content exactly

Field shapes below were taken from the real files (not guessed): `src/content/pages/homepage.json`, `hotel.json`, `therme.json`, `kulinarik.json`, `gesundheit.json`, `allgaeu.json`, `gutscheine.json`, `src/content/config.ts` (Astro's Zod schemas for `rooms`/`packages`/`blog`, which Astro already validates at build time), and a sample document from each Markdown collection. The six generic pages (`hotel`, `therme`, `kulinarik`, `gesundheit`, `allgaeu`, `gutscheine`) are **not** uniform — each is modeled as its own Tina collection scoped to its filename via `match.include`, so saving one page can never drop fields that belong to another.

**Files:**
- Create: `tina/config.ts`

- [ ] **Step 1: Create the config file**

```ts
// tina/config.ts
import { defineConfig } from 'tinacms';

export default defineConfig({
  branch: process.env.TINA_BRANCH || process.env.HEAD || 'main',
  clientId: process.env.TINA_CLIENT_ID || '',
  token: process.env.TINA_TOKEN || '',
  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },
  media: {
    tina: {
      mediaRoot: 'images',
      publicFolder: 'public',
    },
  },
  schema: {
    collections: [
      {
        name: 'homepage',
        label: 'Homepage',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'homepage.json' },
        ui: {
          allowedActions: { create: false, delete: false },
          router: () => '/',
        },
        fields: [
          { type: 'string', name: 'seo_title', label: 'Page Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'Page Description (Google)', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'hero',
            label: 'Hero Section',
            fields: [
              { type: 'image', name: 'image', label: 'Background Image' },
              { type: 'string', name: 'image_alt', label: 'Image Alt Text' },
              { type: 'string', name: 'caption', label: 'Location Label (e.g. "Bad Wurzach · Allgäu")' },
              { type: 'string', name: 'headline_line1', label: 'Headline Line 1' },
              { type: 'string', name: 'headline_line2', label: 'Headline Line 2 (italic, highlighted)' },
              { type: 'string', name: 'body', label: 'Intro Text', ui: { component: 'textarea' } },
              { type: 'string', name: 'cta_primary_label', label: 'Primary Button Text' },
              { type: 'string', name: 'cta_primary_href', label: 'Primary Button Link' },
              { type: 'string', name: 'cta_secondary_label', label: 'Secondary Button Text' },
              { type: 'string', name: 'cta_secondary_href', label: 'Secondary Button Link' },
            ],
          },
          {
            type: 'object',
            name: 'pillars',
            label: 'Three Pillars',
            fields: [
              {
                type: 'object',
                name: 'moorheilbad',
                label: '01 – Moorheilbad',
                fields: [
                  { type: 'string', name: 'number', label: 'Number (e.g. "01")' },
                  { type: 'string', name: 'heading', label: 'Heading' },
                  { type: 'string', name: 'body', label: 'Description', ui: { component: 'textarea' } },
                ],
              },
              {
                type: 'object',
                name: 'therme',
                label: '02 – Therme & Spa',
                fields: [
                  { type: 'string', name: 'number', label: 'Number (e.g. "02")' },
                  { type: 'string', name: 'heading', label: 'Heading' },
                  { type: 'string', name: 'body', label: 'Description', ui: { component: 'textarea' } },
                ],
              },
              {
                type: 'object',
                name: 'nature',
                label: '03 – Allgäuer Natur',
                fields: [
                  { type: 'string', name: 'number', label: 'Number (e.g. "03")' },
                  { type: 'string', name: 'heading', label: 'Heading' },
                  { type: 'string', name: 'body', label: 'Description', ui: { component: 'textarea' } },
                ],
              },
            ],
          },
          {
            type: 'object',
            name: 'packages_section',
            label: 'Packages Section (Headings)',
            fields: [
              { type: 'string', name: 'caption', label: 'Category Label (e.g. "Pakete & Angebote")' },
              { type: 'string', name: 'heading', label: 'Section Heading' },
              { type: 'string', name: 'all_link_label', label: '"All Packages" Button Text' },
            ],
          },
          {
            type: 'object',
            name: 'rooms_section',
            label: 'Rooms Section (Headings)',
            fields: [
              { type: 'string', name: 'caption', label: 'Category Label' },
              { type: 'string', name: 'heading', label: 'Section Heading' },
              { type: 'string', name: 'body', label: 'Intro Text', ui: { component: 'textarea' } },
              { type: 'string', name: 'all_link_label', label: '"All Rooms" Button Text' },
              { type: 'image', name: 'featured_image', label: 'Featured Preview Image' },
            ],
          },
          {
            type: 'object',
            name: 'therme_cta',
            label: 'Thermal Spa Section',
            fields: [
              { type: 'image', name: 'background_image', label: 'Background Image' },
              { type: 'string', name: 'caption', label: 'Category Label' },
              { type: 'string', name: 'heading', label: 'Section Heading' },
              { type: 'string', name: 'body', label: 'Description', ui: { component: 'textarea' } },
              { type: 'string', name: 'stat_1_value', label: 'Stat 1 Value (e.g. "1.500 m²")' },
              { type: 'string', name: 'stat_1_label', label: 'Stat 1 Label' },
              { type: 'string', name: 'stat_2_value', label: 'Stat 2 Value' },
              { type: 'string', name: 'stat_2_label', label: 'Stat 2 Label' },
              { type: 'string', name: 'stat_3_value', label: 'Stat 3 Value' },
              { type: 'string', name: 'stat_3_label', label: 'Stat 3 Label' },
              { type: 'string', name: 'cta_primary_label', label: 'Primary Button Text' },
              { type: 'string', name: 'cta_secondary_label', label: 'Secondary Button Text' },
            ],
          },
          {
            type: 'object',
            name: 'voucher_strip',
            label: 'Gift Vouchers Section',
            fields: [
              { type: 'string', name: 'caption', label: 'Category Label' },
              { type: 'string', name: 'heading', label: 'Heading' },
              { type: 'string', name: 'subheading', label: 'Second Line (italic)' },
            ],
          },
        ],
      },
      {
        name: 'hotel',
        label: 'Hotel & Resort Page',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'hotel.json' },
        ui: { allowedActions: { create: false, delete: false }, router: () => '/hotel' },
        fields: [
          { type: 'string', name: 'seo_title', label: 'SEO Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'SEO Description (Google)', ui: { component: 'textarea' } },
          { type: 'string', name: 'hero_caption', label: 'Hero Caption' },
          { type: 'string', name: 'hero_heading', label: 'Hero Heading' },
          { type: 'string', name: 'hero_intro', label: 'Hero Intro', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image' },
          { type: 'string', name: 'hero_image_alt', label: 'Hero Image Alt Text' },
          { type: 'string', name: 'intro_heading', label: 'Intro Heading' },
          { type: 'string', name: 'intro_body', label: 'Intro Body', ui: { component: 'textarea' } },
          { type: 'image', name: 'intro_image', label: 'Intro Image' },
          { type: 'string', name: 'highlight_1_heading', label: 'Highlight 1 Heading' },
          { type: 'string', name: 'highlight_1_body', label: 'Highlight 1 Body', ui: { component: 'textarea' } },
          { type: 'string', name: 'highlight_2_heading', label: 'Highlight 2 Heading' },
          { type: 'string', name: 'highlight_2_body', label: 'Highlight 2 Body', ui: { component: 'textarea' } },
          { type: 'string', name: 'highlight_3_heading', label: 'Highlight 3 Heading' },
          { type: 'string', name: 'highlight_3_body', label: 'Highlight 3 Body', ui: { component: 'textarea' } },
        ],
      },
      {
        name: 'therme',
        label: 'Therme Page',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'therme.json' },
        ui: { allowedActions: { create: false, delete: false }, router: () => '/therme' },
        fields: [
          { type: 'string', name: 'seo_title', label: 'SEO Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'SEO Description (Google)', ui: { component: 'textarea' } },
          { type: 'string', name: 'hero_caption', label: 'Hero Caption' },
          { type: 'string', name: 'hero_heading', label: 'Hero Heading' },
          { type: 'string', name: 'hero_intro', label: 'Hero Intro', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image' },
          { type: 'string', name: 'hero_image_alt', label: 'Hero Image Alt Text' },
          { type: 'string', name: 'intro_heading', label: 'Intro Heading' },
          { type: 'string', name: 'intro_body', label: 'Intro Body', ui: { component: 'textarea' } },
          { type: 'image', name: 'intro_image', label: 'Intro Image' },
          { type: 'string', name: 'stat_1_value', label: 'Stat 1 Value (e.g. "1.500 m²")' },
          { type: 'string', name: 'stat_1_label', label: 'Stat 1 Label' },
          { type: 'string', name: 'stat_2_value', label: 'Stat 2 Value' },
          { type: 'string', name: 'stat_2_label', label: 'Stat 2 Label' },
          { type: 'string', name: 'stat_3_value', label: 'Stat 3 Value' },
          { type: 'string', name: 'stat_3_label', label: 'Stat 3 Label' },
        ],
      },
      {
        name: 'gesundheit',
        label: 'Gesundheit Page',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'gesundheit.json' },
        ui: { allowedActions: { create: false, delete: false }, router: () => '/gesundheit' },
        fields: [
          { type: 'string', name: 'seo_title', label: 'SEO Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'SEO Description (Google)', ui: { component: 'textarea' } },
          { type: 'string', name: 'hero_caption', label: 'Hero Caption' },
          { type: 'string', name: 'hero_heading', label: 'Hero Heading' },
          { type: 'string', name: 'hero_intro', label: 'Hero Intro', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image' },
          { type: 'string', name: 'hero_image_alt', label: 'Hero Image Alt Text' },
          { type: 'string', name: 'intro_heading', label: 'Intro Heading' },
          { type: 'string', name: 'intro_body', label: 'Intro Body', ui: { component: 'textarea' } },
          { type: 'image', name: 'intro_image', label: 'Intro Image' },
        ],
      },
      {
        name: 'kulinarik',
        label: 'Kulinarik Page',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'kulinarik.json' },
        ui: { allowedActions: { create: false, delete: false }, router: () => '/kulinarik' },
        fields: [
          { type: 'string', name: 'seo_title', label: 'SEO Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'SEO Description (Google)', ui: { component: 'textarea' } },
          { type: 'string', name: 'hero_caption', label: 'Hero Caption' },
          { type: 'string', name: 'hero_heading', label: 'Hero Heading' },
          { type: 'string', name: 'hero_intro', label: 'Hero Intro', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image' },
          { type: 'string', name: 'hero_image_alt', label: 'Hero Image Alt Text' },
          { type: 'string', name: 'intro_heading', label: 'Intro Heading' },
          { type: 'string', name: 'intro_body', label: 'Intro Body', ui: { component: 'textarea' } },
          { type: 'image', name: 'intro_image', label: 'Intro Image' },
          {
            type: 'object',
            name: 'venues',
            label: 'Venues (Restaurant, FEELbar, Café)',
            list: true,
            fields: [
              { type: 'string', name: 'name', label: 'Name' },
              { type: 'string', name: 'tagline', label: 'Tagline' },
              { type: 'image', name: 'image', label: 'Image' },
              { type: 'string', name: 'body', label: 'Description', ui: { component: 'textarea' } },
              { type: 'string', name: 'highlight', label: 'Highlight Note (optional, e.g. "Ladies Night")' },
              { type: 'string', name: 'note', label: 'Status Note (optional, e.g. "Momentan geschlossen")' },
              { type: 'string', name: 'hours', label: 'Opening Hours (one per line)', list: true },
            ],
          },
          { type: 'string', name: 'buffet_heading', label: 'Buffet Section Heading' },
          {
            type: 'object',
            name: 'buffet_items',
            label: 'Buffet Price List',
            list: true,
            fields: [
              { type: 'string', name: 'label', label: 'Item Label' },
              { type: 'string', name: 'price', label: 'Price (e.g. "22,00 €")' },
            ],
          },
          { type: 'string', name: 'buffet_note', label: 'Buffet Note (discounts, etc.)', ui: { component: 'textarea' } },
        ],
      },
      {
        name: 'allgaeu',
        label: 'Allgäu erleben Page',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'allgaeu.json' },
        ui: { allowedActions: { create: false, delete: false }, router: () => '/allgaeu' },
        fields: [
          { type: 'string', name: 'seo_title', label: 'SEO Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'SEO Description (Google)', ui: { component: 'textarea' } },
          { type: 'string', name: 'hero_caption', label: 'Hero Caption' },
          { type: 'string', name: 'hero_heading', label: 'Hero Heading' },
          { type: 'string', name: 'hero_intro', label: 'Hero Intro', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image' },
          { type: 'string', name: 'hero_image_alt', label: 'Hero Image Alt Text' },
          { type: 'string', name: 'intro_heading', label: 'Intro Heading' },
          { type: 'string', name: 'intro_body', label: 'Intro Body', ui: { component: 'textarea' } },
          { type: 'image', name: 'intro_image', label: 'Intro Image' },
          {
            type: 'object',
            name: 'activities',
            label: 'Activity Cards',
            list: true,
            fields: [
              { type: 'string', name: 'title', label: 'Title' },
              { type: 'image', name: 'image', label: 'Image' },
              { type: 'string', name: 'body', label: 'Description', ui: { component: 'textarea' } },
            ],
          },
          {
            type: 'object',
            name: 'features',
            label: 'Feature Sections (Wurzacher Ried, Podkäschtle)',
            list: true,
            fields: [
              { type: 'string', name: 'heading', label: 'Heading' },
              { type: 'image', name: 'image', label: 'Image' },
              { type: 'string', name: 'image_alt', label: 'Image Alt Text' },
              { type: 'string', name: 'paragraphs', label: 'Paragraphs (one per line)', list: true, ui: { component: 'textarea' } },
              {
                type: 'object',
                name: 'links',
                label: 'External Links',
                list: true,
                fields: [
                  { type: 'string', name: 'label', label: 'Link Text' },
                  { type: 'string', name: 'href', label: 'URL' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'gutscheine',
        label: 'Gutscheine Page',
        path: 'src/content/pages',
        format: 'json',
        match: { include: 'gutscheine.json' },
        ui: { allowedActions: { create: false, delete: false }, router: () => '/gutscheine' },
        fields: [
          { type: 'string', name: 'seo_title', label: 'SEO Title (Browser Tab)' },
          { type: 'string', name: 'seo_description', label: 'SEO Description (Google)', ui: { component: 'textarea' } },
          { type: 'string', name: 'hero_caption', label: 'Hero Caption' },
          { type: 'string', name: 'hero_heading', label: 'Hero Heading' },
          { type: 'string', name: 'hero_intro', label: 'Hero Intro', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image' },
          { type: 'string', name: 'hero_image_alt', label: 'Hero Image Alt Text' },
          { type: 'string', name: 'intro_heading', label: 'Intro Heading' },
          { type: 'string', name: 'intro_body', label: 'Intro Body', ui: { component: 'textarea' } },
          { type: 'image', name: 'intro_image', label: 'Intro Image' },
          { type: 'string', name: 'intro_quote', label: 'Intro Quote' },
          { type: 'string', name: 'steps_heading', label: '"How It Works" Heading' },
          { type: 'string', name: 'steps', label: 'Steps (one per line)', list: true, ui: { component: 'textarea' } },
          { type: 'string', name: 'categories_heading', label: 'Categories Heading' },
          { type: 'string', name: 'categories_intro', label: 'Categories Intro', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'categories',
            label: 'Voucher Categories',
            list: true,
            fields: [
              { type: 'string', name: 'name', label: 'Name' },
              { type: 'image', name: 'image', label: 'Image' },
            ],
          },
          { type: 'string', name: 'partner_heading', label: 'Partner Section Heading' },
          { type: 'string', name: 'partner_body', label: 'Partner Section Body', ui: { component: 'textarea' } },
          { type: 'string', name: 'cta_buy_label', label: 'Buy Button Text' },
          { type: 'string', name: 'cta_buy_href', label: 'Buy Button Link' },
        ],
      },
      {
        name: 'rooms',
        label: 'Rooms & Suites',
        path: 'src/content/rooms',
        format: 'md',
        ui: {
          router: ({ document }) => `/zimmer/${document._sys.filename}`,
        },
        fields: [
          { type: 'string', name: 'name', label: 'Room Name', isTitle: true, required: true },
          { type: 'string', name: 'variants', label: 'Room Categories (e.g. "Comfort · Classic")' },
          { type: 'string', name: 'tagline', label: 'Short Tagline' },
          { type: 'string', name: 'size', label: 'Room Size (e.g. "ab 28 m²")' },
          { type: 'string', name: 'capacity', label: 'Occupancy' },
          { type: 'boolean', name: 'highlight', label: 'Show "Popular" Badge?' },
          { type: 'number', name: 'sort_order', label: 'Display Order in Listing (1 = first)' },
          { type: 'string', name: 'seo_title', label: 'SEO Title' },
          { type: 'string', name: 'seo_description', label: 'SEO Description', ui: { component: 'textarea' } },
          { type: 'image', name: 'hero_image', label: 'Hero Image (detail page)' },
          { type: 'image', name: 'preview_image', label: 'Preview Image (listing card)' },
          {
            type: 'object',
            name: 'gallery',
            label: 'Photo Gallery',
            list: true,
            fields: [
              { type: 'image', name: 'image', label: 'Photo' },
              { type: 'string', name: 'caption', label: 'Caption' },
            ],
          },
          { type: 'string', name: 'intro_heading', label: 'Description Section Heading' },
          { type: 'string', name: 'intro_subheading', label: 'Description Subheading' },
          {
            type: 'object',
            name: 'specs',
            label: 'Room Data (sidebar)',
            list: true,
            fields: [
              { type: 'string', name: 'label', label: 'Label' },
              { type: 'string', name: 'value', label: 'Value' },
            ],
          },
          {
            type: 'object',
            name: 'feature_groups',
            label: 'Amenity Groups',
            list: true,
            fields: [
              { type: 'string', name: 'heading', label: 'Group Heading' },
              { type: 'string', name: 'items', label: 'Features (one per line)', list: true },
            ],
          },
          { type: 'rich-text', name: 'body', label: 'Description', isBody: true },
        ],
      },
      {
        name: 'packages',
        label: 'Packages & Offers',
        path: 'src/content/packages',
        format: 'md',
        ui: {
          router: ({ document }) => `/angebote/${document._sys.filename}`,
        },
        fields: [
          { type: 'string', name: 'title', label: 'Package Name', isTitle: true, required: true },
          {
            type: 'string',
            name: 'tag',
            label: 'Category',
            options: [
              'Heilung & Regeneration',
              'Entschlackung & Entgiftung',
              'Entschleunigung & Wellness',
              'Saisonal & Specials',
            ],
          },
          { type: 'string', name: 'subtitle', label: 'Subtitle / Tagline' },
          { type: 'string', name: 'nights', label: 'Duration (e.g. "2 Nächte")' },
          { type: 'string', name: 'teaser', label: 'Short Description (homepage card)', ui: { component: 'textarea' } },
          { type: 'image', name: 'image', label: 'Preview Image' },
          { type: 'string', name: 'image_alt', label: 'Image Alt Text' },
          { type: 'number', name: 'price_from', label: 'Starting Price in EUR' },
          { type: 'string', name: 'price_label', label: 'Price Suffix' },
          { type: 'string', name: 'booking_link', label: 'Booking Link (single option)' },
          {
            type: 'object',
            name: 'booking_options',
            label: 'Booking Options (multiple durations)',
            list: true,
            fields: [
              { type: 'string', name: 'label', label: 'Duration Label' },
              { type: 'string', name: 'href', label: 'Booking URL' },
            ],
          },
          { type: 'number', name: 'nav_order', label: 'Nav Order in Mega Menu' },
          { type: 'boolean', name: 'show_in_nav', label: 'Show in Angebote Mega Menu?' },
          { type: 'string', name: 'includes', label: "What's Included", list: true },
          { type: 'string', name: 'inclusion_note', label: 'Note Below Inclusions List', ui: { component: 'textarea' } },
          { type: 'string', name: 'recommendations', label: 'Our Recommendation (bullet list)', list: true },
          { type: 'string', name: 'availability', label: 'Dates / Availability', ui: { component: 'textarea' } },
          { type: 'string', name: 'availability_note', label: 'Availability Note', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'pricing_tiers',
            label: 'Pricing Tiers',
            list: true,
            fields: [
              { type: 'string', name: 'duration', label: 'Duration' },
              { type: 'number', name: 'price_from', label: 'From Price in EUR' },
              { type: 'string', name: 'price_note', label: 'Price Note' },
              { type: 'string', name: 'href', label: 'Booking URL' },
            ],
          },
          {
            type: 'object',
            name: 'highlights',
            label: 'Feature Highlights (cards)',
            list: true,
            fields: [
              { type: 'string', name: 'title', label: 'Title' },
              { type: 'string', name: 'text', label: 'Text', ui: { component: 'textarea' } },
            ],
          },
          { type: 'string', name: 'program_intro', label: 'Program Intro', ui: { component: 'textarea' } },
          {
            type: 'object',
            name: 'points_catalog',
            label: 'Points Catalog (Punktekatalog)',
            list: true,
            fields: [
              { type: 'string', name: 'points', label: 'Points Label (e.g. "11 Punkte")' },
              { type: 'string', name: 'items', label: 'Treatments (separate with |)', ui: { component: 'textarea' } },
            ],
          },
          { type: 'string', name: 'program_columns', label: 'Program Table Columns', list: true },
          {
            type: 'object',
            name: 'program_rows',
            label: 'Program Table Rows',
            list: true,
            fields: [
              { type: 'string', name: 'treatment', label: 'Treatment' },
              { type: 'string', name: 'effect', label: 'Effect', ui: { component: 'textarea' } },
              { type: 'string', name: 'values', label: 'Values per Column (in order)', list: true },
            ],
          },
          {
            type: 'object',
            name: 'gallery',
            label: 'Image Gallery',
            list: true,
            fields: [
              { type: 'image', name: 'image', label: 'Photo' },
              { type: 'string', name: 'alt', label: 'Alt Text' },
            ],
          },
          { type: 'string', name: 'closing_heading', label: 'Closing Section Heading (e.g. "Warum ins Moor?")' },
          { type: 'string', name: 'closing_body', label: 'Closing Section Text', ui: { component: 'textarea' } },
          { type: 'rich-text', name: 'body', label: 'Article Body', isBody: true },
        ],
      },
      {
        name: 'blog',
        label: 'News & Blog Posts',
        path: 'src/content/blog',
        format: 'md',
        fields: [
          { type: 'string', name: 'title', label: 'Headline', isTitle: true, required: true },
          { type: 'string', name: 'seo_title', label: 'SEO Title' },
          { type: 'string', name: 'seo_description', label: 'SEO Description', ui: { component: 'textarea' } },
          { type: 'string', name: 'date', label: 'Date (YYYY-MM-DD)' },
          { type: 'string', name: 'author', label: 'Author' },
          { type: 'string', name: 'category', label: 'Category' },
          { type: 'string', name: 'teaser', label: 'Teaser', ui: { component: 'textarea' } },
          { type: 'image', name: 'image', label: 'Featured Image' },
          { type: 'string', name: 'image_alt', label: 'Featured Image Alt Text' },
          { type: 'rich-text', name: 'body', label: 'Article Content', isBody: true },
        ],
        ui: {
          router: ({ document }) => `/blog/${document._sys.filename}`,
        },
      },
      {
        name: 'settings',
        label: 'Global Settings',
        path: 'src/content/settings',
        format: 'json',
        match: { include: 'site.json' },
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          { type: 'string', name: 'hotel_name', label: 'Hotel Name' },
          { type: 'string', name: 'tagline', label: 'Hotel Tagline' },
          { type: 'string', name: 'address_street', label: 'Street Address' },
          { type: 'string', name: 'address_zip_city', label: 'Postcode & City' },
          { type: 'string', name: 'address_region', label: 'State / Region' },
          { type: 'string', name: 'address_country', label: 'Country' },
          { type: 'string', name: 'phone_display', label: 'Phone Number (display, e.g. "+49 7564 30-1000")' },
          { type: 'string', name: 'phone_link', label: 'Phone Number (tel link, no spaces)' },
          { type: 'string', name: 'email', label: 'Email Address' },
          { type: 'string', name: 'social_instagram', label: 'Instagram Link' },
          { type: 'string', name: 'social_facebook', label: 'Facebook Link' },
          { type: 'image', name: 'default_og_image', label: 'Default Social Preview Image' },
          { type: 'string', name: 'copyright_name', label: 'Copyright Text' },
          {
            type: 'object',
            name: 'header_nav_links',
            label: 'Header Mega Menu — Extra Links',
            list: true,
            fields: [
              { type: 'string', name: 'mega_menu_id', label: 'Section (hotel | therme | gesundheit | angebote | allgaeu)' },
              { type: 'string', name: 'column_heading', label: 'Column Heading (must match exactly)' },
              { type: 'string', name: 'label', label: 'Link Text' },
              { type: 'string', name: 'href', label: 'URL Path' },
              { type: 'number', name: 'sort_order', label: 'Order Among Manual Links' },
            ],
          },
          {
            type: 'object',
            name: 'footer_columns',
            label: 'Footer Navigation',
            list: true,
            fields: [
              { type: 'string', name: 'heading', label: 'Column Heading' },
              {
                type: 'object',
                name: 'links',
                label: 'Links',
                list: true,
                fields: [
                  { type: 'string', name: 'label', label: 'Link Text' },
                  { type: 'string', name: 'href', label: 'Link URL' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
});
```

- [ ] **Step 2: Type-check the config**

```bash
npx tsc --noEmit tina/config.ts --jsx preserve --esModuleInterop --skipLibCheck --moduleResolution bundler --module esnext --target es2022
```

Expected: no type errors. (This is a standalone syntax/type check; it does not need the full project `tsconfig`.)

- [ ] **Step 3: Commit**

```bash
git add tina/config.ts
git commit -m "Add Tina config matching existing content collections"
```

---

### Task 4: Verify the admin locally and fix any glob-matching issues

There's no test framework in this repo (per `CLAUDE.md`). Verification here is running the real dev server and checking the real admin UI against the real files, which is the smallest meaningful check for a CMS config.

**Files:** none (verification only — may produce small fixes to `tina/config.ts`'s `match.include` patterns if a collection shows the wrong document)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Expected: Tina's local content API starts, then Astro's dev server starts (default `http://localhost:4321`).

- [ ] **Step 2: Open the admin and check each collection**

Visit `http://localhost:4321/admin/index.html` (in dev, without the Tina/Astro Vite redirect plugin, the bare `/admin` path may 404 — use the `/index.html` suffix). Confirm:
- All 11 collections are listed in the sidebar: Homepage, Hotel & Resort Page, Therme Page, Gesundheit Page, Kulinarik Page, Allgäu erleben Page, Gutscheine Page, Rooms & Suites, Packages & Offers, News & Blog Posts, Global Settings.
- Each of the 7 singleton page collections (Homepage, Hotel, Therme, Gesundheit, Kulinarik, Allgäu, Gutscheine) shows **exactly one document** when opened.
  - If a singleton collection shows zero or more-than-one documents, the `match.include` glob in `tina/config.ts` isn't matching — try the pattern without the `.json` extension (e.g. `'hotel'` instead of `'hotel.json'`) and re-check.
- Open the homepage document and confirm the Hero, Pillars, Packages Section, Rooms Section, Thermal Spa Section, and Gift Vouchers Section fields are all pre-filled with the real copy from `homepage.json`.
- Open one Rooms document (Doppelzimmer) and confirm the gallery shows the 4 real photos with captions, and the Description field renders the real body text.
- Open one Packages document (Moor-Schnuppertage) and confirm pricing tiers, highlights, and the closing section are pre-filled.

- [ ] **Step 3: Edit one field and confirm it writes to the real file**

In the admin, open Global Settings, change `phone_display` to a test value, save, then check the file on disk:

```bash
grep phone_display src/content/settings/site.json
```

Expected: the file reflects the new value. Revert it back afterward:

```bash
git checkout -- src/content/settings/site.json
```

- [ ] **Step 4: Confirm the static build still includes the admin**

```bash
npm run build
ls dist/admin/index.html
```

Expected: build succeeds and `dist/admin/index.html` exists (the admin SPA shipped as a static asset, same as any other page).

---

### Task 5: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the CMS description**

In the "Content Layer" section, after the existing paragraph about Markdown collections and JSON page data, add:

```markdown
### CMS

The CMS is **TinaCMS**, configured in `tina/config.ts`. Editors log in at `/admin` and edit the existing `src/content/**` files through a form UI — there is no separate database; the files in `src/content/` remain the source of truth and Tina writes directly back to them.

To add a new page to the CMS: create the JSON/Markdown file in `src/content/pages/` (or the relevant collection folder), add the Astro route in `src/pages/`, then add a matching collection entry in `tina/config.ts`.

Images uploaded through the Tina media manager are stored in `public/images/`, matching the existing convention.

`.pages.yml` / `pages.config.yml` (Pages CMS) are no longer the active CMS config — superseded by `tina/config.ts`. Left in place for now; safe to remove in a follow-up once Tina is confirmed working in production.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Document TinaCMS as the active CMS"
```

---

## Not covered by this plan (requires the user's own action)

Tina's admin needs *some* backend to authenticate editors and serve content reads/writes once deployed (the static export has no server to do this itself). The standard zero-infrastructure way to get this without adding an SSR adapter is **Tina Cloud**: a free hosted GraphQL + auth layer that connects to the already-authorized GitHub repo and commits edits back via a GitHub App — no database, no server code on this project's side, static export unchanged.

This requires creating a Tina Cloud account and authorizing the GitHub App, which is the user's own account/OAuth action, not something to script. Once done, set `TINA_CLIENT_ID` and `TINA_TOKEN` in Vercel's project environment variables (same place other env vars already live), matching the empty-string defaults already wired into `tina/config.ts` in Task 3.
