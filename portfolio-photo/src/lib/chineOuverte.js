// La galerie Chine reste fermee jusqu'a la sortie du teaser (chine.json →
// video.sortie) : avant, aucune photo n'est publiee nulle part sur le site
// (Nabil, 24/11 : « pas d'acces aux photos non plus »), /chine ne montre que
// le compte a rebours. Le site etant statique, c'est la construction qui
// tranche : le workflow de deploiement en relance une a l'heure de sortie.
// CHINE_OUVERTE=1 force l'ouverture (apercu local).
import chine from "../data/chine.json";

export const chineOuverte =
  !!process.env.CHINE_OUVERTE || !chine.video.sortie || Date.now() >= Date.parse(chine.video.sortie);
