# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

feelMOOR is a luxury health resort website (https://www.feelmoor.de) for a thermal spa hotel in Bad Wurzach, Germany. The site is German-language with a minimal English homepage at `/en`.

## Commands

```bash
npm run dev       # Start dev server (TinaCMS + Astro; admin UI at /admin)
npm run build     # tinacms build + astro build to dist/
npm run preview   # Preview production build locally
```

`npm run dev` and `npm run build` need `TINA_CLIENT_ID` and `TINA_TOKEN` in `.env` (pull with `npx vercel env pull`).

No lint or test scripts are configured.

## Architecture

**Stack:** Astro 5 (static site), Tailwind CSS 3, TypeScript. Deployed on Vercel as a static export.

### Content Layer

Content lives in two forms:
- **Markdown collections** (`src/content/rooms/`, `src/content/packages/`, `src/content/blog/`) — individual entries with YAML frontmatter. Schemas defined in `src/content/config.ts` via Zod.
- **JSON page data** (`src/content/pages/`) — structured data for static pages (homepage, therme, gesundheit, etc.) and global settings (`src/content/settings/site.json`).

### CMS

The CMS is **TinaCMS**, configured in `tina/config.ts`. Editors log in at `/admin` and edit the existing `src/content/**` files through a form UI — there is no separate database; the files in `src/content/` remain the source of truth and Tina writes directly back to them.

**Every content file must be editable in Tina.** When you create a new page: create the JSON/Markdown file in `src/content/pages/` (or the relevant collection folder), add the Astro route in `src/pages/`, and add a matching collection entry (or extend an existing collection's `match`) in `tina/config.ts` in the same change. A page without a Tina collection entry is considered incomplete. Simple hero/intro pages belong in the shared `subpages` collection; pages with unique structures get their own collection.

A Tina collection's fields must exactly mirror the keys in the JSON file it edits — Tina drops unknown keys on save.

Images uploaded through the Tina media manager are stored in `public/images/`, matching the existing convention.

### Routing

File-based Astro routing under `src/pages/`:
- Static pages load their JSON content from `src/content/pages/`
- Dynamic routes: `/zimmer/[slug].astro`, `/angebote/[slug].astro`, `/blog/[slug].astro` — pull from their respective Markdown collections
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
