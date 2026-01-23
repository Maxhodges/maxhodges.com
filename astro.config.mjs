// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],
  image: {
    service: {
      entrypoint: './src/lib/cached-sharp-service.mjs'
    }
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
