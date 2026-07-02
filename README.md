# Website-NabilChebili

Site personnel de Nabil Chebili : Cloud & DevOps (Azure), photographie et musique.
Hébergé sur **Azure Static Web Apps**, avec redirection vers le domaine personnalisé
[www.nabilchebili.fr](https://www.nabilchebili.fr).

## Structure du dépôt

```
.
├── portfolio-photo/       Application Astro (le site en lui-même)
│   ├── src/pages/          Pages : index, photo, clouddevops, musique, gaming
│   ├── src/components/     Composants Astro (ex: Gallery.astro)
│   ├── src/data/           galleries.json : mapping galerie -> container blob public
│   └── public/             Assets statiques (logo, favicon, images de repli)
├── api/                    Azure Functions liées à la Static Web App
│   └── health/              Endpoint de health check (GET /api/health -> "ok")
├── terraform/               Infrastructure as Code (Static Web App + Storage Account)
├── staticwebapp.config.json Config globale SWA (redirection racine vers www.nabilchebili.fr)
└── .github/workflows/        Pipeline CI/CD (Azure Static Web Apps deploy)
```

## Le site (`portfolio-photo/`)

Application [Astro](https://astro.build) en mode `output: 'static'` (build 100% statique, requis
pour Azure Static Web Apps). Sitemap généré via `@astrojs/sitemap`.

### Pages

- `/` — page d'accueil, liens vers les 4 sections
- `/clouddevops` — projets et retours d'expérience Cloud/DevOps
- `/photo` — galeries photo (voir ci-dessous)
- `/musique` — section musique
- `/gaming` — section gaming

### Galeries photo

Les photos ne sont **pas** commitées dans le dépôt : elles sont hébergées sur un **Storage
Account Azure** sous forme de containers blob publics. `src/data/galleries.json` associe chaque
galerie à l'URL de son container public :

```json
{
  "londres": "https://<storage-account>.blob.core.windows.net/photopublic/Londres/",
  "paris": "https://<storage-account>.blob.core.windows.net/photopublic/GR1-1/"
}
```

Au build/à l'exécution, `src/pages/photo.astro` interroge l'API de listing de blobs Azure
(`?restype=container&comp=list`) sur chaque URL de `galleries.json` pour récupérer dynamiquement
la liste des photos du dossier, puis affiche la galerie via le composant `Gallery.astro`. Si le
listing échoue (container vide, offline, etc.), un jeu d'images de repli dans `public/photos/`
est utilisé à la place.

Pour ajouter une galerie : créer/uploader les photos dans un nouveau "dossier" (préfixe) du
container blob public, puis ajouter l'entrée correspondante dans `galleries.json` et un bouton de
navigation dans `photo.astro`.

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

`staticwebapp.config.json` redirige toute la racine du domaine `*.azurestaticapps.net` (301) vers
`https://www.nabilchebili.fr`.

## Infrastructure (`terraform/`)

Le dossier [terraform/](terraform/) provisionne en Infrastructure as Code :

- La Static Web App Azure (SKU `Free`)
- Un Storage Account (`Standard`/`LRS`, tier `Hot`) avec un container `photos` pour héberger les
  images du portfolio

Voir [terraform/README.md](terraform/README.md) pour l'utilisation, l'estimation de coût
(optimisée pour rester sous 30 €/mois) et les notes d'import de l'infrastructure existante.

> Note : les galeries actuelles (`galleries.json`) pointent vers un Storage Account existant
> (`nchphoto` / container `photopublic`) distinct de celui provisionné par ce Terraform. Voir la
> section correspondante dans `terraform/README.md` avant d'appliquer si vous souhaitez unifier
> les deux.
