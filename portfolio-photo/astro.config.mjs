// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',   // important pour Azure Static Web Apps
  site: 'https://www.nabilchebili.fr', // facultatif, utile pour le SEO
	// Photos du stockage optimisees a la construction (WebP, tailles) la ou une
	// page passe par <Image> : /photo-video pour commencer.
	image: { domains: ['stnchvlqvproduction.blob.core.windows.net'] },
	// Le routage bilingue est porte par les segments [...lang] des pages, pas
	// par la config i18n d'Astro : les deux se chevaucheraient. Le sitemap, lui,
	// a besoin de connaitre les langues pour emettre les alternates hreflang.
	integrations: [
		sitemap({
			// Pages privees ou non indexees : /admin, /connexion, l'apercu Chine.
			filter: (page) => !/\/(admin|connexion|chine\/apercu)\/?$/.test(new URL(page).pathname),
			i18n: {
				defaultLocale: 'fr',
				locales: { fr: 'fr-FR', en: 'en' },
			},
		}),
	],
});
