// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',   // important pour Azure Static Web Apps
  site: 'https://www.nabilchebili.fr', // facultatif, utile pour le SEO
});
