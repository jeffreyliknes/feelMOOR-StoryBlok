# feelMOOR-StoryBlok

Luxury health resort website. Built with Astro 5, Storyblok, and Tailwind CSS. Deployed on Vercel.

This is the Storyblok-backed version of feelMOOR, forked from the TinaCMS project. Content lives in a Storyblok space (not in git); the site fetches it from the Content Delivery API.

## Setup

**Prerequisites:** Node.js 20+, access to the Vercel project and the Storyblok space.

```bash
# 1. Install dependencies
npm install

# 2. Provide the Storyblok tokens in .env (project root):
#    STORYBLOK_PREVIEW_TOKEN=...   (read: Content Delivery API)
#    STORYBLOK_PERSONAL_TOKEN=...  (write: only needed for the migration scripts)
#    Or: npx vercel link && npx vercel env pull

# 3. Start the dev server
npm run dev
```

Dev server runs at `http://localhost:4321`. In dev, pages fetch **draft** content so unpublished edits are visible.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro dev server (fetches Storyblok draft content) |
| `npm run build` | Build the SSR app for Vercel |
| `npm run preview` | Preview the production build locally |

## Architecture

- **Astro 5, SSR** (`output: 'server'` + `@astrojs/vercel`) — file-based routing under `src/pages/`, rendered on demand so published content goes live with no rebuild.
- **Storyblok** — the content source. Components (bloks) mirror the old Tina schema. Pages fetch via the Content Delivery API in `src/lib/storyblok.ts`.
- **`src/lib/storyblok.ts`** — `getStory` / `getStories` fetch and flatten content (asset fields → URL strings, blok lists → arrays); `renderRichText` for richtext bodies; `lines()` for "one per line" text fields; `sbe()` adds visual-editor click-to-edit attributes.
- **Vercel** — SSR deployment with 60+ SEO redirects in `vercel.json`.

## Content editing (Storyblok Visual Editor)

Editors work in the Storyblok app. The Visual Editor loads the live site in an iframe (preview URL set in Space Settings → Visual Editor) and edits each section in place. Hitting **Publish** makes the change live on the next page request, no deploy needed.

## Migration scripts (one-time, in `scripts/storyblok/`)

- `define-components.mjs` — creates/updates all Storyblok components from the schema.
- `migrate-content.mjs` — reads the original `src/content/**` files, uploads referenced images to Storyblok assets, and creates the stories. Kept for reference; not part of the build. (The original content files were removed after migration; recover them from git history if you ever need to re-run.)
