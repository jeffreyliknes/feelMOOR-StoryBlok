# feelMOOR

Luxury health resort website for [feelmoor.de](https://www.feelmoor.de). Built with Astro 5, TinaCMS, and Tailwind CSS. Deployed on Vercel.

## Setup

**Prerequisites:** Node.js 20+, access to the Vercel project and GitHub repo.

```bash
# 1. Install dependencies
npm install

# 2. Get environment variables (requires Vercel CLI + project access)
npx vercel link
npx vercel env pull

# Alternative: ask a teammate for the .env file and place it in the project root.

# 3. Start the dev server (Astro + TinaCMS)
npm run dev
```

The site runs at `http://localhost:4321`. The TinaCMS editor runs at `http://localhost:4321/admin`.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with TinaCMS |
| `npm run build` | Build static site to `dist/` |
| `npm run preview` | Preview production build locally |

## Architecture

- **Astro 5** — static site generator, file-based routing under `src/pages/`
- **TinaCMS** — CMS config in `tina/config.ts`, edits content files in `src/content/`
- **Content** — JSON page data in `src/content/pages/`, Markdown collections in `src/content/rooms/`, `src/content/packages/`, `src/content/blog/`
- **Vercel** — static export deployment with 60+ SEO redirects in `vercel.json`

## Content editing

Editors log in at `/admin` on the live site. Changes commit directly to `main` and trigger a Vercel redeploy.

## Change Request workflow

Editors can file a change request through the CMS (the "Change Requests" collection). Submitting one commits a Markdown file to `src/content/requests/`, which triggers a GitHub Action that uses Claude to implement the change and open a PR for review.

Requires the `ANTHROPIC_API_KEY` secret set in GitHub repo settings.
