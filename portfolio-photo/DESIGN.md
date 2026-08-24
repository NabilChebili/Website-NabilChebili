# Le système éditorial — référence

Toutes les pages du site partagent un seul système visuel. Ce document dit **où vit quoi**, **ce que
le système interdit**, et **les pièges** qui ont déjà coûté des allers-retours. Le [README](README.md)
documente la structure et les données ; ici c'est la mise en forme.

---

## 1. Le principe

Composition éditoriale sur fond clair, deux familles de caractères, aucun effet.

Le système a été construit sur un échantillon mesuré de 24 sites primés Awwwards, restreint ensuite
aux lauréats à fond clair. Trois constats gouvernent tout le reste :

- Les tailles de titre sont **bimodales** : soit 12-24px, soit 130-245px. Presque rien entre 40 et
  80px — et c'est exactement là que vivent les pages génériques. Les titres de page sont donc en
  `clamp(52px, 9.5vw, 150px)`, jamais entre les deux.
- 4 % seulement des sites primés utilisent la pile système pour le corps de texte. D'où deux vraies
  fontes chargées, et une seule requête Google Fonts.
- Le corps tient à 15px, l'interlignage à 145 % maximum, la longueur de ligne sous 90 caractères, et
  les capitales portent 8 à 9 % d'interlettrage (seuils de Butterick).

### Ce que le système interdit

Ces règles ne sont pas décoratives : elles sont vérifiées par le script de contrôle (§7).

| Interdit | Pourquoi |
|---|---|
| `border-radius` | Aucun coin arrondi sur les 16 pages. Un rayon suffit à faire basculer la page dans le registre « template ». |
| `box-shadow` | Idem. La hiérarchie se fait par les filets et l'échelle typographique, pas par la profondeur. |
| Dégradés, lueurs, verre dépoli | Les pastilles en verre dépoli de `/clouddevops` ont été retirées pour cette raison. L'orbite des outils, elle, a été **redessinée** dans le vocabulaire du système : pistes en SVG à filets de 1px, aucun rayon CSS, aucune ombre, et la seule couleur vient des logos. Un motif animé n'est pas interdit — les effets le sont. |
| Texte posé sur une photo | Le libellé va **sous** l'image. Les cartes de `/photo` le faisaient. |
| `text-align: justify` | Sans césure maîtrisée, le français sur colonne étroite produit des rivières de blanc. Tout est aligné à gauche. |
| Titre centré | Tout est calé sur le bord gauche, à `var(--edge)`. |
| Grayscale sur les photos | Testé et rejeté : le filtre restait appliqué en permanence sur mobile, où le survol n'existe pas. |

---

## 2. Où vit quoi

Quatre feuilles, plus les styles portés par les composants.

| Fichier | Rôle | Chargée par |
|---|---|---|
| `src/styles/global.css` | Palette héritée (`--bg`, `--muted`, `--ui-bg`), reset, `.page` | chaque page |
| `src/styles/layout.css` | Coque de l'en-tête, nav mobile, `main { padding-top }`, crochets `[ ]` et survols de la nav | `header.astro`, donc **toutes** les pages |
| `src/styles/editorial.css` | **Le système** : jetons, fond, typographie, chrome, rythme des sections, primitives, révélations, soulignements | `header.astro`, donc **toutes** les pages |
| `src/styles/home-editorial.css` | Uniquement ce qui n'existe que sur l'accueil : titre géant, bloc « qui je suis », quatre cartes | `index.astro` |

Les composants (`PhotoGrid`, `AccordionSection`, `GalleryPage`) portent leur propre `<style>` Astro,
donc à portée restreinte et de spécificité supérieure — c'est là que vit le vernis de la grille
photo, de la visionneuse et des accordéons.

### ⚠️ Ordre du cascade

Empiriquement, sur ce projet :

```
global.css  →  layout.css  →  editorial.css  →  feuilles importées par la page
```

`editorial.css` **bat** `global.css` et `layout.css`, mais **perd** contre une feuille importée par
la page elle-même. C'est ce qui a fait revenir les fonds de section alternés sur l'accueil quand le
système a été extrait : `index.css` reprenait le dessus avec
`main > section { background: var(--ui-bg) }`.

Conséquence : **une page ne doit plus importer de feuille de mise en forme**, seulement `global.css`.
Les quatre feuilles héritées (`index.css`, `photo.css`, `clouddevops.css`, `musique.css`) ont été
supprimées pour cette raison — elles sont récupérables dans l'historique git.

---

## 3. Les jetons

```css
--paper:  #f4f4f2   /* fond de page */
--ink:    #0a0a0a   /* texte principal, filets forts */
--ink-55: #5c5c58   /* texte secondaire */
--rule:   #c9c9c4   /* filets légers */
--block:  #e6e6e2   /* fond d'un cadre image en attente */

--edge: 40px        /* retrait aux bords ; 20px sous 700px */

--duree: 240ms          /* transition d'interface */
--duree-longue: 560ms   /* révélation */
--sortie: cubic-bezier(0.2, 0, 0, 1)   /* décélération */

--pas-3: 24px   --pas-6: 48px   --pas-8: 64px   --pas-10: 80px
```

Une transition d'interface tient entre 200 et 300 ms : au-delà de 500 elle est molle, en dessous de
100 elle est sèche. Il n'y a **qu'une seule rupture** dans le système : `700px`. Deux autres existent
localement (`1100px` pour les grilles à 4 colonnes, `900px` pour `.duo`).

---

## 4. Les primitives

### Structure de page

| Classe | Usage |
|---|---|
| `.tete-page` | En-tête de page : contient `.retour`, `.titre-page` et `.prose` |
| `.titre-page` | Le titre en display, Sofia Sans Condensed 800, `clamp(52px, 9.5vw, 150px)` |
| `.prose` | Texte courant, aligné à gauche, `max-width: 68ch`, `--ink-55` |
| `.retour` | Lien de retour vers la page mère, mono capitales, souligné au survol |
| `.section-head` | Intitulé de section + compteur, filet de bord à bord animé au défilement |
| `.section-head.grande` | Variante haute : intitulé en display `clamp(28px, 3vw, 40px)`. À 11px un en-tête se lit comme une étiquette et non comme un titre de chapitre — sur une page longue et structurée le squelette devient invisible. C'est le **niveau typographique intermédiaire** entre le titre de page et le corps. Utilisée sur `/clouddevops` |
| `.section-num` | Le numéro de chapitre (`01`, `02`…) placé avant l'intitulé. Toujours dans un élément non italique |
| `.colophon` | Bloc de contact de fin de page — voir le composant `Colophon.astro` |

### Contenu

| Classe | Usage |
|---|---|
| `.vignettes` / `.vignette` | Grille de vignettes 4:5, libellé **sous** l'image. 4 colonnes, 3 sous 1100px, 2 sous 700px |
| `.duo` | Texte + visuel côte à côte, colonne visuelle fixe à 360px. Empilé sous 900px, visuel en premier |
| `.bouton` | Bouton du système : filet à l'encre, aucun rayon, inversion au survol |
| `.lien` / `.prose a` | Lien dans une phrase : **souligné en permanence**, le survol épaissit le trait |
| `.meta-row` | Bandeau de métadonnées, deux blocs justifiés aux bords |

### Le `<main>` et sa classe

`header.astro` porte **l'unique `<main>`** de la page. Les pages n'en émettent plus : il y en avait
deux imbriqués sur chacune, ce que le HTML interdit. La classe se passe par la propriété
`mainClass` :

```astro
<Layout title="…" description="…" mainClass="page editorial">
```

Le drapeau `editorial` déclenche `padding: 64px 0 0` (56px sous 768px) — il fallait le redonner
explicitement, `.page` de `global.css` remettant le rembourrage à zéro dès qu'il est porté par le
`<main>` lui-même.

---

## 5. Le mécanisme de révélation

Un seul mécanisme, dans `header.astro`, disponible sur toutes les pages.

```astro
<h1 class="titre-page" data-reveal data-groupe="tete">…</h1>
```

- `data-reveal` — l'élément se révèle à son premier passage dans la fenêtre. Un `IntersectionObserver`
  avec `once` : la surveillance est retirée après le premier passage, donc **rien ne peut re-masquer
  un contenu**. Une `animation-timeline: view()` fait l'inverse — elle remet l'élément dans son état
  initial dès qu'il sort de la plage, ce qui rendait le texte invisible.
- `data-groupe="…"` — cascade de 80 ms entre voisins du même groupe, **plafonnée au 6ᵉ élément**.
- `.reveal-ok` — classe posée sur `<html>` par un script en ligne dans le `<head>`, avant le rendu.
  Tout masquage y est conditionné : **sans JavaScript, rien n'est caché**. Les pages héritées
  utilisaient `.fade-in { opacity: 0 }` levé par un `setTimeout` — sans JS, le titre de chaque page
  restait invisible.
- `.img-prete` — posée quand l'image d'un bloc est chargée. Elle ouvre l'obturateur
  (`clip-path: inset(46% 0)` → `inset(0)`), donc le cadre ne s'ouvre jamais sur du vide. Le texte,
  lui, n'attend pas l'image : le prendre en otage le rendait invisible pendant tout un chargement lent.

---

## 6. Ajouter une page

```astro
---
import "../styles/global.css";
import Layout from "../layouts/header.astro";
import Colophon from "../components/Colophon.astro";
---

<Layout title="Titre" description="…" mainClass="page editorial">
  <section class="tete-page">
    <h1 class="titre-page" data-reveal data-groupe="tete">Titre</h1>
    <div class="prose" data-reveal data-groupe="tete">
      <p>Une phrase d'intention.</p>
    </div>
  </section>

  <section>
    <div class="section-head" data-reveal data-groupe="bloc">
      <span>Intitulé</span>
      <span>(3)</span>
    </div>
    <div class="mon-bloc">…</div>
  </section>

  <Colophon />
</Layout>

<style>
  .mon-bloc {
    padding: var(--pas-3) var(--edge) 0;
  }
</style>
```

Trois règles à respecter :

1. **N'importer que `global.css`.** Toute autre feuille de mise en forme reprendrait le dessus sur le
   système (§2).
2. **`.section-head` doit être enfant direct d'une `<section>` sans retrait.** Il porte son propre
   `padding: 0 var(--edge)`, qui cale son texte, et son filet court de bord à bord. Imbriqué dans un
   conteneur déjà en retrait, le rembourrage se cumule : le texte partait à 80px au lieu de 40 et le
   filet perdait son plein cadre.
3. **Le retrait `--edge` descend d'un niveau**, sur le bloc de contenu, jamais sur la `<section>`.

---

## 7. Les pièges — déjà payés, à ne pas repayer

### Écrits en dur dans le code

- **Aucun blanc entre `<a>` et `<span>` dans un gabarit Astro.** Contrairement à JSX, Astro **ne
  supprime pas** les nœuds d'espace. Sur les entrées de nav à crochets l'espace se fondait dans celui
  du crochet, mais sur l'entrée de la page courante — qui n'en a pas — il décalait le libellé de
  4,4px.
- **Plafonner toute cascade.** `transition-delay: calc(var(--i) * 60ms)` avec `--i` = index global
  donnait **7,74 s** d'attente sur la 130ᵉ photo d'une galerie. `--i: ${i % 6}` borne à 0,3 s.
- **Tout `opacity: 0` doit être conditionné à `.reveal-ok`.** Sinon la page est vide sans
  JavaScript : les 24 cartes d'une galerie restaient invisibles pour toujours.
- **`max-width` porte sur la boîte de contenu** si `box-sizing` n'est pas `border-box`. Un
  `max-width: 1000px` avec 40px de rembourrage donne 1000px de contenu, pas 1000px de total — d'où
  une vidéo 16:9 de 563px de haut au lieu de 495.
- **Un seul soulignement par élément.** Le trait en dégradé (`background-image` +
  `background-size: 0% → 100%`) remplace `text-decoration: underline`, il ne s'y ajoute pas. Cinq
  règles vestiges superposaient deux traits à deux hauteurs différentes.
- **Le trait en dégradé souligne la boîte, pas le texte.** Porté par le lien, il court sous les
  crochets et leurs espaces. Il est donc porté par un `<span>` intérieur — sauf sur les cartes, où le
  trait pleine largeur signale que le bloc entier est actif.
- **Normaliser l'emplacement des logos.** À hauteur égale, des rapports très différents donnent des
  présences optiques inégales : un logotype large atteignait 165px et écrasait le nom du client
  au-dessus. `width` fixe + `object-fit: contain`.

### Sur la méthode de vérification

- **Un `✓` de son propre script est suspect.** Trois faux positifs sur cette refonte : « images
  cassées » (c'était l'emplacement vide de la visionneuse), « 142 cartes cachées » (elles étaient
  dans des accordéons fermés) et « bords droits faux » (je mesurais la première carte au lieu du
  conteneur de la grille).
- **Vérifier sur le build, pas sur le serveur de dev.** Après plusieurs heures, le HMR CSS de Vite
  décroche et sert une version périmée — trois vérifications de suite ont porté sur du CSS obsolète.
- **La comparaison pixel est l'outil décisif** pour un remaniement à iso-rendu. L'extraction du
  système hors de `home-editorial.css` a été validée par un accueil identique à l'octet près en
  1440×900 et 390×844.

### Le script de contrôle

Critères passés sur les 16 pages, aux deux largeurs, à chaque changement structurel :

un seul `<main>` · zéro `border-radius` · zéro `box-shadow` · aucun `[data-reveal]` ou `.photo-card`
resté sous `opacity: 0.99` (hors accordéon fermé) · aucun débordement horizontal · aucun
`text-align: justify` · fond `rgb(244, 244, 242)` · aucune image sans pixels · délai de cascade
≤ 0,4 s · console sans erreur · aucune réponse HTTP ≥ 400 · contraste ≥ 4,5:1 sur le texte courant
(≥ 3:1 au-delà de 24px ou 18,5px gras), ≥ 3:1 sur les bordures de contrôle et l'indicateur de focus ·
cible tactile ≥ 24×24px.

Et avec JavaScript coupé : tout le contenu doit rester lisible.

---

## 8. Repères externes

Les règles des sections 1 et 3 viennent d'un échantillon Awwwards et des seuils de Butterick. Celles
qui suivent viennent de référentiels publiés (WCAG, Material Design, Bringhurst) : elles couvrent ce
que le système ne mesurait pas encore — le contraste, la taille des cibles tactiles, la visibilité du
focus — et sourcent des choix qui existaient déjà sans être justifiés.

### Accessibilité — mesurable, à vérifier comme le reste

| Règle | Seuil | Source |
|---|---|---|
| Contraste du texte | ≥ 4,5:1 (texte courant), ≥ 3:1 (texte « grand » : ≥ 24px, ou ≥ 18,5px en gras) | WCAG 2.1 SC 1.4.3 |
| Contraste des éléments non textuels | ≥ 3:1 contre le fond adjacent — bordures de contrôle, indicateur de focus, icônes porteuses de sens | WCAG 2.1 SC 1.4.11 |
| Indicateur de focus | Visible au clavier sur tout élément interactif, jamais entièrement masqué par un élément fixe | WCAG 2.4.7 (AA depuis 2.0) et 2.4.11 (AA, WCAG 2.2) |
| Cible tactile | ≥ 24×24px CSS, sauf exception d'espacement ou cible en ligne dans du texte | WCAG 2.2 SC 2.5.8. La variante renforcée (AAA, SC 2.5.5) exige 44×44px |
| Mouvement | Respecter `prefers-reduced-motion` partout où l'animation n'est pas essentielle au sens du contenu | WCAG 2.3.3 / 4.1.3 — le déclencheur documenté est vestibulaire (vertige, Menière), pas seulement une préférence de confort |

**Déjà conforme, vérifié dans le code** : `.lien`, `.prose a`, `.bouton` et les liens de nav
appliquent le même trait au survol et au focus clavier (`:focus-visible` reprend le style de
`:hover`) — un indicateur réel, pas un `outline: none` silencieux. `prefers-reduced-motion` est câblé
dans cinq fichiers, jusque dans le script du morphing de particules (`morphOutils.js`), pas seulement
dans les feuilles de style.

**Trouvé en écrivant cette section, pas encore corrigé** : `.nav-toggle:focus` dans `layout.css`
pose `outline: 2px solid rgba(0,0,0,0.08)` — mesuré à 1,2:1 de contraste contre le papier, loin des
3:1 requis par 1.4.11. Le bouton du menu mobile n'a donc, au clavier, pratiquement aucun indicateur
de focus visible.

### Ce que ces référentiels confirment sur des choix déjà en place

- **La grille de pas** (`--pas-3/6/8/10` = 24/48/64/80px) est un multiple de 8 : la pratique des
  systèmes de design publiés depuis 2017-2018 (Material en tête), parce que les résolutions d'écran
  courantes se divisent proprement par 8 et évitent le flou de sous-pixel sur les densités 1x/1.5x/2x/3x.
- **Toutes les contraintes de mesure du site** (`max-width` en `ch`, de 24 à 74 selon le contexte)
  tombent dans la fourchette de Bringhurst — 45 à 75 caractères pour une colonne, 66 comme cible.
  La plupart se regroupent à 68ch, à deux caractères de son optimum.
- **Les formules `clamp()` des titres** (accueil, `/clouddevops`) sont la technique documentée sous
  le nom de « fluid typography », popularisée par des outils comme Utopia.fyi : un
  `clamp(min, val, max)` remplace plusieurs points de rupture fixes par une interpolation continue
  pilotée par le viewport.
- **`--duree: 240ms` et `--duree-longue: 560ms`** tombent dans la fourchette 200-500ms que Material
  Design documente comme la vitesse d'interface optimale — ce que §3 affirmait déjà sans le sourcer.

### Direction créative — ce qui distingue « propre » de « mémorable »

Tout ce qui précède garantit un site cohérent. Ça ne garantit pas qu'il soit intéressant : un site
qui coche toutes les cases ci-dessus peut rester fade. C'est un défaut déjà nommé pour ce site
(« la page me paraît un peu fade niveau créativité ») — voici ce que les référentiels externes en
disent.

- **Un site propre mais oubliable manque d'un moment.** La grille de notation Awwwards pondère la
  créativité (motifs d'interaction propres, 20 %) séparément du design (hiérarchie, typographie,
  40 %) — un site peut réussir le premier sans le second. Un guide d'analyse des sites primés le dit
  sans détour : « techniquement compétent mais oubliable » signifie « aucune interaction dont on se
  souvienne ». Ce que ce site a construit sans le nommer — le morphing de particules promu de
  simple ornement à chapitre `02 Outils` — est exactement ce moment.
- **Un seul moment, pas plusieurs effets.** Le même guide insiste sur la « retenue intentionnelle » :
  un signature moment par page, pas une addition d'effets. Ça confirme un principe que le système
  applique déjà sans le sourcer — les titres bimodaux (§1, « L'unique moment display » en
  commentaire de code) et l'interdiction des dégradés/lueurs/verre dépoli (§1) vont dans le même sens.
  L'effet de Von Restorff (Hedwig von Restorff, 1933 — l'élément qui détonne dans une série
  d'éléments semblables est celui qu'on retient) explique pourquoi ça fonctionne : le morphing de
  particules ne se remarque que parce qu'il est seul à bouger et seul en couleur saturée, au milieu
  d'un système fixe, à l'encre, sans effet. Le dupliquer sur plusieurs chapitres annulerait l'effet.
- **Rompre la règle une fois se lit comme une intention ; la rompre plusieurs fois se lit comme une
  incohérence.** Principe classique de rupture de grille, formulé ainsi dans plusieurs analyses de
  layouts éditoriaux. La rupture ici n'est pas une bordure ou une colonne — le système ne bascule
  jamais hors de `--edge` — mais l'échelle : un titre à 130-245px contre un corps à 15px. La règle
  s'applique quand même : une seule rupture d'échelle par page, jamais deux titres géants qui se
  disputent l'attention.
- **La performance est une discipline créative, pas un compromis qui la limite.** Un effet qui rame
  n'est pas mémorable, il est agaçant. Le plafond de ratio de la toile du morphing
  (`ratioMax = taille > 340 ? 1.5 : 2` dans `morphOutils.js`) a été choisi précisément pour ça :
  sans lui, une toile de 460px à ratio 2 tombait à 34 img/s ; avec lui, 60 img/s à toutes les tailles
  mesurées.
- **Ce que ce système ne fait délibérément pas.** La tendance de tête des sites primés en 2026 est
  l'expérience 3D immersive : 61 % des « Site of the Day » Awwwards du premier trimestre en
  intègrent une, contre 23 % deux ans plus tôt — WebGL/WebGPU et Three.js comme moteur de rendu
  principal, pas comme enrichissement. Ce site n'y va pas : aucun WebGL, un canvas 2D pour toute
  animation, et l'interdiction des effets (§1) exclut une bonne partie du vocabulaire visuel de cette
  tendance (verre, lueur, profondeur). C'est cohérent avec l'objet du site — un CV, pas une vitrine
  technologique — mais ça reste un choix de registre, pas un point où ce système rivalise avec le
  haut du panier Awwwards. Le nommer évite de se raconter que « conforme à ce système » équivaut à
  « à l'avant-garde de la tendance ».
- **Piste non explorée ici, à considérer si la créativité redevient un chantier** : le « scroll comme
  narration » — le défilement qui pilote un rythme de révélation pensé, pas seulement un déclencheur
  binaire visible/caché. Le mécanisme de révélation actuel (§5) est un `IntersectionObserver` avec
  un `once` : chaque bloc apparaît une fois, dans l'ordre du DOM, avec un décalage fixe de 80ms entre
  voisins. C'est fiable et jamais cassé sans JS — mais ce n'est pas un rythme composé, c'est une
  temporisation uniforme.
