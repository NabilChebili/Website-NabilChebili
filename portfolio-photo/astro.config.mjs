// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',   // important pour Azure Static Web Apps
  site: 'https://black-glacier-0a60bca03.6.azurestaticapps.net/', // facultatif, utile pour le SEO
});
