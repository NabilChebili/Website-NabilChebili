# Website-NabilChebili

Site personnel de Nabil Chebili : Cloud & DevOps (Azure), photographie et musique.
Hébergé sur **Azure Static Web Apps**, disponible sur [www.nabilchebili.fr](https://www.nabilchebili.fr)
et [nabilchebili.fr](https://nabilchebili.fr) (redirection).

## Structure du dépôt

```
.
├── portfolio-photo/         Application Astro (le site en lui-même)
│   ├── src/pages/            Toutes les pages (voir ci-dessous)
│   ├── src/components/       PhotoGrid, AccordionSection, GalleryPage
│   ├── src/data/             galleries.json, vietnam.json, indonesie.json
│   ├── src/lib/blobList.js   Listing des blobs Azure (partagé par toutes les galeries)
│   └── public/               Assets statiques (logo, favicon, images de repli)
├── api/                      Azure Functions liées à la Static Web App
│   └── health/                Endpoint de health check (GET /api/health -> "ok")
├── terraform/                 Infrastructure as Code (Static Web App + Storage Account)
├── staticwebapp.config.json   Config globale SWA
└── .github/workflows/          Pipeline CI/CD (Azure Static Web Apps deploy)
```

## Le site (`portfolio-photo/`)

Application [Astro](https://astro.build) en mode `output: 'static'` (build 100% statique, requis
pour Azure Static Web Apps). Sitemap généré via `@astrojs/sitemap`.

### Pages

- `/` — accueil
- `/clouddevops`, `/musique`, `/gaming` — sections non-photo
- `/photo` — **hub récapitulatif** : une carte (photo de couverture + titre) par destination,
  qui renvoie vers la page dédiée de chaque galerie
- `/vietnam`, `/indonesie` — récit de voyage : quelques photos "Post" en tête (grille + légende
  courte), puis chaque étape du voyage en **accordéon repliable** (mini titre + nombre de photos +
  aperçu miniature, la grille complète s'affiche au clic)
- `/illumination`, `/londres`, `/gr1-1`, `/gr1-2`, `/gr1-3`, `/mariage`, `/croatie` — une page par
  galerie classique, chacune une simple grille de photos

### Composants photo

- **`PhotoGrid.astro`** — brique de base réutilisée partout : grille de cartes de taille uniforme
  (crop 4:5), clic sur une photo → lightbox plein écran (zoom molette/pincement, pan, télécharger,
  partager). Accepte soit un tableau d'URLs, soit un tableau `{ url, caption }` pour afficher une
  légende sous chaque photo.
- **`AccordionSection.astro`** — enveloppe une `PhotoGrid` dans un `<details>` repliable (titre +
  nombre de photos + 4 miniatures en aperçu quand fermé). Utilisé pour chaque étape des pages
  Vietnam/Indonésie afin de ne pas charger des centaines de photos d'un coup.
- **`GalleryPage.astro`** — page-type pour une galerie unique (titre + `PhotoGrid`), utilisée par
  les 7 pages de galeries classiques (`illumination.astro`, `londres.astro`, etc.) qui ne font que
  lui passer l'URL du container et le titre.

### Galeries photo — comment ça marche

Les photos ne sont **pas** commitées dans le dépôt : elles sont hébergées dans le container blob
public `photos` du Storage Account Azure `stnchvlqvproduction` (provisionné par `terraform/`).

- `src/data/galleries.json` — mapping `clé -> URL du "dossier" (préfixe) blob` pour les 7 galeries
  classiques.
- `src/data/vietnam.json` / `indonesie.json` — `{ galleries: { slug: url }, post: [{ url, caption }] }`.
  `galleries` liste les étapes du voyage (une par sous-dossier blob), `post` les photos mises en
  avant en haut de page avec leur légende.
- `src/lib/blobList.js` — `listBlobsFromPublicContainer(url)` interroge l'API de listing Azure
  (`?restype=container&comp=list`) pour récupérer dynamiquement, **au build**, la liste des photos
  d'un préfixe. `listGalleries(galleries, fallback)` fait ça pour un objet entier de galeries en
  une fois. Si le listing échoue, un jeu d'images de repli dans `public/photos/` est utilisé.

**Pour ajouter des photos à une galerie existante** : uploader les fichiers dans le bon préfixe du
container `photos` (voir `terraform/README.md` pour la commande `az storage blob upload-batch`),
rien à changer dans le code — la liste est reconstruite à chaque build/déploiement.

**Pour ajouter une nouvelle galerie classique** (page dédiée type `/croatie`) :
1. Uploader les photos dans un nouveau préfixe du container `photos`.
2. Ajouter l'entrée dans `galleries.json`.
3. Créer `src/pages/<slug>.astro` sur le modèle des fichiers existants (3 lignes, cf. `croatie.astro`).
4. Ajouter une carte dans le tableau `destinations` de `src/pages/photo.astro`.

**Pour ajouter une nouvelle destination façon Vietnam/Indonésie** (Post + accordéon par étape) :
créer `src/data/<nom>.json` (`galleries` + `post`), créer `src/pages/<nom>.astro` sur le modèle de
`vietnam.astro`, ajouter une carte dans `photo.astro`.

### Commandes

```bash
cd portfolio-photo
npm install
npm run dev       # serveur de dev local (http://localhost:4321)
npm run build     # build statique -> dist/
npm run preview   # prévisualiser le build
```

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
  (SSL auto). **Ne pas** cocher "Domain forwarding for the www subdomain" côté IONOS : ça écrase le
  CNAME.
- `nabilchebili.fr` (apex) — redirection HTTP (301) chez IONOS vers `https://www.nabilchebili.fr`
  (le service Azure Static Web Apps n'étant pas disponible en `francecentral`, ni utilisable
  facilement en apex sans ALIAS/ANAME, IONOS gère la redirection directement).

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
(optimisée pour rester sous 30 €/mois — coût réel actuel de l'ordre de quelques centimes/mois) et
la commande d'upload des photos.
