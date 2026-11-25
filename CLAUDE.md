# CLAUDE.md — contexte du projet Website-NabilChebili

Instructions et contexte pour reprendre ce projet dans une future session. Le [README.md](README.md)
documente l'architecture ; ce fichier documente les décisions, pièges et préférences qui ne s'y
trouvent pas.

## Vue d'ensemble

Site personnel Nabil Chebili : Astro statique + Azure Static Web Apps + Storage Account pour les
photos, tout géré en Terraform. Domaine `www.nabilchebili.fr` chez IONOS.

## Préférences de travail (important)

- **Ne push sur GitHub que quand l'utilisateur le demande explicitement.** Committer localement
  après chaque changement logique, mais ne pas lancer `git push` sans confirmation — l'utilisateur
  regarde les diffs en local et préfère batcher plusieurs changements avant de déployer (chaque
  push déclenche un déploiement CI/CD réel).
- Avant tout `terraform apply` réel, montrer le `plan` et demander confirmation.
- Ne jamais afficher en clair un secret (token de déploiement SWA, connection string storage) —
  toujours le piper directement dans la commande consommatrice (`gh secret set`, `az storage ... --connection-string "$(terraform output -raw ...)"`).

## Azure / Infrastructure

- Subscription cible : **`sub-ishane-nch`** (`2b079b5a-5da0-427c-a95a-53913e2af58c`), tenant
  i-shane.com. Le compte a accès à des centaines d'autres subscriptions (environnement pro) — bien
  vérifier `az account show` avant toute action.
- **Azure Static Web Apps n'est PAS disponible en `francecentral`** (ni dans la plupart des
  régions EU). Régions supportées : `centralus`, `eastus2`, `westus2`, `westeurope`, `eastasia`.
  On a mis **tout** (RG, storage, SWA) en `westeurope` pour rester dans une seule région et éviter
  toute confusion sur les coûts de transfert (qui de toute façon n'existent pas ici : les photos
  sont chargées directement par le navigateur depuis le Storage Account, pas via un proxy SWA).
- Le container blob `photos` doit être en accès public **`container`** (pas `blob`) : le listing
  anonyme (`?restype=container&comp=list`) utilisé par `blobList.js` a besoin du niveau
  `container`, `blob` ne permet que la lecture directe d'un blob connu, pas le listing.
- Nommage : CAF (Cloud Adoption Framework) via le provider Terraform `aztfmod/azurecaf` pour la
  Static Web App et le Storage Account (préfixes `stapp-`, `st`, suffixe aléatoire pour l'unicité
  globale). Le Resource Group utilise un nom simple (`rg-nch-production`) sans passer par
  `azurecaf_name`, pour éviter un remplacement forcé à chaque plan (une ressource dont le nom
  dépend d'un output "known after apply" déclenche un replace même si la valeur finale est
  identique).
- `azurecaf` : le type de ressource pour une Static Web App s'appelle `azurerm_static_site` (pas
  `azurerm_static_web_app`) dans la liste `resource_type` supportée par le provider.
- Domaine ancien : le site utilisait avant un Storage Account `nchphoto` (container `photopublic`)
  hors de cette subscription. Toutes les galeries ont été migrées vers `stnchvlqvproduction` /
  container `photos` (voir historique git pour le détail par galerie).

## DNS / IONOS

- `www.nabilchebili.fr` = CNAME vers `<default_host_name>` de la Static Web App (validation
  `cname-delegation` côté Terraform).
- `nabilchebili.fr` (apex) = **sert le site directement en HTTPS** (mesuré le 17/11/2026 : `200`
  en HTTPS, et le HTTP y redirige en 301 vers l'apex en HTTPS, non plus vers `www`). Ce n'est donc
  plus la redirection IONOS décrite ici auparavant. Le mécanisme exact — enregistrement DNS et
  certificat — reste à confirmer contre la zone avant d'y toucher, et `terraform/main.tf` ne déclare
  toujours que le domaine `www`.
- **Piège rencontré** : la case "Domain forwarding for the www subdomain" dans l'écran de
  redirection IONOS **écrase le CNAME `www` existant**. Ne jamais la cocher — la redirection doit
  cibler uniquement l'apex, le `www` reste géré par un CNAME classique dans la zone DNS.

## Site bilingue — français / anglais

- **Le français n'a pas de préfixe**, l'anglais vit sous `/en/`. Les URL françaises
  étaient indexées et le domaine est en `.fr` : les déplacer aurait coûté le
  référencement acquis pour rien.
- **Une seule page par route, deux sorties.** Toutes les pages vivent sous
  `src/pages/[...lang]/` avec un `getStaticPaths()` qui renvoie
  `[{ lang: undefined }, { lang: "en" }]`. Le gabarit ne s'écrit donc qu'une fois ;
  seul le texte est dédoublé. **Ne jamais recréer une page à la racine de
  `src/pages/`** : elle n'existerait qu'en français et la bascule mènerait à un 404.
- **Où vit quoi** : les chaînes du chrome (nav, pied, visionneuse, bloc contact)
  dans `src/i18n/ui.ts` ; le texte propre à une page dans un `const T = { fr, en }`
  en tête de cette page, pour voir les deux versions côte à côte en les modifiant.
- **Les légendes de photos** ont une clé `captionEn` à côté de `caption` dans
  `src/data/vietnam.json` et `indonesie.json`. Une photo ajoutée sans `captionEn`
  retombe sur le français plutôt que de n'afficher rien.
- **Le slug ne se traduit pas** : `/croatie` et `/en/croatie`. Un slug traduit
  obligerait à tenir une table de correspondance pour que la bascule retombe sur la
  bonne page, pour un gain nul sur des galeries personnelles.
- **La bascule** est dans `header.astro`, hors du menu repliable : c'est l'état de
  la page courante, pas une destination de plus. Elle ne prend donc pas les
  crochets `[ ]`, qui dans ce système signalent « ceci mène ailleurs ».
- **Piège** : ne pas calibrer un `--titre-div` propre à l'anglais. Ce diviseur fixe
  le **corps** du titre, pas la largeur qu'il occupe — mesure à l'appui, « Musique »
  n'occupe déjà que 41 % de la largeur disponible. Un diviseur réduit pour « MUSIC »
  l'avait sorti à 244px contre 174 en français.
- **Coût à connaître** : toute modification de contenu se fait désormais deux fois.

## Page Roadmap

- **Deux temps, deux grammaires.** *Le parcours* — ce qui est fait — est daté, sur
  un rail vertical qui s'arrête sur la dernière chose livrée. *La suite* est **sans
  dates**, rangée par thème en colonnes. Un projet qui n'a pas de date ne doit pas
  en inventer une : le poser sur une frise le ferait mentir.
- **Le tracé suit le défilement** et bute sur la marque de la dernière livraison,
  jamais au-delà — au-delà il dirait qu'on est déjà dans ce qui vient. À l'arrivée
  la page descend d'elle-même jusqu'à ce jalon, **une seule fois**, et rend la main
  au premier geste : molette, doigt, clic ou touche. En mouvement réduit, aucune
  descente n'est imposée.
- **Le contenu vit en haut du fichier**, dans `src/pages/[...lang]/roadmap.astro` :
  `parcoursBase` porte les horizons et le drapeau `dernier: true` ; `parcoursFr` /
  `parcoursEn` et `suiteFr` / `suiteEn` portent le rédigé. Séparer l'invariant du
  texte évite le piège rencontré sur `/clouddevops`, où une pastille tenait au
  **texte français** d'une période et disparaissait en anglais.
- **Registre des intitulés.** Le parcours parle du métier, jamais de
  l'implémentation : aucune référence client, aucun identifiant interne, aucun nom
  d'outil. « Accompagnement d'architecture Cloud » et non la liste des modules
  Terraform — c'est une page publique.
- **Les jalons sont sourcés, pas inventés** : dates de commits, CV, profil public,
  messagerie. Un horizon au mois dès que le mois est connu ; annoncer un trimestre
  quand on a la date exacte est une perte de précision.
- **Les colonnes sont en `auto-fit`** : ajouter ou retirer un thème ne demande
  aucune retouche de la grille.

## Admin, statistiques, commentaires, accès anticipé Chine (25/11/2026)

- **`/admin`** (FR seulement, hors de `[...lang]` : volontaire, page privée) est réservée au rôle
  `admin` de Static Web Apps, attribué par **invitation** à deux comptes (GitHub et Microsoft). Le MFA
  est celui du fournisseur. Aucune auth maison. `/connexion` est la porte ; les 401/403 y redirigent.
- **La frontière de sécurité, c'est l'API, pas le HTML.** Testé à l'émulateur : `/admin/`,
  `/admin/index.html`, `/admin//` sont refusés, mais `/ADMIN/` ou `/%61dmin/` servent la coquille
  HTML (disque insensible à la casse, routes sensibles à la casse). Ce n'est pas une fuite : la page
  ne porte rien de secret (son source est public sur GitHub) et toutes les données passent par
  `/api/gestion/*`, qui **revérifie le rôle dans la fonction** (`refusAdmin`) et exige l'en-tête
  `x-demande: admin` sur les écritures (anti-CSRF). Ne jamais mettre de donnée sensible dans le
  HTML de l'admin au build.
- **`/api/gestion` et non `/api/admin`** : Azure Functions réserve le préfixe de route `admin`.
- **`staticwebapp.config.json` vit dans `portfolio-photo/`** (l'`app_location`). À la racine du
  repo il était ignoré : la prod servait `referrer-policy: same-origin` au lieu de la valeur
  configurée.
- **L'API Functions n'avait jamais tourné** : `api/health` (modèle v3 sans `function.json`)
  répondait 404 en prod. Elle est passée au modèle v4 (`api/src/functions/*.js`), runtime
  `node:20` déclaré dans la config SWA. Tables Azure (`stats`, `commentaires`, `chineip`,
  `limites`) créées par l'API à la première écriture. App settings requis : `STOCKAGE_CONNEXION`,
  `CHINE_CONTENEUR` (`attente`).
- **Stats** : compteur maison, sans cookie ni IP (`/api/vue`, beacon dans `header.astro`).
  Agrégats par jour (heure de Paris). DNT/GPC et robots ignorés. Case « ne pas compter mes
  visites » dans l'admin (clé `localStorage` `nch-sans-stats`).
- **Commentaires** sur `/vietnam`, `/indonesie` et `/chine` (une fois ouverte) : rien n'est public
  avant validation dans l'admin. Anti-spam : champ piège, délai ≥ 3 s, 4 par heure et par
  empreinte d'IP (HMAC, l'IP elle-même n'est pas stockée). Affichage en `textContent` partout.
- **Accès anticipé Chine par IP** : `/chine/apercu` réutilise `ChineContenu.astro` avec la base
  `/api/chine/photo/`, qui vérifie l'IP puis redirige vers un SAS d'1 h du conteneur **privé**
  `attente/Chine/`. Les photos Chine ne doivent **pas** aller dans `photos/` (public et listable)
  avant le 10/12, sinon la restriction ne sert à rien.
- **L’IP du visiteur = la DERNIÈRE entrée de `x-forwarded-for`, rien d autre.** Mesuré en prod le
  25/11/2026 en forgeant chaque en-tête : `x-azure-clientip`, `x-client-ip` et `x-real-ip` ne sont
  pas posés par Static Web Apps (le client y met ce qu’il veut), et SWA **garde** le
  `x-forwarded-for` envoyé par le client en y **ajoutant** l’adresse vue à la fin. La première
  version lisait la première entrée : n’importe qui pouvait se faire passer pour une IP autorisée.
  Rejouer le test de falsification après tout changement de plateforme (Front Door, CDN).
- **Terraform** : aucun état local pour ce projet (un `plan` voudrait tout recréer). Les app
  settings sont déclarés dans `main.tf` mais posés via `az` en attendant.
- **Test local** : Functions Core Tools refuse Node 24. Lancer `func` avec un Node 20
  (`languageWorkers__node__defaultExecutablePath`), Azurite pour le stockage, puis
  `swa start portfolio-photo/dist --api-devserver-url http://localhost:7071 --swa-config-location portfolio-photo`.
  `cd api && npm test` pour les tests unitaires.

## Architecture du site photo (évolution récente)

Le site a été refait plusieurs fois dans la même session avant de converger ; la version actuelle :

1. **`PhotoGrid.astro`** = la brique de base partout : grille de cartes uniformes (crop 4:5) +
   lightbox complet (zoom, pan, télécharger, partager). Accepte `photos` = tableau d'URLs OU de
   `{url, caption}`.
2. **`AccordionSection.astro`** = `PhotoGrid` dans un `<details>` repliable, pour ne pas charger
   des centaines de photos d'un coup sur les pages Vietnam/Indonésie.
3. **`GalleryPage.astro`** = mini page-type (titre + intro + `PhotoGrid`) pour les 7 galeries
   classiques — chaque fichier dans `src/pages/` ne fait que lui passer `title`/`intro`/`galleryUrl`.
4. **`/photo`** = hub récapitulatif (grille de 9 cartes avec photo de couverture), plus de galeries
   affichées directement sur cette page.

Étapes de design rejetées en cours de route (pour ne pas les proposer à nouveau sans raison) :
- Scrollytelling (photo sticky + texte qui défile) pour les photos "Post" → jugé trop long/lourd
  à maintenir, remplacé par une grille de cartes avec légende courte (1 phrase).
- Masonry (colonnes, ratio naturel) pour les cartes "Post" → l'utilisateur a préféré la grille
  uniforme + clic-pour-zoomer (comme les autres galeries) plutôt que des hauteurs de colonne
  inégales.
- Toggle-boutons pour choisir une galerie à la fois (ancien pattern de `/photo`) → remplacé par
  l'accordéon (tout visible en continu, mais replié pour ne pas surcharger) pour Vietnam/Indonésie,
  et par des pages dédiées + hub pour les galeries classiques.

Légendes des photos "Post" (Vietnam/Indonésie) : rédigées par un agent qui a regardé chaque photo
(vision) — pas de légende sur les galeries d'étape (trop coûteux en tokens pour ~290 photos, voir
discussion dans l'historique de conversation si on veut le faire un jour, budget estimé 1,5-1,8M
tokens).

## Outils / environnement

- `gh` CLI installé via winget (`C:\Program Files\GitHub CLI\gh.exe`), authentifié en tant que
  `NabilChebili`. Pas dans le PATH par défaut des nouveaux shells Bash → ajouter
  `export PATH="$PATH:/c/Program Files/GitHub CLI"` avant d'utiliser `gh`.
- Playwright utilisé ponctuellement pour vérifier visuellement des changements (pas de
  `chromium-cli` dispo sur cette machine) : installer dans un dossier scratch temporaire
  (`npm install playwright --no-save`), jamais dans `portfolio-photo/` (ne pas polluer le
  `package.json` du projet). Nettoyer après usage.
- Un hook `rtk` (Rust Token Killer) réécrit certaines commandes Bash de façon transparente — si une
  commande échoue de façon inattendue avec un message `[RTK:PASSTHROUGH]`, ce n'est pas une vraie
  erreur, la commande sous-jacente s'exécute quand même en fallback.

## Refonte éditoriale — état au 23/08/2026

Les 17 pages partagent désormais un seul système visuel. **La référence est
[`portfolio-photo/DESIGN.md`](portfolio-photo/DESIGN.md)** : jetons, primitives, mécanisme de
révélation, recette pour ajouter une page, et la liste des pièges déjà payés. À lire avant tout
ajustement de mise en forme — plusieurs de ces pièges ont coûté des tours entiers.

### Ce qui a changé

- Le système vit dans `src/styles/editorial.css`, importée par `header.astro` donc par toutes les
  pages. `home-editorial.css` ne garde que ce qui est propre à l'accueil.
- Les quatre feuilles héritées (`index.css`, `photo.css`, `clouddevops.css`, `musique.css`) ont été
  supprimées : plus personne ne les importait, et elles reprenaient le dessus sur le système.
- `header.astro` porte l'unique `<main>` (il y en avait deux imbriqués par page) et reçoit sa classe
  par `mainClass`. Il porte aussi le mécanisme de révélation, désormais disponible partout.
- Nouveau composant `Colophon.astro` pour le bloc de contact des pages intérieures.

### Étapes de design rejetées (ne pas les reproposer sans raison)

- **Noir et blanc sur les photos** : le filtre restait appliqué en permanence sur mobile, où le
  survol n'existe pas.
- **Filet blanc sous les photos des cartes** : en `var(--paper)`, soit la couleur exacte du fond de
  page, il se confondait avec le fond au repos et donnait l'impression d'une photo rognée de 2px.
- **Pastilles en verre dépoli sur `/clouddevops`** : incompatibles avec un système qui interdit
  dégradés, lueurs et ombres portées.
- **L'orbite des logos, elle, a été redemandée et remise** (23/08 au soir), redessinée en filets SVG
  de 1px : l'utilisateur la trouvait plus belle que la rangée à plat, et voulait « une animation qui
  correspond au cloud, comme les planètes du système solaire ». Un motif animé n'est donc pas
  interdit sur ce site — ce sont les effets (dégradé, lueur, ombre) qui le sont.
- **Animation permanente sur le titre de l'accueil** : cinq variantes fabriquées et essayées
  (respiration de la graisse, vague au curseur, balayage lumineux, soulèvement des lettres, et la
  combinaison des deux dernières). Verdict de l'utilisateur : « ça fait pas très pro ». Abandonné.
  Note technique si le sujet revient : l'axe de graisse de Sofia Sans Condensed s'arrête à 900 et le
  titre est déjà à 800 — il ne reste que 100 unités de marge, donc l'amplitude doit venir de la
  verticale, pas de la graisse.
- **Soulignement de crochet à crochet dans la nav** : le trait passe sous les espaces de `[ ` et
  ` ]`, il encadre les crochets au lieu de souligner le mot et prend l'allure d'un champ de
  formulaire. Retenu à la place : les crochets marquent une destination, l'entrée de la page courante
  n'en porte pas, et le survol souligne le texte seul.

### En attente

- **Ajustements de mise en forme** — reprise prévue le 24/08/2026.
- **Push / PR** : la branche `feat/home-cinematic` a **37 commits** d'avance sur `origin/main` et
  n'a pas de branche amont — rien n'a jamais été poussé. Chaque push déclenche un déploiement réel,
  donc attendre la demande explicite.
- **TLS de l'apex `nabilchebili.fr`** : ~~sans certificat~~ — **résolu depuis**. Au 17/11/2026
  `https://nabilchebili.fr` répond `200`. Reste à faire : constater comment (enregistrement et
  certificat), puis aligner `terraform/main.tf`, qui ne déclare toujours que le domaine `www` — la
  configuration vit donc hors du code.
- **Sept galeries jamais revues visuellement une par une** (`event-databricks`, `illumination`,
  `londres`, `mariage`, `gr1-1`, `gr1-2`, `gr1-3`). Elles passent par `GalleryPage`, le même
  composant que `croatie` et `supersonic` qui ont été revues, et elles passent le script de contrôle.
