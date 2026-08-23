/* Morphing de particules entre les logos des outils.

   Chaque logo est echantillonne pixel par pixel : ses pixels opaques deviennent
   les cibles d'un nuage de particules, qui porte aussi leur couleur. Le nuage
   passe d'un logo au suivant en se dispersant a mi-parcours — logo, nuage,
   logo, sur une page qui s'appelle Cloud.

   DEUX REGLES QUI ONT COUTE CHER, A NE PAS DEFAIRE.

   1. On rasterise en COUVERTURE DE SURFACE, pas au pixel le plus proche. Un
      ensemble de points qui pave exactement la grille a l'arrivee ne la pave
      plus des que la progression vaut moins que 1 : les positions deviennent
      des reels quelconques, plusieurs particules tombent sur le meme pixel et
      d'autres n'en recoivent aucune. Les trous sont donc geometriques, pas
      temporels — aucun reglage d'amorti ne les supprime. Ici chaque particule
      est un carre pose a une position reelle, et chaque pixel accumule l'aire
      de recouvrement : un pixel a demi couvert recoit un demi-poids.

   2. Le logo ne doit devenir lisible qu'une fois que ses particules pavent
      DEJA exactement. D'ou des departs et arrivees synchrones (ETALE = 0) et
      une arrivee placee a 80 % du vol. Avec un etalement, une partie des
      particules est rentree quand les autres volent encore : la forme devient
      lisible avant de paver, et elle apparait trouee par construction.

   Aussi : la toile doit avoir des dimensions ENTIERES. A 125 % de zoom
   systeme le ratio vaut 1,25, et `taille * ratio` donnait 407,5 — valeur
   tronquee par le navigateur alors que l'indexation du tampon utilisait 407,5,
   d'ou des lignes decalees et des pixels jamais ecrits.

   Aucune dependance : accumulation dans des Float32Array, composition en une
   passe dans un ImageData. 60 images/s pour ~28 000 particules.
*/

const facilite = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const PAS = 1;          // un pixel du logo par particule
const ETALE = 0;        // voir regle 2
const ARRIVEE = 0.8;    // voir regle 2
const DEBORD = 1.3;     // le carre depasse son pas : adoucit le bord
const SEUIL_ALPHA = 8;  // bas, pour garder la rampe d'anti-aliasing du logo
const SATURATION = 1.35;
const DUREE = 1500;
const PAUSE = 1200;
// La toile est volontairement plus grande que le logo : elle doit contenir le
// nuage disperse. Resserrer la dispersion permet donc d'agrandir le logo
// d'autant, ce qui reduit la bande vide au-dessus de lui — le libellé se
// retrouvait a 85px de son sujet.
const OCCUPATION = 0.74;

function couleurPapier(el) {
  const c = getComputedStyle(el).getPropertyValue("--paper").trim() || "#f4f4f2";
  const m = c.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [244, 244, 242];
}

async function echantillonne(src, taille) {
  const im = new Image();
  im.src = src;
  await im.decode();
  const c = document.createElement("canvas");
  const d = Math.round(taille * OCCUPATION);
  const e = Math.min(d / im.width, d / im.height);
  c.width = Math.max(1, Math.round(im.width * e));
  c.height = Math.max(1, Math.round(im.height * e));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, c.width, c.height);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  const dx = (taille - c.width) / 2, dy = (taille - c.height) / 2;
  const pts = [];
  for (let y = 0; y < c.height; y += PAS) {
    for (let x = 0; x < c.width; x += PAS) {
      const i = (y * c.width + x) * 4;
      if (px[i + 3] < SEUIL_ALPHA) continue;
      const g = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      const p = (v) => Math.max(0, Math.min(255, g + (v - g) * SATURATION));
      pts.push({ x: x + dx, y: y + dy, a: px[i + 3] / 255,
                 r: p(px[i]), v: p(px[i + 1]), b: p(px[i + 2]) });
    }
  }
  return pts;
}

export async function morphOutils(canvas, taille, outils, surNom) {
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PAPIER = couleurPapier(canvas);

  const L = Math.round(taille * Math.min(2, devicePixelRatio || 1));
  const dpr = L / taille;
  canvas.width = L;
  canvas.height = L;
  canvas.style.width = canvas.style.height = taille + "px";
  const ctx = canvas.getContext("2d");

  const jeu = [];
  for (const o of outils) jeu.push(await echantillonne(o.src, taille));

  // Effectif = celui du plus gros logo, repartition uniforme : plafonner en
  // dessous tronquait le logo le plus dense (sa moitie basse n'avait aucune
  // particule).
  const N = Math.max(...jeu.map((j) => j.length));
  const cible = jeu.map((j) => {
    const out = new Array(N);
    for (let i = 0; i < N; i++) out[i] = j[Math.floor((i * j.length) / N) % j.length];
    return out;
  });

  const img = ctx.createImageData(L, L);
  const sortie = img.data;
  const accR = new Float32Array(L * L);
  const accV = new Float32Array(L * L);
  const accB = new Float32Array(L * L);
  const accW = new Float32Array(L * L);

  const p = new Float32Array(N * 2);
  const dep = new Float32Array(N * 2);
  const ecart = new Float32Array(N * 2);
  let de = 0, vers = 1;

  for (let i = 0; i < N; i++) {
    p[i * 2] = cible[0][i].x;
    p[i * 2 + 1] = cible[0][i].y;
  }

  function nouveauVol() {
    for (let i = 0; i < N; i++) {
      dep[i * 2] = p[i * 2];
      dep[i * 2 + 1] = p[i * 2 + 1];
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 26;
      ecart[i * 2] = Math.cos(a) * r;
      ecart[i * 2 + 1] = Math.sin(a) * r;
    }
  }
  nouveauVol();

  const COTE = PAS * dpr * DEBORD;
  const MARGE = (COTE - PAS * dpr) / 2;

  function dessine(av) {
    accR.fill(0); accV.fill(0); accB.fill(0); accW.fill(0);
    const u = Math.max(0, Math.min(1, av));
    const w = Math.min(1, u / ARRIVEE);
    const e = facilite(w);
    const souffle = w >= 1 ? 0 : Math.sin(w * Math.PI);
    const A = cible[de], B = cible[vers];

    for (let i = 0; i < N; i++) {
      const a = A[i], b = B[i];
      const x = dep[i * 2] + (b.x - dep[i * 2]) * e + ecart[i * 2] * souffle;
      const y = dep[i * 2 + 1] + (b.y - dep[i * 2 + 1]) * e + ecart[i * 2 + 1] * souffle;
      p[i * 2] = x; p[i * 2 + 1] = y;

      const al = a.a + (b.a - a.a) * e;
      if (al <= 0) continue;
      const cr = a.r + (b.r - a.r) * e;
      const cv = a.v + (b.v - a.v) * e;
      const cb = a.b + (b.b - a.b) * e;

      const x0 = x * dpr - MARGE, y0 = y * dpr - MARGE;
      const x1 = x0 + COTE, y1 = y0 + COTE;
      const iMin = Math.max(0, Math.floor(x0)), iMax = Math.min(L - 1, Math.ceil(x1) - 1);
      const jMin = Math.max(0, Math.floor(y0)), jMax = Math.min(L - 1, Math.ceil(y1) - 1);
      for (let j = jMin; j <= jMax; j++) {
        const oy = Math.min(y1, j + 1) - Math.max(y0, j);
        if (oy <= 0) continue;
        const base = j * L;
        for (let k = iMin; k <= iMax; k++) {
          const ox = Math.min(x1, k + 1) - Math.max(x0, k);
          if (ox <= 0) continue;
          const q = ox * oy * al;
          const n = base + k;
          accW[n] += q;
          accR[n] += cr * q;
          accV[n] += cv * q;
          accB[n] += cb * q;
        }
      }
    }

    for (let n = 0, o = 0; n < L * L; n++, o += 4) {
      const q = accW[n];
      if (q <= 0) {
        sortie[o] = PAPIER[0]; sortie[o + 1] = PAPIER[1];
        sortie[o + 2] = PAPIER[2]; sortie[o + 3] = 255;
        continue;
      }
      const cov = q < 1 ? q : 1;
      const iq = 1 / q;
      sortie[o] = PAPIER[0] + (accR[n] * iq - PAPIER[0]) * cov;
      sortie[o + 1] = PAPIER[1] + (accV[n] * iq - PAPIER[1]) * cov;
      sortie[o + 2] = PAPIER[2] + (accB[n] * iq - PAPIER[2]) * cov;
      sortie[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  if (reduit) {
    dessine(1);
    surNom && surNom(outils[0].nom);
    return;
  }

  let depart = performance.now(), enPause = false, annonce = false;
  surNom && surNom(outils[0].nom);
  const boucle = (ms) => {
    const dt = ms - depart;
    if (!enPause && dt >= DUREE) {
      dessine(1);
      de = vers;
      vers = (vers + 1) % cible.length;
      nouveauVol();
      enPause = true;
      annonce = false;
      depart = ms;
    } else if (enPause && dt >= PAUSE) {
      enPause = false;
      depart = ms;
    } else if (!enPause) {
      const av = dt / DUREE;
      dessine(av);
      // Le nom est annonce a l'ARRIVEE, pas a la fin du vol : le logo cible est
      // pose des 80 % du vol, et annoncer plus tard laissait 300ms pendant
      // lesquelles le libelle nommait encore le logo precedent.
      if (!annonce && av >= ARRIVEE) {
        annonce = true;
        surNom && surNom(outils[vers].nom);
      }
    }
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
}
