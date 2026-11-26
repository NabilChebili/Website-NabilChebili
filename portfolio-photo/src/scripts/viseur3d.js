// Ouverture de /photo-video : un α7 IV dessine au trait, qu'un petit defilement
// fait tourner puis entrer dans son oeilleton ; dans le viseur, les sujets
// defilent un par un (Nabil, 26/11/2026). Voir CLAUDE.md, « Page Photo & video ».
//
// Le boitier est modelise a la main (formes simples), puis rendu au trait :
// chaque volume en papier, ses silhouettes et aretes a l'encre. Seuls l'ecran
// arriere, les verres de l'objectif et le T* rouge gardent leur couleur.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export function demarrerViseur(racine) {
  const D = JSON.parse(racine.querySelector(".v3d-donnees").textContent);
  const $ = (s) => racine.querySelector(s);
  const reduit = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Elements ----------
  const canvas = $(".v3d-gl"), colle = $(".v3d-colle"), sonde = $(".v3d-sonde");
  const tete = $(".v3d-tete"), indic = $(".v3d-indic"), legende = $(".v3d-legende");
  const viseur = $(".v3d-viseur"), obtu = $(".v3d-obtu");
  const imgs = [...racine.querySelectorAll(".v3d-plan")];
  const h = { num: $(".v3d-num"), titre: $(".v3d-titre"), cpt: $(".v3d-cpt"), vit: $(".v3d-vit"), ouv: $(".v3d-ouv"), iso: $(".v3d-iso") };

  // ---------- Etat ----------
  // repos -> entree (animation) -> viseur -> sortie (animation) -> repos
  let etat = "repos", pAnim = 0, yVerrou = 0, coup = 0, planCourant = -1, dernier = -1;
  let carteOuverte = false;
  const ENTREE = 1.0, PAS = 0.55; // en hauteurs d'ecran
  const DUREE_ENTREE = 2600, DUREE_SORTIE = 1700;
  const PLANS = D.plans;

  // ---------- Rendu ----------
  let renderer, effet;
  try {
    // Mesure (Intel integre) : sans lissage en densite 1.5, 24 -> 17 ms par image.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 1.5, alpha: true });
  } catch {
    renderer = null;
  }
  if (!renderer) {
    // Sans WebGL : pas de boitier, on arrive directement dans le viseur.
    racine.classList.add("v3d-sans-3d");
    etat = "viseur"; pAnim = 1;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
  const boitier = new THREE.Group();
  let verre = null;

  if (renderer) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.NoToneMapping;
    construireBoitier();
    effet = new OutlineEffect(renderer, { defaultThickness: 0.0035, defaultColor: [0.04, 0.04, 0.04] });
  }

  function construireBoitier() {
    // Lumiere tres douce : le volume se lit au trait, pas a l'ombre.
    const cle = new THREE.DirectionalLight(0xffffff, 2.2 * 0.35); cle.position.set(-2.5, 4, 3); scene.add(cle);
    const contre = new THREE.DirectionalLight(0xe6ecff, 2.6 * 0.35); contre.position.set(2.5, 2.5, -3.5); scene.add(contre);
    const contre2 = new THREE.DirectionalLight(0xffffff, 1.6 * 0.35); contre2.position.set(-3, 1.5, -2.5); scene.add(contre2);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e6e0, 0.5));
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));

    // Environnement pour les reflets des verres seulement.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envReflets = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const M = {
      lentille: new THREE.MeshPhysicalMaterial({ color: 0x030304, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02,
        envMap: envReflets, envMapIntensity: 0.55, iridescence: 0.35, iridescenceIOR: 1.9, iridescenceThicknessRange: [300, 800] }),
      caoutchouc: "caoutchouc", monture: "monture", bouton: "bouton", molette: "molette", rouge: "rouge",
    };
    // Rendu au trait : papier (ombre tres legere), encre, et les quelques exceptions.
    const PAPIER = 0xf4f4f2, ENCRE = 0x0a0a0a;
    const papier = new THREE.MeshLambertMaterial({ color: PAPIER });
    papier.userData.outlineParameters = { thickness: 0.0035, color: [0.04, 0.04, 0.04], alpha: 1 };
    const papierUni = new THREE.MeshLambertMaterial({ color: PAPIER });
    papierUni.userData.outlineParameters = { visible: false };
    const encreUnie = new THREE.MeshBasicMaterial({ color: 0x070707 });
    encreUnie.userData.outlineParameters = { visible: false };
    const encreDedans = new THREE.MeshBasicMaterial({ color: 0x070707, side: THREE.BackSide });
    encreDedans.userData.outlineParameters = { visible: false };
    const encre = new THREE.LineBasicMaterial({ color: ENCRE });
    const sansContour = (m) => { m.userData.outlineParameters = { visible: false }; return m; };

    // Pieces : `nature` decide du rendu (papier trace, encre pleine, etc.).
    const aretes = [];
    const ajouter = (geo, nature, x, y, z, parent = boitier, seuil = 28) => {
      let mat;
      if (nature === "encre") mat = encreUnie;
      else if (nature === "verre") mat = M.lentille;
      else if (nature === "ouvert") mat = papierUni;
      else if (nature && nature.isMaterial) mat = nature;
      else mat = papier;
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m);
      if (nature === "ouvert") {
        // Cylindre ouvert : paroi exterieure en papier, paroi interieure a l'encre.
        // L'effet de contour peindrait sinon sa face interieure en noir et boucherait l'objectif.
        const dedans = new THREE.Mesh(geo, encreDedans); m.add(dedans);
      }
      if (mat === papier || nature === "ouvert") aretes.push([m, seuil]);
      return m;
    };
    function etiquette(texte, l, hh, { taille = 64, police = "700 {t}px 'Sofia Sans', Arial", couleur = "#0a0a0a" } = {}) {
      const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * hh / l);
      const x = c.getContext("2d"); x.fillStyle = couleur; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = police.replace("{t}", taille); x.fillText(texte, c.width / 2, c.height / 2 + 2);
      const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.Mesh(new THREE.PlaneGeometry(l, hh), sansContour(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })));
    }
    const rr = (w, hh, r, dy = 0) => { const sh = new THREE.Shape(); const x = -w / 2, y = -hh / 2 + dy;
      sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + hh - r);
      sh.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh); sh.lineTo(x + r, y + hh); sh.quadraticCurveTo(x, y + hh, x, y + hh - r);
      sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); return sh; };

    // ----- Corps (unites : 1 = 100 mm ; l'avant regarde +z) -----
    ajouter(new RoundedBoxGeometry(1.31, 0.74, 0.44, 8, 0.09), null, 0, 0.37, 0);
    ajouter(new RoundedBoxGeometry(1.25, 0.08, 0.42, 4, 0.04), null, 0.01, 0.715, 0);
    ajouter(new RoundedBoxGeometry(0.36, 0.72, 0.36, 10, 0.16), null, -0.47, 0.36, 0.24);   // poignee
    {
      const p = new THREE.Shape();
      p.moveTo(-0.28, 0); p.lineTo(0.28, 0); p.lineTo(0.17, 0.20); p.lineTo(-0.17, 0.20); p.closePath();
      const g = new THREE.ExtrudeGeometry(p, { depth: 0.40, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 5 });
      g.translate(0, 0, -0.20);
      ajouter(g, null, 0.10, 0.73, 0);                                                      // bossage
      ajouter(new THREE.BoxGeometry(0.22, 0.02, 0.20), null, 0.10, 0.965, -0.02);           // griffe
    }
    // Oeilleton, d'apres les photos du dos : plus large que haut, centre sous le bossage,
    // ouverture centree, cadre interieur en relief, languette du capteur d'oeil.
    const oeilleton = new THREE.Group(); oeilleton.position.set(0.10, 0.71, -0.255); boitier.add(oeilleton);
    {
      const contour = rr(0.46, 0.27, 0.085); contour.holes.push(rr(0.26, 0.17, 0.035));
      const g = new THREE.ExtrudeGeometry(contour, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.026, bevelSegments: 8, curveSegments: 28 });
      g.translate(0, 0, -0.075);
      // Seuil d'arete bas : sans quoi la bonnette arrondie se lit comme un coussin.
      ajouter(g, null, 0, 0, -0.08, oeilleton, 12).rotation.y = Math.PI;
      ajouter(new RoundedBoxGeometry(0.26, 0.17, 0.16, 4, 0.03), "encre", 0, 0, -0.01, oeilleton);
      const cadre = rr(0.235, 0.15, 0.03); cadre.holes.push(rr(0.18, 0.105, 0.015));
      const gc = new THREE.ExtrudeGeometry(cadre, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3, curveSegments: 16 });
      ajouter(gc, null, 0, 0, -0.035, oeilleton).rotation.y = Math.PI;
      ajouter(new RoundedBoxGeometry(0.16, 0.035, 0.03, 4, 0.012), null, 0, -0.145, -0.17, oeilleton);
    }
    // Le verre du viseur, a l'encre : en entrant dedans, l'ecran passe au noir du viseur.
    verre = ajouter(new RoundedBoxGeometry(0.18, 0.105, 0.01, 4, 0.01), "encre", 0, 0, -0.03, oeilleton);

    // ----- Ecran arriere, allume sur la premiere photo du viseur -----
    ajouter(new RoundedBoxGeometry(0.80, 0.53, 0.045, 4, 0.025), null, 0.185, 0.265, -0.245);
    for (const yy of [0.10, 0.42]) ajouter(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 24), null, 0.59, yy, -0.245);
    {
      // Image servie par le site (meme origine) : le stockage ne permet pas a WebGL
      // de lire ses photos (pas d'en-tete CORS).
      const tx = new THREE.TextureLoader().load(D.ecran, () => { dernier = -1; maj(); });
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      // z -0.2690 et non -0.2675 : a -0.2675, l'image et le dos du cadre se battaient (stries).
      const lcd = ajouter(new THREE.PlaneGeometry(0.72, 0.47), sansContour(new THREE.MeshBasicMaterial({ map: tx, color: 0xd8d8d8 })), 0.185, 0.265, -0.2690);
      lcd.rotation.y = Math.PI;
    }

    // ----- Monture et objectif (Sigma 24-70 F2.8 DG DN II, a l'echelle) -----
    {
      ajouter(new THREE.TorusGeometry(0.27, 0.035, 24, 96), null, 0.10, 0.39, 0.235);
      ajouter(new THREE.TorusGeometry(0.30, 0.008, 12, 96), null, 0.10, 0.39, 0.232);
    }
    // Reperes peints, a l'encre sur papier : u = 0.5 regarde vers le haut.
    function bandeReperes(reperes, haut, { traits = false, titre = null } = {}) {
      const c = document.createElement("canvas"); c.width = 4096; c.height = haut; const x = c.getContext("2d");
      x.fillStyle = "#ebebea"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#17171b"; x.strokeStyle = "#17171b"; x.lineWidth = 3;
      x.textAlign = "center"; x.textBaseline = "middle";
      for (const [t, u] of reperes) {
        x.save(); x.translate(u * c.width, c.height * 0.62); x.rotate(Math.PI / 2);
        x.font = "600 46px 'Sofia Sans', Arial"; x.fillText(t, 0, 0); x.restore();
        if (traits) { x.beginPath(); x.moveTo(u * c.width, c.height * 0.08); x.lineTo(u * c.width, c.height * 0.30); x.stroke(); }
      }
      if (titre) { x.font = "800 64px 'Sofia Sans', Arial"; x.fillText(titre[0], titre[1] * c.width, c.height * 0.3); }
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      const m = new THREE.MeshLambertMaterial({ map: tx });
      m.userData.outlineParameters = { thickness: 0.0035, color: [0.04, 0.04, 0.04], alpha: 1 };
      return m;
    }
    const objectif = new THREE.Group(); objectif.position.set(0.10, 0.39, 0.235); objectif.rotation.x = Math.PI / 2; boitier.add(objectif);
    {
      const cyl = (r1, r2, hh, y, nature = null, ouvert = false) => {
        const m = ajouter(new THREE.CylinderGeometry(r1, r2, hh, 128, 1, ouvert), ouvert ? "ouvert" : nature, 0, y, 0, objectif);
        if (nature && nature.isMaterial && !ouvert) aretes.push([m, 28]);
        return m;
      };
      // Cannelures : de vraies lignes le long de l'axe.
      const stries = (r, y0, y1, n, a0 = 0, a1 = Math.PI * 2) => {
        const pts = [];
        for (let i = 0; i < n; i++) { const t = a0 + (a1 - a0) * (i / n); pts.push(Math.sin(t) * r, y0, Math.cos(t) * r, Math.sin(t) * r, y1, Math.cos(t) * r); }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
        objectif.add(new THREE.LineSegments(g, encre));
      };
      cyl(0.30, 0.30, 0.03, 0.015);                                                           // baionnette
      cyl(0.37, 0.41, 0.10, 0.08);                                                            // embase
      const diaph = [["A", 0.40], ["22", 0.425], ["16", 0.445], ["11", 0.465], ["8", 0.485], ["5.6", 0.505], ["4", 0.525], ["2.8", 0.545]];
      cyl(0.43, 0.43, 0.14, 0.20, bandeReperes(diaph, 256, { traits: true, titre: ["SIGMA", 0.60] })); // bague de diaphragme
      stries(0.432, 0.15, 0.27, 36, -1.1, 1.1);
      cyl(0.415, 0.415, 0.02, 0.28);
      cyl(0.44, 0.44, 0.21, 0.395);                                                           // bague de zoom
      stries(0.442, 0.29, 0.50, 90);
      cyl(0.435, 0.435, 0.28, 0.64, bandeReperes([["24", 0.43], ["35", 0.465], ["50", 0.50], ["70", 0.54]], 256)); // focales
      { const afl = ajouter(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 32), null, 0, 0.57, -0.445, objectif); afl.rotation.x = Math.PI / 2; }
      cyl(0.42, 0.42, 0.02, 0.79);
      cyl(0.445, 0.445, 0.24, 0.92, null, true);                                              // mise au point (ouverte : elle masquait les verres)
      stries(0.447, 0.80, 1.04, 96);
      cyl(0.45, 0.45, 0.04, 1.06, null, true);                                                // collerette
      stries(0.452, 1.042, 1.08, 90);
      // Face avant : couronne, verres en retrait, anneaux interieurs.
      ajouter(new THREE.RingGeometry(0.36, 0.45, 128), "encre", 0, 1.079, 0, objectif).rotation.x = -Math.PI / 2;
      ajouter(new THREE.CylinderGeometry(0.36, 0.36, 0.10, 128, 1, true), sansContour(new THREE.MeshBasicMaterial({ color: 0x070707, side: THREE.DoubleSide })), 0, 1.03, 0, objectif);
      ajouter(new THREE.SphereGeometry(0.62, 128, 64, 0, Math.PI * 2, 0, 0.62), "verre", 0, 0.45, 0, objectif);
      ajouter(new THREE.SphereGeometry(0.30, 96, 48, 0, Math.PI * 2, 0, 0.75), "verre", 0, 0.66, 0, objectif);
      M.lentille.userData.outlineParameters = { visible: false };
      for (const [r, y, c] of [[0.33, 0.98, 0x222224], [0.27, 0.90, 0x171719], [0.21, 0.82, 0x222224], [0.14, 0.74, 0x0e0e0f]]) {
        ajouter(new THREE.RingGeometry(r - 0.035, r, 96), sansContour(new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })), 0, y, 0, objectif).rotation.x = -Math.PI / 2;
      }
      ajouter(new THREE.CircleGeometry(0.11, 64), sansContour(new THREE.MeshBasicMaterial({ color: 0x040405 })), 0, 0.72, 0, objectif).rotation.x = -Math.PI / 2;
      {
        // Reflet de boite a lumiere et traitement colore, poses sur le verre.
        const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d");
        let g = x.createRadialGradient(512, 512, 120, 512, 512, 500);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.45, "rgba(120,40,160,0.35)"); g.addColorStop(0.7, "rgba(40,150,110,0.30)"); g.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
        x.save(); x.translate(380, 330); x.rotate(-0.6); g = x.createRadialGradient(0, 0, 10, 0, 0, 230); g.addColorStop(0, "rgba(255,255,255,0.85)"); g.addColorStop(1, "rgba(255,255,255,0)");
        x.scale(1, 0.32); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 230, 0, Math.PI * 2); x.fill(); x.restore();
        x.save(); x.translate(640, 650); x.rotate(-0.6); g = x.createRadialGradient(0, 0, 4, 0, 0, 80); g.addColorStop(0, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
        x.scale(1, 0.4); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 80, 0, Math.PI * 2); x.fill(); x.restore();
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        const reflet = ajouter(new THREE.CircleGeometry(0.36, 96), sansContour(new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), 0, 1.072, 0, objectif);
        reflet.rotation.x = -Math.PI / 2; reflet.renderOrder = 2;
      }
      {
        const c = document.createElement("canvas"); c.width = c.height = 1024; const x = c.getContext("2d");
        x.fillStyle = "#d9d9d5"; x.font = "600 40px 'Sofia Sans', Arial"; x.textAlign = "center"; x.textBaseline = "middle";
        const txt = "SIGMA  24-70mm  1:2.8  DG DN   Ø82", n = txt.length;
        for (let i = 0; i < n; i++) { const a = -Math.PI * 0.85 + (i / n) * Math.PI * 0.7; x.save(); x.translate(512 + Math.cos(a) * 452, 512 + Math.sin(a) * 452); x.rotate(a + Math.PI / 2); x.fillText(txt[i], 0, 0); x.restore(); }
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
        ajouter(new THREE.CircleGeometry(0.45, 128), sansContour(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })), 0, 1.0805, 0, objectif).rotation.x = -Math.PI / 2;
      }
    }

    // ----- Molettes, boutons, serigraphies -----
    function molette(r, hh, x, y, z, crans = 64) {
      const g = new THREE.Group(); g.position.set(x, y, z); boitier.add(g);
      ajouter(new THREE.CylinderGeometry(r, r, hh, 96), null, 0, hh / 2, 0, g);
      const ins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, hh * 0.8, 0.012), papier, crans);
      const m = new THREE.Matrix4();
      for (let i = 0; i < crans; i++) { const a = (i / crans) * Math.PI * 2; m.makeTranslation(Math.cos(a) * r, hh / 2, Math.sin(a) * r); ins.setMatrixAt(i, m); }
      g.add(ins);
      ajouter(new THREE.CylinderGeometry(r * 0.82, r * 0.86, 0.01, 64), null, 0, hh + 0.005, 0, g);
      return g;
    }
    molette(0.13, 0.09, -0.30, 0.75, -0.02);
    molette(0.12, 0.08, -0.53, 0.75, -0.12);
    molette(0.085, 0.05, -0.40, 0.75, -0.20, 48);
    ajouter(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 48), null, -0.48, 0.73, 0.30);  // declencheur
    ajouter(new THREE.CylinderGeometry(0.055, 0.058, 0.05, 48), null, -0.48, 0.75, 0.30);
    ajouter(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 32), null, -0.15, 0.765, -0.10);
    ajouter(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 32), null, -0.40, 0.765, 0.12);
    ajouter(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 32), null, -0.27, 0.765, 0.16);
    const arriere = (geo, x, y) => { const m = ajouter(geo, null, x, y, -0.225); m.rotation.x = Math.PI / 2; return m; };
    arriere(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 32), -0.32, 0.62);                // AF-ON
    arriere(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 32), -0.38, 0.52);                  // joystick
    arriere(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 32), -0.27, 0.43);                // Fn
    arriere(new THREE.TorusGeometry(0.095, 0.03, 16, 64), -0.38, 0.27).rotation.x = 0;       // roue de commande
    arriere(new THREE.CylinderGeometry(0.034, 0.034, 0.03, 32), -0.38, 0.27);
    arriere(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 32), -0.27, 0.10);
    arriere(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 32), -0.45, 0.10);
    arriere(new THREE.CylinderGeometry(0.027, 0.027, 0.03, 32), 0.56, 0.59);                 // C3
    arriere(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 32), -0.55, 0.62);                  // AEL
    arriere(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 32), -0.17, 0.59);                  // C1
    ajouter(new RoundedBoxGeometry(0.12, 0.052, 0.03, 4, 0.024), null, 0.43, 0.59, -0.225);  // MENU, en pilule
    ajouter(new RoundedBoxGeometry(0.16, 0.48, 0.04, 4, 0.02), null, -0.56, 0.40, -0.225);   // repose-pouce
    for (const x of [-0.665, 0.665]) ajouter(new THREE.TorusGeometry(0.035, 0.012, 12, 32), null, x, 0.72, -0.02).rotation.y = Math.PI / 2;
    {
      const pose = (e, x, y, z, ry = 0) => { e.position.set(x, y, z); e.rotation.y = ry; boitier.add(e); return e; };
      pose(etiquette("SONY", 0.30, 0.07, { taille: 100, police: "800 {t}px 'Times New Roman', serif" }), 0.10, 0.84, 0.236);
      pose(etiquette("α7", 0.16, 0.10, { taille: 150, police: "italic 700 {t}px 'Times New Roman', serif" }), 0.53, 0.58, 0.221);
      const dos = (t, x, y, l, z = -0.2412, taille = 120) => pose(etiquette(t, l, 0.03, { taille }), x, y, z, Math.PI);
      dos("C3", 0.56, 0.59, 0.04); dos("AF-ON", -0.32, 0.62, 0.07); dos("C1", -0.17, 0.59, 0.04); dos("AEL", -0.55, 0.62, 0.05);
      dos("MENU", 0.43, 0.59, 0.09, -0.2412, 110);
      pose(etiquette("Fn", 0.06, 0.04, { taille: 90 }), -0.27, 0.36, -0.2211, Math.PI);
      pose(etiquette("C4", 0.06, 0.04, { taille: 90 }), -0.47, 0.05, -0.2211, Math.PI);
      pose(etiquette("α7 IV", 0.10, 0.032, { taille: 130, police: "italic 700 {t}px 'Times New Roman', serif" }), 0.49, 0.68, -0.2211, Math.PI);
      // T* rouge sur le flanc incline du bossage : seule serigraphie en couleur.
      const tstar = etiquette("T*", 0.06, 0.045, { taille: 300, police: "600 {t}px 'Sofia Sans', Arial", couleur: "#e2462f" });
      tstar.position.set(0.359, 0.83, -0.12); tstar.lookAt(tstar.position.clone().add(new THREE.Vector3(0.876, 0.482, 0)));
      boitier.add(tstar);
    }
    {
      // Ombre fixe peinte : une ombre douce recalculee a chaque image coutait ~25 ms.
      const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 8, 128, 128, 128);
      g.addColorStop(0, "rgba(0,0,0,0.30)"); g.addColorStop(0.55, "rgba(0,0,0,0.14)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      const ombre = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.5), sansContour(new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })));
      ombre.rotation.x = -Math.PI / 2; ombre.position.set(0.05, -0.063, 0.55); ombre.renderOrder = -1;
      boitier.add(ombre);
    }
    // Aretes vives a l'encre.
    for (const [o, seuil] of aretes) {
      const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, seuil), encre);
      l.position.copy(o.position); l.rotation.copy(o.rotation); l.scale.copy(o.scale);
      o.parent.add(l);
    }
    boitier.position.y = 0.065;
    scene.add(boitier);
  }

  // ---------- Hauteurs ----------
  // Hauteur stable (svh) : sur telephone, la barre d'adresse fait varier innerHeight.
  let hEcran = sonde.offsetHeight || innerHeight;
  const entete = () => document.querySelector(".site-header")?.offsetHeight || 0;
  // Defilement a partir duquel la scene colle sous l'en-tete fixe.
  const ancre = () => racine.getBoundingClientRect().top + scrollY - entete();
  const poserHauteur = () => {
    hEcran = sonde.offsetHeight || innerHeight;
    racine.style.height = `${(1 + ENTREE + PLANS.length * PAS) * hEcran}px`;
  };

  // ---------- Viseur ----------
  // Les 19 photos demandees d'un coup au milieu du plan finissaient de se decoder
  // ensemble a son arrivee : 2 a 13 images lentes. Les deux premieres partent au
  // debut du plan ; les autres une par une, dans le viseur, quand le navigateur est libre.
  const charger = (im) => { if (!im || im.src) return; im.src = im.dataset.src; im.decode().catch(() => {}); };
  let suiteLancee = false;
  function precharger() { charger(imgs[0]); charger(imgs[1]); }
  function chargerLaSuite() {
    if (suiteLancee) return; suiteLancee = true;
    const attendre = window.requestIdleCallback || ((f) => setTimeout(f, 120));
    let i = 2;
    const suivante = () => { if (i >= imgs.length) return; charger(imgs[i++]); attendre(suivante, { timeout: 600 }); };
    attendre(suivante, { timeout: 600 });
  }
  function afficherPlan(plan) {
    if (plan === planCourant) return;
    // Une photo encore absente (defilement tres rapide) : on la demande tout de suite.
    charger(imgs[plan]); charger(imgs[plan + 1]);
    if (planCourant !== -1 && !reduit) obtu.animate([{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }], { duration: 180 });
    const precedent = planCourant; planCourant = plan;
    const pl = PLANS[plan], c = D.chapitres[pl.ci];
    imgs.forEach((im, i) => { im.classList.toggle("on", i === plan); im.style.display = i === plan || i === precedent ? "block" : "none"; });
    h.num.textContent = String(pl.ci + 1).padStart(2, "0");
    h.titre.textContent = c.titre;
    h.cpt.textContent = `${pl.pi + 1} / ${c.n}`;
    [h.vit.textContent, h.ouv.textContent, h.iso.textContent] = c.reglages;
  }

  // ---------- Image ----------
  const doux = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const cibleVerre = new THREE.Vector3();
  function maj() {
    const vh = hEcran;
    const y = Math.min(Math.max(scrollY - ancre(), 0), racine.offsetHeight - vh);
    const p = pAnim;
    if (p !== dernier) {
      dernier = p;
      if (renderer) {
        // Trois-quarts, rotation par le profil jusqu'au dos, puis avancee dans l'oeilleton.
        // Sortie amortie : le boitier reagit des le premier instant, puis se pose.
        const rot = 1 - Math.pow(1 - Math.min(1, p / 0.45), 2.4);
        boitier.rotation.y = lerp(-1.02, -Math.PI, rot) + coup;
        const avance = doux((p - 0.42) / 0.58);
        boitier.updateMatrixWorld(true);
        verre.getWorldPosition(cibleVerre);
        // En vertical, le boitier recule et l'ensemble boitier + objectif est centre
        // (marges gauche/droite egales, mesurees a 390 px).
        const vertical = camera.aspect < 1;
        const recul = vertical ? Math.min(2.4, Math.max(1, (1.6 / camera.aspect) * 0.62)) : 1;
        const decale = vertical ? -0.38 : -0.85;
        const depart = new THREE.Vector3(lerp(decale, 0, rot), lerp(1.35, 0.95, rot), lerp(5.2, 4.4, rot) * recul);
        const vise = new THREE.Vector3(lerp(decale, 0, rot), lerp(vertical ? 1.05 : 0.55, 0.45, rot), 0);
        const arrivee = cibleVerre.clone().add(new THREE.Vector3(0, 0, 0.12));
        const e = avance * avance * (3 - 2 * avance);
        camera.position.lerpVectors(depart, arrivee, Math.pow(e, 1.6));
        camera.lookAt(vise.clone().lerp(cibleVerre.clone().add(new THREE.Vector3(0, 0, -1)), doux((p - 0.42) / 0.3)));
        camera.fov = lerp(28, 40, doux((p - 0.75) / 0.25));
        camera.updateProjectionMatrix();
        effet.render(scene, camera);
        placerNotes();
      }
      tete.style.opacity = String(1 - doux(p / 0.12));
      tete.style.visibility = p > 0.12 ? "hidden" : "visible";
      indic.style.opacity = String(1 - doux(p / 0.06));
      indic.style.visibility = p > 0.06 ? "hidden" : "visible";
      legende.style.opacity = String(1 - doux(p / 0.2));
      viseur.style.opacity = String(doux((p - 0.93) / 0.07));
      viseur.setAttribute("aria-hidden", String(p < 0.93));
      if (p > 0.02) precharger();
      if (p >= 1) chargerLaSuite();
    }
    const apres = etat === "viseur" ? Math.max(0, y - ENTREE * vh) : 0;
    afficherPlan(Math.min(PLANS.length - 1, Math.floor(apres / (PAS * vh))));
  }

  // ---------- Le plan d'entree, joue seul ----------
  const lisse = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function jouer(sens) {
    etat = sens;
    yVerrou = scrollY;
    document.documentElement.classList.add("v3d-verrou");
    const de = pAnim, a = sens === "entree" ? 1 : 0;
    const duree = reduit ? 0 : sens === "entree" ? DUREE_ENTREE : DUREE_SORTIE;
    const t0 = performance.now();
    const pas = (t) => {
      const k = duree ? Math.min(1, (t - t0) / duree) : 1;
      pAnim = de + (a - de) * lisse(k);
      maj();
      if (k < 1) { requestAnimationFrame(pas); return; }
      etat = sens === "entree" ? "viseur" : "repos";
      document.documentElement.classList.remove("v3d-verrou");
      // La page se pose au debut du viseur (ou en haut), la ou le plan s'est arrete.
      scrollTo({ top: ancre() + (sens === "entree" ? ENTREE * hEcran + 2 : 0), behavior: "instant" });
      maj();
    };
    requestAnimationFrame(pas);
  }

  // Pendant le plan (ou une carte ouverte), molette, doigt et clavier sont retenus.
  const retenir = (e) => {
    if (e.type === "keydown" && e.target.closest?.("input")) return;
    if (etat === "entree" || etat === "sortie" || (carteOuverte && !e.target.closest?.(".v3d-carte"))) e.preventDefault();
  };
  addEventListener("wheel", retenir, { passive: false });
  addEventListener("touchmove", retenir, { passive: false });
  addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(e.key)) retenir(e); });

  let enAttente = false;
  function surDefilement() {
    const y = scrollY - ancre();
    if (etat === "entree" || etat === "sortie") { if (Math.abs(scrollY - yVerrou) > 1) scrollTo({ top: yVerrou, behavior: "instant" }); return; }
    // Arrivee directe plus bas (ancre #retouche, retour arriere) : pas de plan a jouer.
    if (etat === "repos" && y > ENTREE * hEcran) { etat = "viseur"; pAnim = 1; dernier = -1; maj(); return; }
    if (renderer && etat === "repos" && y > 4) { jouer("entree"); return; }
    if (renderer && etat === "viseur" && y < ENTREE * hEcran - 4) { jouer("sortie"); return; }
    maj();
  }
  addEventListener("scroll", () => { if (enAttente) return; enAttente = true; requestAnimationFrame(() => { enAttente = false; surDefilement(); }); }, { passive: true });
  indic.addEventListener("click", () => { if (etat === "repos" && renderer) jouer("entree"); });

  // Tant que personne n'a defile, le boitier esquisse un petit tour toutes les 8 s.
  function esquisser() {
    if (etat !== "repos" || carteOuverte || reduit || !renderer) return;
    const t0 = performance.now();
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      coup = -0.22 * Math.sin(Math.PI * k) * (1 - 0.3 * k);
      dernier = -1; maj();
      if (k < 1 && etat === "repos") requestAnimationFrame(pas); else { coup = 0; dernier = -1; maj(); }
    };
    requestAnimationFrame(pas);
  }
  setTimeout(function relance() { esquisser(); if (etat === "repos") setTimeout(relance, 8000); }, 4000);

  // ---------- Annotations ----------
  const notes = $(".v3d-notes"), svg = notes.querySelector("svg");
  const N = [
    { piece: new THREE.Vector3(-0.30, 0.10, 1.25), dx: -150, dy: -10 },
    { piece: new THREE.Vector3(0.10, 0.96, 0.0), dx: 170, dy: -130 },
    { piece: new THREE.Vector3(0.62, 0.20, 0.10), dx: 90, dy: 170 },
  ].map((n, i) => ({ ...n, el: notes.querySelectorAll(".v3d-note")[i], x: 0, y: 0 }));
  const v = new THREE.Vector3();
  function placerNotes() {
    const w = canvas.clientWidth, hh = canvas.clientHeight;
    let lignes = "";
    for (const n of N) {
      v.copy(n.piece); boitier.localToWorld(v); v.project(camera);
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * hh;
      n.x = x; n.y = y;
      const k = 1 - 10 / Math.hypot(n.dx, n.dy); // le trait s'arrete a 10 px de la note
      lignes += `<line x1="${x}" y1="${y}" x2="${x + n.dx * k}" y2="${y + n.dy * k}"/><circle class="v3d-pouls" cx="${x}" cy="${y}" r="3.5"/><circle cx="${x}" cy="${y}" r="3.5"/>`;
      const gauche = n.dx < 0;
      n.el.style.left = (x + n.dx - (gauche ? 220 : 0)) + "px";
      n.el.style.top = (n.dy < 0 ? y + n.dy - 52 : y + n.dy) + "px";
      n.el.style.textAlign = gauche ? "right" : "left";
    }
    svg.innerHTML = lignes;
    const vis = 1 - Math.min(1, pAnim / 0.08);
    notes.style.opacity = String(vis); notes.style.visibility = vis < 0.02 ? "hidden" : "visible";
  }

  // ---------- Cartes ----------
  // Elles s'ouvrent depuis le point de la piece (cercle qui s'agrandit) ;
  // au telephone, en feuille qui monte du bas.
  const voile = $(".v3d-voile"), carte = $(".v3d-carte");
  const modeles = [...racine.querySelectorAll(".v3d-modele")];
  let ouverte = -1, declencheur = null;
  function ouvrir(i, source) {
    carte.replaceChildren(modeles[i].content.cloneNode(true));
    const n = N[i], W = innerWidth, H = innerHeight, cw = Math.min(440, W - 32);
    carte.hidden = false; voile.hidden = false;
    const ch = carte.offsetHeight;
    // Sans annotation visible (telephone), le cercle part du bouton.
    let ox = n.x, oy = n.y;
    if (!ox || getComputedStyle(notes).display === "none") { const r = source.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; }
    let left = ox + (n.dx < 0 ? 40 : -cw - 40), top = oy - ch / 2;
    if (n.dx >= 0 && left < 24) left = ox + 40;
    // Jamais sur la barre de navigation fixe.
    const haut = entete() + 16;
    left = Math.max(16, Math.min(W - cw - 16, left)); top = Math.max(haut, Math.min(H - ch - 16, top));
    carte.style.left = left + "px"; carte.style.top = top + "px";
    carte.style.setProperty("--ox", (ox - left) + "px"); carte.style.setProperty("--oy", (oy - top) + "px");
    const cmp = carte.querySelector(".v3d-comparer");
    if (cmp) { const r = cmp.querySelector("input"); r.addEventListener("input", () => cmp.style.setProperty("--pos", r.value + "%")); }
    carte.querySelector("[data-viseur]")?.addEventListener("click", () => { fermer(); if (etat === "repos" && renderer) jouer("entree"); });
    carte.querySelector(".v3d-fermer").addEventListener("click", fermer);
    // Un lien vers la suite de la page ferme la carte avant de partir.
    // Un lien vers la suite de la page : le defilement doux du site passerait par le
    // haut de la scene et declencherait le plan d'entree, qui retient la page.
    // On saute donc le plan (etat viseur) et on va a la section d'un coup.
    carte.querySelectorAll("a[href^='#']").forEach((a) => a.addEventListener("click", (e) => {
      const cible = document.querySelector(a.getAttribute("href"));
      if (!cible) return;
      e.preventDefault();
      fermer(false);
      etat = "viseur"; pAnim = 1; dernier = -1; maj();
      cible.scrollIntoView({ behavior: "instant", block: "start" });
      history.replaceState(null, "", a.getAttribute("href"));
    }));
    ouverte = i; declencheur = source; carteOuverte = true;
    racine.querySelectorAll("[data-carte]").forEach((b) => b.setAttribute("aria-expanded", String(+b.dataset.carte === i)));
    requestAnimationFrame(() => requestAnimationFrame(() => { carte.classList.add("on"); voile.classList.add("on"); }));
    setTimeout(() => carte.querySelector(".v3d-fermer").focus({ preventScroll: true }), 60);
  }
  function fermer(rendreFocus = true) {
    if (ouverte < 0) return;
    carte.classList.remove("on"); voile.classList.remove("on");
    setTimeout(() => { if (!carte.classList.contains("on")) { carte.hidden = true; voile.hidden = true; } }, reduit ? 0 : 420);
    racine.querySelectorAll("[data-carte]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    ouverte = -1; carteOuverte = false;
    if (rendreFocus) declencheur?.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-carte]");
    if (b && racine.contains(b)) { const i = +b.dataset.carte; ouverte === i ? fermer() : ouvrir(i, b); return; }
    if (ouverte >= 0 && !carte.contains(e.target)) fermer();
  });
  addEventListener("keydown", (e) => {
    if (ouverte < 0) return;
    if (e.key === "Escape") { fermer(); return; }
    if (e.key === "Tab") { // le focus reste dans la carte
      const f = [...carte.querySelectorAll("a, button, input")]; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  // ---------- Demarrage ----------
  function taille() {
    poserHauteur();
    if (renderer) {
      const w = canvas.clientWidth, hh = canvas.clientHeight;
      renderer.setSize(w, hh, false); camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    dernier = -1; maj();
  }
  addEventListener("resize", () => { fermer(false); taille(); });
  if (scrollY - ancre() >= ENTREE * hEcran) { etat = "viseur"; pAnim = 1; }
  if (!renderer || pAnim >= 1) { precharger(); chargerLaSuite(); }
  document.fonts.ready.then(taille);
  taille();
  racine.classList.add("v3d-pret");
}
