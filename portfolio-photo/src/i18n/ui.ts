// =========================================================================
//  Les deux langues du site
//
//  Le francais n'a PAS de prefixe : /clouddevops reste /clouddevops. Le site
//  est en ligne, ses URL francaises sont indexees, et le domaine est en .fr —
//  les deplacer couterait le referencement acquis pour rien. L'anglais se
//  range sous /en/.
//
//  Les chaines propres a une page vivent dans la page, en `const T = { fr, en }`
//  au-dessus du gabarit : on voit les deux versions cote a cote au moment de
//  les modifier. Ici ne vivent que les chaines du chrome, qui sont les memes
//  partout.
// =========================================================================

export const langues = ["fr", "en"] as const;
export type Langue = (typeof langues)[number];
export const langueDefaut: Langue = "fr";

/** Les deux chemins qu'un meme contenu occupe. Sert au selecteur et aux
 *  balises hreflang. */
export function cheminLocalise(route: string, langue: Langue): string {
  const propre = "/" + route.replace(/^\/+|\/+$/g, "");
  if (langue === langueDefaut) return propre === "/" ? "/" : propre;
  return propre === "/" ? "/en" : `/en${propre}`;
}

/** La route « nue », sans prefixe de langue : /en/photo et /photo renvoient
 *  tous deux /photo. C'est la cle qui relie les deux versions d'une page. */
export function routeNue(chemin: string): string {
  const propre = "/" + chemin.replace(/^\/+|\/+$/g, "");
  if (propre === "/en") return "/";
  return propre.startsWith("/en/") ? propre.slice(3) : propre;
}

export function langueDepuisChemin(chemin: string): Langue {
  const propre = "/" + chemin.replace(/^\/+|\/+$/g, "");
  return propre === "/en" || propre.startsWith("/en/") ? "en" : "fr";
}

export const autreLangue = (langue: Langue): Langue => (langue === "fr" ? "en" : "fr");

/** Code BCP 47 pour l'attribut lang et les balises hreflang. */
export const codeLangue: Record<Langue, string> = { fr: "fr-FR", en: "en" };

// ---------------------------------------------------------------- chrome ---

export const ui = {
  fr: {
    "meta.description":
      "Portfolio de Nabil Chebili : Cloud & DevOps (Azure), photographie et musique. Projets, retours d’expérience et galeries.",
    "nav.accueil": "Accueil",
    "nav.clouddevops": "Cloud DevOps",
    "nav.photo": "Photo",
    "nav.musique": "Musique",
    "nav.gaming": "Gaming",
    "nav.sections": "Sections",
    "nav.ouvrir": "Ouvrir le menu",
    "pied.navigation": "Navigation finale",
    "pied.photo": "Photographie",
    "langue.bascule": "Switch to English",
    "langue.courante": "Français",
    "retour.galeries": "← Toutes les galeries",
    "galerie.photographies": "Photographies",
    "grille.toutTelecharger": "Télécharger tout",
    "grille.toutesLesPhotos": "Télécharger toutes les photos de",
    "verrou.message": "Cette galerie est temporairement protégée.",
    "verrou.motDePasse": "Mot de passe",
    "verrou.voir": "Voir les photos",
    "verrou.erreur": "Mot de passe incorrect.",
    "vue.titre": "Visionneuse",
    "vue.telecharger": "Télécharger",
    "vue.partager": "Partager",
    "vue.fermer": "Fermer",
    "vue.precedente": "Photo précédente",
    "vue.suivante": "Photo suivante",
    "vue.copie": "Copié",
    "vue.enCours": "Téléchargement...",
    "vue.echecImage": "Impossible de télécharger l'image. Réessayez.",
    "vue.preparation": "Préparation...",
    "vue.progression": "Téléchargement",
    "vue.archive": "Création archive...",
    "vue.compression": "Compression",
    "vue.echecArchive":
      "Impossible de créer l'archive. Réessayez ou téléchargez les images individuellement.",
    "contact.titre": "Contact",
    "contact.phrase":
      "Pour toute question, collaboration ou prise de contact rapide — écrivez-moi.",
    "contact.delai": "Je réponds généralement sous quelques heures.",
    "contact.email": "Envoyer un email",
  },
  en: {
    "meta.description":
      "Nabil Chebili’s portfolio: Cloud & DevOps (Azure), photography and music. Projects, field notes and galleries.",
    "nav.accueil": "Home",
    "nav.clouddevops": "Cloud DevOps",
    "nav.photo": "Photo",
    "nav.musique": "Music",
    "nav.gaming": "Gaming",
    "nav.sections": "Sections",
    "nav.ouvrir": "Open menu",
    "pied.navigation": "Footer navigation",
    "pied.photo": "Photography",
    "langue.bascule": "Passer en français",
    "langue.courante": "English",
    "retour.galeries": "← All galleries",
    "galerie.photographies": "Photographs",
    "grille.toutTelecharger": "Download all",
    "grille.toutesLesPhotos": "Download every photo from",
    "verrou.message": "This gallery is password-protected for now.",
    "verrou.motDePasse": "Password",
    "verrou.voir": "View the photos",
    "verrou.erreur": "Wrong password.",
    "vue.titre": "Viewer",
    "vue.telecharger": "Download",
    "vue.partager": "Share",
    "vue.fermer": "Close",
    "vue.precedente": "Previous photo",
    "vue.suivante": "Next photo",
    "vue.copie": "Copied",
    "vue.enCours": "Downloading...",
    "vue.echecImage": "Could not download the image. Try again.",
    "vue.preparation": "Preparing...",
    "vue.progression": "Downloading",
    "vue.archive": "Building archive...",
    "vue.compression": "Compressing",
    "vue.echecArchive":
      "Could not build the archive. Try again, or download the images one by one.",
    "contact.titre": "Contact",
    "contact.phrase": "A question, a project, or just a quick hello — write to me.",
    "contact.delai": "I usually reply within a few hours.",
    "contact.email": "Send an email",
  },
} as const;

export function traduire(langue: Langue) {
  return function t(cle: keyof (typeof ui)["fr"]): string {
    return ui[langue][cle] ?? ui[langueDefaut][cle];
  };
}

/** Les entrees de la nav, deja localisees et deja prefixees. */
export function sections(langue: Langue) {
  const t = traduire(langue);
  return [
    { href: cheminLocalise("/clouddevops", langue), route: "/clouddevops", label: t("nav.clouddevops") },
    { href: cheminLocalise("/photo", langue), route: "/photo", label: t("nav.photo") },
    { href: cheminLocalise("/musique", langue), route: "/musique", label: t("nav.musique") },
    { href: cheminLocalise("/gaming", langue), route: "/gaming", label: t("nav.gaming") },
  ];
}

/** Les deux chemins possibles d'une page, pour `getStaticPaths`. Le francais
 *  passe `lang: undefined`, ce qui produit la route sans prefixe. */
export function cheminsDesLangues() {
  return [{ params: { lang: undefined } }, { params: { lang: "en" } }];
}

/** Lit la langue depuis le parametre de route plutot que depuis l'URL : c'est
 *  la source de verite au moment du rendu statique. */
export function langueDepuisParam(param: string | undefined): Langue {
  return param === "en" ? "en" : "fr";
}
