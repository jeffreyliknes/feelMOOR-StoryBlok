import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// Server-rendered on Vercel so the Storyblok visual editor can preview drafts
// and published content goes live without a rebuild.
export default defineConfig({
  integrations: [tailwind()],
  site: 'https://www.feelmoor.de',
  output: 'server',
  adapter: vercel(),
});
