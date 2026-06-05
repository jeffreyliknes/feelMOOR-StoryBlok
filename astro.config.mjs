import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { storyblok } from '@storyblok/astro';

export default defineConfig({
  integrations: [
    tailwind(),
    storyblok({
      accessToken: import.meta.env.STORYBLOK_TOKEN,
      components: {
        // Phase 3: register Storyblok wrapper components here
      },
      apiOptions: {
        region: 'eu',
      },
    }),
  ],
  site: 'https://www.feelmoor.de',
});
