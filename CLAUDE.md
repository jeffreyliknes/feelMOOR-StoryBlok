# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

feelMOOR is a luxury health resort website (https://www.feelmoor.de) for a thermal spa hotel in Bad Wurzach, Germany. The site is German-language with a minimal English homepage at `/en`.

## Commands

```bash
npm run dev       # Start Astro dev server (fetches Storyblok DRAFT content)
npm run build     # astro build (SSR, Vercel adapter)
npm run preview   # Preview production build locally
```

`npm run dev` and `npm run build` need `STORYBLOK_PREVIEW_TOKEN` in `.env` (pull with `npx vercel env pull`). `STORYBLOK_PERSONAL_TOKEN` is only needed to re-run the migration scripts.

No lint or test scripts are configured.

## Architecture

**Stack:** Astro 5 (SSR via `@astrojs/vercel`), Tailwind CSS 3, TypeScript. Deployed on Vercel as an on-demand server, so published Storyblok content goes live without a rebuild.

### Content Layer

Content lives in a **Storyblok** space (cloud), not in git. Pages fetch it at request time through the Content Delivery API. Dev and the visual editor see `draft` content; production sees `published`.

- **`src/lib/storyblok.ts`** is the whole content layer:
  - `getStory(slug, Astro)` — one story, content flattened (asset fields → URL strings, nested blok lists → arrays).
  - `getStories(startsWith, Astro)` — a folder of stories in `{ slug, data }` shape (the old `getCollection` shape).
  - `renderRichText(doc)` — richtext document → HTML string (for room/package/blog bodies).
  - `lines(text)` — splits a "one per line" textarea back into `string[]`.
  - `sbe(blok)` — emits visual-editor click-to-edit attributes on a rendered blok.
- Story slugs: pages live under `pages/` (e.g. `pages/therme-sauna`, homepage is `pages/home`, English homepage `pages/home-en`); collections under `rooms/`, `packages/`, `blog/`; global settings is the top-level `site-settings` story.

### CMS

The CMS is **Storyblok**. Components (bloks) are defined in the space and mirror the field structure the templates expect. Editors use the **Visual Editor**, which loads the live site in an iframe (preview URL in Space Settings → Visual Editor) and edits sections in place; **Publish** makes changes live on the next request.

**When you add a new page:** create the Astro route in `src/pages/`, define any new blok component(s) in the Storyblok space, and fetch the story with `getStory`. The blok's field names must match the keys the template reads. Nestable section bloks are what make a page click-to-editable — wrap each rendered section's root element with `{...sbe(blok)}`.

Two migration scripts in `scripts/storyblok/` (`define-components.mjs`, `migrate-content.mjs`) built the space from the original Tina files. They are one-time tooling, not part of the build. Field-type mapping is documented in `define-components.mjs` (Tina `image` → Storyblok `asset`, string lists → newline `textarea`, object lists → nestable bloks, numbers → string fields).

Images are stored in the Storyblok asset library. Decorative/brand images not managed in the CMS (logos, a few hardcoded section images) still live in `public/images/`.

### Routing

File-based Astro routing under `src/pages/`:
- Static pages fetch their story via `getStory('pages/<slug>', Astro)`
- Dynamic routes: `/zimmer/[slug].astro`, `/angebote/[slug].astro`, `/blog/[slug].astro` — fetch `getStory('<folder>/${slug}', Astro)` at request time and return a 404 Response when the story is missing
- 60+ permanent redirects for legacy SEO URLs are in `vercel.json`

### Layouts & Components

- `PageLayout.astro` is the main wrapper — accepts `locale`, `seo`, and `page` props, and renders `Header`, `Footer`, `SEO`, and `BookingWidget`
- `BaseLayout.astro` is the bare HTML shell used by `PageLayout`
- Navigation is built dynamically in `src/lib/header-nav.ts`: packages are sorted by `nav_order` and grouped by `tag` into the mega menu; additional links come from `site.json → header_nav_links`

### Booking Widget

An external MWS booking widget is loaded from a DigitalOcean CDN. It is embedded in `BookingWidget.astro` and triggered by `href="#booking"` anchor links. CSS overrides are in `src/styles/booking-widget.css`.

### Styling Conventions

- Custom brand tokens in `tailwind.config.mjs`: colors (`gold`, `forest`, `cream`, `stone`, `ink`), fonts (`display` = Cormorant Garamond, `body` = DM Sans), letter-spacing utilities, and animations (`fade-up`, `fade-in`, `line-grow`)
- Typography: `text-xs` = 0.8125rem (13px, smallest UI copy), `text-sm` / `text-base` = 0.9375rem (15px, normal body copy). Prefer these tokens over arbitrary `text-[Npx]` classes.
- CSS custom properties defined in `src/styles/global.css` (e.g., `--header-h: 80px`)
- `@/*` path alias maps to `src/` (configured in `tsconfig.json`)

### Copy Guidelines

- Never use em dashes (—) or en dashes (–) in site copy, SEO titles, or CMS content. Use commas, colons, rephrasing, or "bis" for ranges (times, nights, temperatures).

### Images

Static images are served from `public/images/`. Logos are in `public/images/Logos/`.
