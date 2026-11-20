# Website-NabilChebili

Le site personnel de Nabil Chebili — Cloud & DevOps (Azure), photographie, musique, voyages.
En ligne sur **[www.nabilchebili.fr](https://www.nabilchebili.fr)**.

C'est un site **statique** : pas de base de données, pas de serveur applicatif. Tout est calculé au
build et servi en fichiers. Les photos, elles, vivent ailleurs — dans un Storage Account Azure — et
sont listées au moment du build.

---

## Démarrer

```bash
git clone https://github.com/NabilChebili/Website-NabilChebili.git
cd Website-NabilChebili/portfolio-photo
npm install
npm run dev
```

Le site tourne sur **http://localhost:4321**. Aucune clé, aucun secret, aucun compte Azure n'est
nécessaire pour le faire tourner en local : les photos sont lues depuis un container public, et si
ce listing échoue, un jeu d'images de repli prend le relais.

| | |
| :--- | :--- |
| `npm run dev` | Serveur local, rechargement à chaud |
| `npm run build` | Build statique dans `dist/` |
| `npm run preview` | Prévisualiser le build — **c'est lui qui fait foi**, pas le serveur de dev |

---

## Le modèle mental

Cinq choses à avoir en tête avant de toucher au code. Tout le reste en découle.

**1. Une page = un fichier, mais deux sorties.** Le site est bilingue. Les pages vivent sous
`src/pages/[...lang]/` et sortent en français (sans préfixe) **et** en anglais (sous `/en/`). Le
gabarit ne s'écrit qu'une fois ; seul le texte est dédoublé, dans un `const T = { fr, en }` en tête
de fichier.

**2. Les photos ne sont pas dans le dépôt.** Elles sont dans le container blob public `photos` d'un
Storage Account Azure. Au build, le site interroge l'API de listing Azure et construit les galeries
à partir de ce qu'il y trouve. Ajouter des photos à une galerie existante ne demande donc **aucune
modification de code** — seulement un upload et un redéploiement.

**3. Un seul système visuel.** Les 17 pages partagent `editorial.css` : des jetons, des primitives,
un vocabulaire. Il interdit explicitement certaines choses — dégradés, ombres portées, coins
arrondis. Ce n'est pas une préférence, c'est ce qui tient le site ensemble.

**4. Le déploiement part tout seul.** Un push sur `main` construit et déploie en production via
GitHub Actions. Il n'y a pas d'étape manuelle, donc pas de filet : ce qui est sur `main` est en
ligne quelques minutes plus tard.

**5. L'infrastructure est en Terraform**, dans `terraform/` — sauf la configuration DNS de l'apex,
qui vit hors du code (voir [Domaine](#domaine)).

---

## Où lire quoi

| Document | Quand l'ouvrir |
| :--- | :--- |
| **Ce fichier** | Comprendre le dépôt, lancer le site, faire les gestes courants |
| [`portfolio-photo/DESIGN.md`](portfolio-photo/DESIGN.md) | **Avant toute modification de mise en forme.** Le système visuel, la recette pour ajouter une page, et les pièges déjà payés |
| [`portfolio-photo/REFERENCES.md`](portfolio-photo/REFERENCES.md) | Avant un geste créatif : les références qui servent de cible |
| [`CLAUDE.md`](CLAUDE.md) | Les décisions et leurs raisons, les étapes rejetées, l'état des chantiers |
| [`terraform/README.md`](terraform/README.md) | Provisionner, estimer le coût, uploader des photos |

`DESIGN.md` n'est pas optionnel. Sa section « les pièges — déjà payés, à ne pas repayer » liste des
erreurs qui ont chacune coûté plusieurs heures, avec la mesure qui les a révélées.

---

## Ce qui va vous mordre

Les quatre pièges qu'un nouvel arrivant rencontre en premier.

**Créer une page à la racine de `src/pages/`.** Elle n'existera qu'en français, et la bascule FR/EN
mènera à un 404. Les pages vont dans `src/pages/[...lang]/`.

**Importer une feuille de style dans une page.** Une page n'importe que `global.css`. Toute autre
feuille reprend le dessus sur le système éditorial — c'est le §2 de `DESIGN.md`.

**Vérifier sur le serveur de dev.** Après quelques heures, le HMR CSS de Vite décroche et sert une
version périmée. Pour juger un rendu, passer par `npm run build && npm run preview`.

**Ajouter une entrée dans la barre de navigation.** La barre a une hauteur figée : au-delà d'une
certaine largeur de contenu, elle passe à deux lignes et déborde par-dessus la page. Le seuil de
repli dépend donc de ce qu'il y a **dedans**, pas d'une taille d'écran — toute entrée ajoutée oblige
à rebalayer les largeurs.

---

## Les gestes courants

### Ajouter des photos à une galerie existante

Uploader les fichiers dans le bon préfixe du container `photos` (la commande
`az storage blob upload-batch` est dans [`terraform/README.md`](terraform/README.md)). Rien à changer
dans le code : la liste est reconstruite à chaque build.

### Ajouter une galerie classique (une page, une grille)

1. Uploader les photos dans un nouveau préfixe du container `photos`.
2. Ajouter l'entrée dans `src/data/galleries.json`.
3. Créer `src/pages/[...lang]/<slug>.astro` sur le modèle de `croatie.astro` : `getStaticPaths()`,
   la langue lue dans le paramètre de route, un `const T = { fr, en }` pour le titre et l'intro,
   puis `<GalleryPage … lang={langue} />`.
4. Ajouter une carte dans le tableau `destinations` de `src/pages/[...lang]/photo.astro`.

### Ajouter un récit de voyage (photos en tête + étapes repliables)

Créer `src/data/<nom>.json` (`galleries` + `post`, chaque entrée de `post` portant `caption` **et**
`captionEn`), créer `src/pages/[...lang]/<nom>.astro` sur le modèle de `vietnam.astro`, ajouter une
carte dans `photo.astro`.

### Ajouter une page qui n'est pas une galerie

La recette complète est au §6 de [`DESIGN.md`](portfolio-photo/DESIGN.md). Penser à l'ajouter à
`sections()` dans `src/i18n/ui.ts` pour qu'elle apparaisse dans la navigation — puis rebalayer les
largeurs (voir le piège ci-dessus).

### Changer un texte

Texte propre à une page : dans le `const T = { fr, en }` en tête de cette page. Texte partagé — nav,
pied de page, visionneuse, bloc contact : dans `src/i18n/ui.ts`. **Dans les deux langues** : c'est le
coût assumé du bilinguisme.

---

# Référence

## Structure du dépôt

```
.
├── portfolio-photo/         Application Astro (le site en lui-même)
│   ├── src/pages/[...lang]/  Toutes les pages — une par route, deux sorties (fr + /en/)
│   ├── src/i18n/ui.ts        Chaînes du chrome et aides de route bilingues
│   ├── src/components/       PhotoGrid, AccordionSection, GalleryPage, Colophon
│   ├── src/data/             galleries.json, vietnam.json, indonesie.json
│   ├── src/lib/blobList.js   Listing des blobs Azure (partagé par toutes les galeries)
│   └── public/               Assets statiques (logo, favicon, images de repli)
├── api/                      Azure Functions liées à la Static Web App
│   └── health/                Endpoint de health check (GET /api/health -> "ok")
├── terraform/                 Infrastructure as Code (Static Web App + Storage Account)
├── staticwebapp.config.json   Config globale SWA
└── .github/workflows/          Pipeline CI/CD (Azure Static Web Apps deploy)
```

Application [Astro](https://astro.build) en mode `output: 'static'` (build 100 % statique, requis
pour Azure Static Web Apps). Sitemap généré via `@astrojs/sitemap`.

## Les pages

- `/` — accueil
- `/clouddevops`, `/musique`, `/gaming` — sections non-photo
- `/roadmap` — le parcours daté sur un rail, puis ce qui vient par thème (voir `CLAUDE.md`)
- `/photo` — **hub récapitulatif** : une carte (photo de couverture + titre) par destination,
  qui renvoie vers la page dédiée de chaque galerie
- `/vietnam`, `/indonesie` — récit de voyage : quelques photos « Post » en tête (grille + légende
  courte), puis chaque étape du voyage en **accordéon repliable** (mini titre + nombre de photos +
  aperçu miniature, la grille complète s'affiche au clic)
- `/illumination`, `/londres`, `/gr1-1`, `/gr1-2`, `/gr1-3`, `/mariage`, `/croatie`, `/supersonic`,
  `/event-databricks` — une page par galerie classique, chacune une simple grille de photos

Chacune existe aussi sous `/en/`.

## Deux langues

Toutes les pages vivent sous `src/pages/[...lang]/` et sortent **en deux exemplaires** : le français
sans préfixe (`/photo`), l'anglais sous `/en/` (`/en/photo`). Le gabarit ne s'écrit qu'une fois ;
seul le texte est dédoublé, dans un `const T = { fr, en }` en tête de page. Les chaînes communes —
nav, pied de page, visionneuse, bloc contact — vivent dans `src/i18n/ui.ts`.

⚠️ **Ne jamais créer une page à la racine de `src/pages/`** : elle n'existerait qu'en français et la
bascule FR/EN mènerait à un 404. Le slug, lui, ne se traduit pas (`/croatie` et `/en/croatie`).

Le détail et les pièges sont dans [CLAUDE.md](CLAUDE.md#site-bilingue--français--anglais).

## Composants photo

- **`PhotoGrid.astro`** — brique de base réutilisée partout : grille de cartes de taille uniforme
  (crop 4:5), clic sur une photo → visionneuse plein écran (feuilletage au doigt, zoom molette et
  pincement, pan, télécharger, partager). Accepte soit un tableau d'URLs, soit un tableau
  `{ url, caption }` pour afficher une légende sous chaque photo.
- **`AccordionSection.astro`** — enveloppe une `PhotoGrid` dans un `<details>` repliable (titre +
  nombre de photos + 4 miniatures en aperçu quand fermé). Utilisé pour chaque étape des pages
  Vietnam/Indonésie afin de ne pas charger des centaines de photos d'un coup.
- **`GalleryPage.astro`** — page-type pour une galerie unique (lien de retour vers `/photo`, titre,
  intro, en-tête de section avec le nombre de photos, puis `PhotoGrid`), utilisée par les 9 pages de
  galeries classiques qui ne font que lui passer l'URL du container et le titre. Accepte aussi
  `password` pour masquer une galerie derrière un voile — aucune ne l'utilise aujourd'hui.
- **`Colophon.astro`** — le bloc de contact qui clôt les pages intérieures. Ne porte que le
  balisage, son habillage vient de `editorial.css`.

## Styles

Les 17 pages partagent un seul système visuel, documenté dans
**[DESIGN.md](portfolio-photo/DESIGN.md)** : jetons, primitives, mécanisme de révélation, recette
pour ajouter une page, et les pièges déjà rencontrés. Quatre feuilles seulement :

- `editorial.css` — le système, chargé par `header.astro` donc par toutes les pages
- `home-editorial.css` — ce qui n'existe que sur l'accueil
- `layout.css` — coque de l'en-tête et nav
- `global.css` — palette héritée et reset

⚠️ **Une page ne doit importer que `global.css`.** Une feuille importée par la page reprend le
dessus sur le système — voir §2 de DESIGN.md.

Le `<main>` est porté par `header.astro` et reçoit sa classe par la propriété `mainClass`
(`mainClass="page editorial"`). Les pages n'émettent pas le leur.

## Galeries photo — comment ça marche

Les photos ne sont **pas** commitées dans le dépôt : elles sont hébergées dans le container blob
public `photos` du Storage Account Azure `stnchvlqvproduction` (provisionné par `terraform/`).

- `src/data/galleries.json` — mapping `clé -> URL du « dossier » (préfixe) blob` pour les galeries
  classiques.
- `src/data/vietnam.json` / `indonesie.json` — `{ galleries: { slug: url }, post: [{ url, caption, captionEn }] }`.
  `galleries` liste les étapes du voyage (une par sous-dossier blob), `post` les photos mises en
  avant en haut de page avec leur légende.
- `src/lib/blobList.js` — `listBlobsFromPublicContainer(url)` interroge l'API de listing Azure
  (`?restype=container&comp=list`) pour récupérer dynamiquement, **au build**, la liste des photos
  d'un préfixe. `listGalleries(galleries, fallback)` fait ça pour un objet entier de galeries en
  une fois. Si le listing échoue, un jeu d'images de repli dans `public/photos/` est utilisé.

## API (`api/`)

Azure Functions déployées avec la Static Web App (voir `api_location` dans le workflow CI/CD).
Actuellement : `health` — `GET /api/health` renvoie `200 ok`.

## Déploiement (CI/CD)

Le workflow [.github/workflows/azure-static-web-apps-black-glacier-0a60bca03.yml](.github/workflows/azure-static-web-apps-black-glacier-0a60bca03.yml)
construit et déploie automatiquement sur push/PR vers `main` :

- `app_location`: `/portfolio-photo`
- `api_location`: `/api`
- `output_location`: `dist`

Le jeton de déploiement est stocké dans le secret GitHub `AZURE_STATIC_WEB_APPS_API_TOKEN_NCH`
(pointe vers la Static Web App `stapp-nch-mdem-production` provisionnée par `terraform/`).

`staticwebapp.config.json` ne fait que fixer les headers globaux (plus de redirection catch-all —
`www.nabilchebili.fr` est directement servi par cette Static Web App, une redirection `/*` casserait
toutes les routes).

## Domaine

- `www.nabilchebili.fr` — CNAME chez IONOS vers la Static Web App, custom domain Azure validé
  (SSL auto). **Ne pas** cocher « Domain forwarding for the www subdomain » côté IONOS : ça écrase
  le CNAME.
- `nabilchebili.fr` (apex) — **sert désormais le site directement en HTTPS** (vérifié : `200`),
  et le HTTP y redirige en 301 vers l'apex en HTTPS, non plus vers `www`. La description
  précédente — une redirection IONOS vers `www` — est caduque. Le mécanisme exact (enregistrement
  et certificat) reste à confirmer contre la zone DNS avant d'y toucher ; `terraform/main.tf` ne
  déclare toujours que le domaine `www`.

## Infrastructure (`terraform/`)

Le dossier [terraform/](terraform/) provisionne en Infrastructure as Code, dans la subscription
Azure `sub-ishane-nch`, région `westeurope` (seule région proche de la France supportant Static
Web Apps) :

- Resource Group `rg-nch-production`
- Static Web App `stapp-nch-mdem-production` (SKU `Free`) + custom domain `www.nabilchebili.fr`
- Storage Account `stnchvlqvproduction` (`Standard`/`LRS`, tier `Hot`) avec un container `photos`
  en accès public **container** (lecture + listing anonymes, nécessaire pour le listing dynamique
  des galeries)

Voir [terraform/README.md](terraform/README.md) pour l'utilisation, l'estimation de coût
(optimisée pour rester sous 30 €/mois — coût réel de l'ordre de quelques centimes par mois) et la
commande d'upload des photos.
