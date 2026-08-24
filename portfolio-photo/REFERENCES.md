# Références visuelles

Ce fichier existe parce que `DESIGN.md` ne suffit pas. Il dit ce qui est **interdit** et donne des
**seuils** — ça produit des pages correctes, pas des pages belles. Les références ci-dessous donnent
une **cible** au lieu d'une contrainte.

Règle d'usage : sur un geste créatif, partir d'ici, pas de principes abstraits. Voir la section
« Geste visuel — maquette avant code » du `CLAUDE.md` global.

---

## Ce que la recherche a appris, et qui change le diagnostic

Trois tours de recherche, dans trois registres différents. Le troisième est le bon.

**Registre 1 — portfolios de développeurs** (`pcmaffey.com`, `rauno.me`, `mxb.dev`,
`ethanmarcotte.com`…). Écarté : ce sont des blogs personnels, pas des références de mise en page.
Verdict de l'utilisateur : « c'est quoi ces sites bizarres ».

**Registre 2 — les primés Awwwards** (`landonorris.com` Site of the Year 2025, `locomotive.ca`,
`obys.agency`, `activetheory.net`, `resn.co.nz`, `immersive-g.com`, `utsubo.com`). Deux obstacles
rédhibitoires : **impossibles à capturer** (loaders longs, `activetheory.net` refuse carrément un
navigateur headless avec « Not Supported », `obys` et `immersive-g` n'ont rendu que leur écran de
chargement), et surtout **hors registre** — sombres, 3D, WebGL. Une recherche antérieure l'avait
chiffré : 61 % des Site of the Day 2026 sont des expériences 3D immersives. Rien de tout ça n'est
transposable à un système qui interdit dégradés, lueurs et ombres.

**Registre 3 — les studios de design graphique**, dont le site *est* une démonstration de mise en
page. C'est le bon registre : conventionnel donc capturable, éditorial donc transposable, et
objectivement au sommet (COLLINS est 8× Agency of the Year).

### Le constat qui compte

**Aucun de ces trois studios ne casse le blanc avec de la texture.** Pas de grain, pas de cadre de
visée, pas de trame. Ils le cassent avec quatre choses, par ordre de force :

1. **Une image pleine largeur.** Pentagram et Studio Feixen ouvrent tous les deux sur une image qui
   occupe tout l'écran.
2. **Une bande pleine largeur en aplat foncé.** Pentagram enchaîne image → blanc → bande noire avec
   titre blanc dedans.
3. **Une échelle typographique brutale plus du vide assumé.** COLLINS : une seule phrase en serif
   énorme, seule au centre d'un écran presque vide. C'est *très* blanc, et ça ne fait pas fade.
4. **Des formes géométriques en couleur pure.** Studio Feixen : des disques rouge, vert, bleu, jaune
   posés à plat.

**Conséquence directe pour `/clouddevops`** : le problème n'est probablement pas un manque de matière,
c'est qu'il **n'y a aucune image et aucune bande foncée** sur toute la page. L'accueil, lui, a le
portrait — ce qui expliquerait pourquoi il « rend mieux » de l'avis de l'utilisateur. Ajouter du grain
répondait au symptôme énoncé ; ajouter une image ou une bande à l'encre répondrait à la cause.

---

## Les candidats retenus pour arbitrage

Tous chargés et **regardés** en capture à 1440×900, pas cités de mémoire.

### A — `wearecollins.com` · l'échelle typographique et le vide assumé

**Le geste :** fond crème très clair, une seule phrase en serif énorme au centre, un écran presque
vide autour, les distinctions en tout petit dessous, puis une image sombre pleine largeur.

**Pourquoi c'est la référence la plus instructive ici :** ce site est plus blanc et plus vide que
`/clouddevops`, et il ne fait pas fade. La démonstration que « trop blanc » n'est pas une affaire de
texture mais de **contraste d'échelle** et de **rythme des pleins**.

**La limite :** repose sur une typographie serif à fort caractère, que le système n'a pas
(Sofia Sans Condensed + JetBrains Mono).

### B — `pentagram.com` · l'alternance de bandes pleine largeur

**Le geste :** image pleine largeur → blanc → bande noire portant un titre blanc. Le rythme de la
page vient de l'alternance des aplats, pas d'un décor.

**Pourquoi ici :** directement applicable. La page a déjà une structure en chapitres ; en faire
basculer un ou deux en bande à l'encre créerait le rythme qui manque. Et ça respecte le système à la
lettre — un aplat n'est ni un dégradé, ni une ombre, ni un rayon.

**La limite :** `DESIGN.md` §2 note que les fonds de section alternés ont été retirés de l'accueil.
Il faudrait assumer de revenir sur cette décision, de façon délibérée et une seule fois.

### C — `studiofeixen.ch` · les formes de couleur pure

**Le geste :** des disques de couleur saturée (rouge, vert, bleu, jaune) posés à plat sur les
compositions. Aucun effet, aucune profondeur — de la couleur en aplat géométrique.

**Pourquoi ici :** apporte de la couleur sans rien enfreindre, et c'est un vocabulaire compatible avec
le canevas de particules existant (dont la couleur vient déjà des logos).

**La limite :** un parti pris fort sur un CV destiné à des clients.

### D — `thonik.nl` et `dia.tv` · non encore analysés

Chargés (`thonik` fond `#f3f3f3`, `dia` fond blanc en serif JJannon), captures disponibles, mais pas
regardés en détail. À ouvrir si les trois premiers ne conviennent pas.

---

## Retenues

_(à remplir une fois l'arbitrage fait — ce sont ces entrées-là, et pas les candidats, qui servent de
cible sur les gestes créatifs suivants)_
