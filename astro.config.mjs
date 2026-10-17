// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://maxhodges.com',
  integrations: [
    svelte(),
    sitemap({
      filter: (page) => !page.includes('/edit/'),
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  image: {
    service: {
      entrypoint: './src/lib/cached-sharp-service.mjs'
    }
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
