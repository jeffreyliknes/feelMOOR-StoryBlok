# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

feelMOOR is a luxury health resort website (https://www.feelmoor.de) for a thermal spa hotel in Bad Wurzach, Germany. The site is German-language with a minimal English homepage at `/en`.

## Commands

```bash
npm run dev       # Start dev server (Astro)
npm run build     # Build static site to dist/
npm run preview   # Preview production build locally
```

No lint or test scripts are configured.

## Architecture

**Stack:** Astro 5 (static site), Tailwind CSS 3, TypeScript. Deployed on Vercel as a static export.

### Content Layer

Content lives in two forms:
- **Markdown collections** (`src/content/rooms/`, `src/content/packages/`, `src/content/blog/`) — individual entries with YAML frontmatter. Schemas defined in `src/content/config.ts` via Zod.
- **JSON page data** (`src/content/pages/`) — structured data for static pages (homepage, therme, gesundheit, etc.) and global settings (`src/content/settings/site.json`).

The CMS is **Pages CMS** — its field definitions live in `pages.config.yml`. Editors manage content through the Pages CMS UI which writes directly to these files.

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
- Documented for editors at the top of `pages.config.yml`.

### Images

Static images are served from `public/images/`. Logos are in `public/images/Logos/`.
