# portfolio-photo

L'application [Astro](https://astro.build) du site. Build 100 % statique
(`output: 'static'`), requis par Azure Static Web Apps, sitemap via
`@astrojs/sitemap`.

```bash
npm install
npm run dev       # serveur local — http://localhost:4321
npm run build     # build statique -> dist/
npm run preview   # prévisualiser le build
```

## Où lire quoi

Ce fichier ne décrit que le paquet npm. Tout le reste est documenté à côté,
et c'est là qu'il faut aller **avant** de toucher à une page :

| Document | Ce qu'on y trouve |
| :--- | :--- |
| [`../README.md`](../README.md) | Le dépôt : pages, galeries photo, déploiement, domaine, infrastructure |
| [`DESIGN.md`](DESIGN.md) | Le système éditorial : jetons, primitives, révélation, recette pour ajouter une page, et les pièges déjà payés |
| [`REFERENCES.md`](REFERENCES.md) | Les références visuelles qui servent de cible sur un geste créatif |
| [`../CLAUDE.md`](../CLAUDE.md) | Contexte du projet, préférences de travail, état des chantiers |

## Deux choses à savoir avant d'écrire une ligne

**Le site est bilingue.** Toutes les pages vivent sous `src/pages/[...lang]/`
et sortent en deux exemplaires : le français sans préfixe, l'anglais sous
`/en/`. Une page posée à la racine de `src/pages/` n'existerait qu'en français
et la bascule mènerait à un 404.

**Une page n'importe que `global.css`.** Toute autre feuille de mise en forme
reprend le dessus sur le système éditorial — voir §2 de `DESIGN.md`.
