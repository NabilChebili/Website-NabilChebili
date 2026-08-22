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
- `nabilchebili.fr` (apex) = redirection HTTP chez IONOS vers `https://www.nabilchebili.fr` (pas
  d'ALIAS/ANAME sur l'offre IONOS standard, et Azure ne facilite pas l'apex sans ça).
- **Piège rencontré** : la case "Domain forwarding for the www subdomain" dans l'écran de
  redirection IONOS **écrase le CNAME `www` existant**. Ne jamais la cocher — la redirection doit
  cibler uniquement l'apex, le `www` reste géré par un CNAME classique dans la zone DNS.

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

Les 16 pages partagent désormais un seul système visuel. **La référence est
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
- **Orbite de logos et pastilles en verre dépoli sur `/clouddevops`** : incompatibles avec un système
  qui interdit dégradés, lueurs et ombres portées. Les logos restent, posés à plat.
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
- **Push / PR** : 7 commits locaux sur `feat/home-cinematic`, rien poussé. Chaque push déclenche un
  déploiement réel, donc attendre la demande explicite.
- **TLS de l'apex `nabilchebili.fr`** : diagnostic clos, correctif écrit et parqué. `https://nabilchebili.fr`
  n'a aucun certificat (alerte TLS 80, confirmée en IPv4 et IPv6) ; le certificat de `www` ne porte
  que le SAN `www.nabilchebili.fr`. Correctif retenu : rattacher l'apex à la SWA via un `A` vers
  `stableInboundIP` + un `TXT` de validation chez IONOS, puis aligner `terraform/main.tf` par
  `terraform import`.
- **Sept galeries jamais revues visuellement une par une** (`event-databricks`, `illumination`,
  `londres`, `mariage`, `gr1-1`, `gr1-2`, `gr1-3`). Elles passent par `GalleryPage`, le même
  composant que `croatie` et `supersonic` qui ont été revues, et elles passent le script de contrôle.
