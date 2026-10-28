// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',   // important pour Azure Static Web Apps
  site: 'https://www.nabilchebili.fr', // facultatif, utile pour le SEO
	// Le routage bilingue est porte par les segments [...lang] des pages, pas
	// par la config i18n d'Astro : les deux se chevaucheraient. Le sitemap, lui,
	// a besoin de connaitre les langues pour emettre les alternates hreflang.
	integrations: [
		sitemap({
			i18n: {
				defaultLocale: 'fr',
				locales: { fr: 'fr-FR', en: 'en' },
			},
		}),
	],
});
