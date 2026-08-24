# Références visuelles

Ce fichier existe parce que `DESIGN.md` ne suffit pas. Il dit ce qui est **interdit** et donne des
**seuils** — ça produit des pages correctes, pas des pages belles. Les références ci-dessous donnent
une **cible** au lieu d'une contrainte.

Règle d'usage : sur un geste créatif, partir d'ici, pas de principes abstraits. Voir la section
« Geste visuel — maquette avant code » du `CLAUDE.md` global.

---

## Statut : candidats proposés, en attente d'arbitrage

Les quatre entrées ci-dessous ont été trouvées, chargées et **regardées** (capture à 1440×900), pas
citées de mémoire. Elles répondent chacune de façon différente au problème posé le 24/08/2026 :
« la page est trop blanche ».

Deux candidats écartés en cours de route, pour mémoire : `leoparpeix.com` (n'a rendu qu'une page
blanche — intro animée non terminée, donc rien à juger) et `finethought.com` (délai dépassé).

---

### A — `pcmaffey.com` · changer la couleur du papier

**Le geste :** le fond n'est pas blanc, c'est un rose pâle (~`#eaddde`). Le texte est violet très
foncé, pas noir. Les liens de service en pied portent un **aplat de couleur** derrière le texte au
lieu d'un soulignement.

**Ce que ça vaut ici :** la réponse la plus directe et la moins coûteuse au « trop blanc » — on ne
rajoute rien, on change `--paper` et `--ink`. Aucun dispositif nouveau, donc aucun risque de
surcharge.

**La limite :** la page est presque vide (un logo, trois lignes, trois liens). C'est un modèle de
**couleur**, pas un modèle de structure — il n'apprend rien sur l'organisation d'une page longue.

---

### B — `rauno.me` · une forme de couleur massive

**Le geste :** fond gris clair (`#ededed`), une carte blanche centrale qui porte le contenu, et un
**immense disque jaune fluo** qui traverse le texte — le texte passe devant, pas derrière. Plus de
petites marques techniques en haut (une barre de graduation en caractères).

**Ce que ça vaut ici :** c'est l'inverse de ce que j'ai tenté avec le grain. Au lieu d'une texture
invisible partout, **une seule forme énorme et franche**. Ça règle le « trop blanc » d'un coup, et
c'est cohérent avec le principe « un seul geste » de `DESIGN.md` §8.

**La limite :** un aplat fluo est un parti pris fort. Sur un CV destiné à des clients, à arbitrer.

---

### C — `ethanmarcotte.com` · une bande de couleur en ouverture

**Le geste :** un grand bandeau **rouge foncé** pleine largeur en haut de page, texturé d'un nuage de
points organique, puis tout le reste sur papier crème (`#fff8f4`). Typographie serif éditoriale,
soulignements permanents, et un motif de courbes de niveau discret en bas de page.

**Ce que ça vaut ici :** casse le blanc **là où ça compte** — l'ouverture — et laisse le corps de la
page respirer en clair. Compatible avec la structure actuelle (l'ouverture de `/clouddevops` est déjà
un bloc distinct). La texture du bandeau montre aussi qu'une matière peut être franche sans être un
dégradé.

**La limite :** demande de choisir une couleur d'accent forte pour le site, ce qui n'existe pas
aujourd'hui.

---

### D — `aino.agency` · le monospace comme matière graphique

**Le geste :** de l'ASCII animé occupe la page entière, sur fond crème. Le vide est rempli par des
**caractères**, pas par de la couleur ni de la texture.

**Ce que ça vaut ici :** probablement la piste la plus juste pour ce site précis, pour trois raisons
qui se cumulent — le corps de texte est **déjà** en JetBrains Mono, ça ne viole **aucune** règle de
`DESIGN.md` (ni dégradé, ni lueur, ni ombre, ni rayon : uniquement des glyphes), et c'est
thématiquement exact pour une page d'ingénieur Cloud/DevOps. Une piste voisine (`play.core`, rendu
d'un champ sur grille monospace) avait déjà été explorée puis mise de côté dans une session
antérieure.

**La limite :** en pleine page c'est envahissant ; il faudrait le cantonner à une zone (l'ouverture,
ou la colonne vide à droite des repères).

---

## Retenues

_(à remplir une fois l'arbitrage fait — ce sont ces entrées-là, et pas les candidats, qui servent de
cible sur les gestes créatifs suivants)_
