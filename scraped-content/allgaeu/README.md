# Allgäu erleben: Content Scrape (Demo)

**Date:** 2026-05-29  
**Source:** Live Sitejet site at [feelmoor.de](https://www.feelmoor.de)  
**Method:** 3 parallel AI subagents + structured HTML parsing  
**Purpose:** Migrate sidebar section **ALLGÄU ERLEBEN** into the new Astro site

## Pages scraped

| Section (nav) | Live URL | New site route | Output file |
|---------------|----------|----------------|-------------|
| **Allgäu erleben** (hub) | `/allgaeu-erleben` | `/allgaeu` | `allgaeu-erleben.json` |
| Ausflugsziele | `/ausflugsziele` | `/allgaeu/ausflugsziele` | `ausflugsziele.json` |
| Action & Adrenalin | `/action-adrenalin` | `/allgaeu/action-adrenalin` | `action-adrenalin.json` |
| Aktiv sein | `/aktiv-sein` | `/allgaeu/aktiv-sein` | `aktiv-sein.json` |

## What was captured

Each JSON file includes:

- **SEO:** `page_title`, `meta_description`
- **Hero:** heading, subheading, intro copy
- **Structured content:** excursions, sights, activities, hiking routes, bike info
- **Metadata per item:** category, schedule, duration, location, highlights, external links
- **Media:** image URLs per item + full `raw_image_urls` list from HTML
- **Cross-links:** sibling pages in the Allgäu section
- **Notes:** data gaps, outdated dates, embed-only content (e.g. Outdooractive widgets)

## Summary stats

| Page | Content units | Images (unique URLs in HTML) |
|------|---------------|------------------------------|
| Allgäu erleben (hub) | 3 activity cards + 2 feature sections + 5 topic teasers | 12 |
| Ausflugsziele | 11 items (5 excursions + 6 sights) | 77 |
| Action & Adrenalin | 9 activities (5 outdoor + 4 indoor) | 73 |
| Aktiv sein | 6 hiking routes + rad/wander copy blocks | 57 |

See `manifest.json` for machine-readable overview.

## Highlights for stakeholders

1. **Speed:** All three pages scraped in parallel in under 2 minutes, including structured JSON ready for CMS import.
2. **Depth:** Not just visible text. Schedules, meeting points, distances (km), partner URLs, and CDN image paths are extracted per card.
3. **Migration-ready:** Field names map cleanly to future `src/content/pages/allgaeu-*.json` or Markdown collections.
4. **Honest gaps documented:** e.g. Moorbahn dates still say 2023, hiking routes load detail from Outdooractive embeds (not in static HTML).

## Example: one excursion record

```json
{
  "title": "Oberschwäbisches Torfbähnle",
  "category": "Besichtigung / Führung",
  "date_schedule": "von April bis Oktober - jeden 2. Sonntag und jeden vierten Samstag im Monat",
  "duration": "ca. 1 Stunde",
  "location_meeting_point": "Oberschw. Torfmuseum, Oberried",
  "highlights": ["Führung durch das Torfmuseum", "..."],
  "external_links": [{ "label": "Mehr Erfahren", "url": "https://torfbahn.de/" }]
}
```

## Next steps (optional)

- Import JSON into Astro content collections
- Download and optimize images into `public/images/allgaeu/`
- Build `src/pages/allgaeu/[slug].astro` templates (routes already in header nav)
- Refresh outdated schedules (Moorbahn) with client input

## Files in this folder

- `allgaeu-erleben.json`, `ausflugsziele.json`, `action-adrenalin.json`, `aktiv-sein.json` — structured scrape
- `manifest.json` — index and stats
- `*.raw.html` — optional raw HTML archives (if present)
