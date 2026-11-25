// POST /api/vue — une page vue, envoyee par navigator.sendBeacon depuis le
// gabarit commun. Anonyme : aucune IP, aucun identifiant n'est conserve.

const { app } = require("@azure/functions");
const { lireJson } = require("../lib/commun");
const { enregistrerVue } = require("../lib/compteurs");

const ROBOTS = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|node-fetch|axios/i;
const HOTES_SITE = /^(www\.)?nabilchebili\.fr$|\.azurestaticapps\.net$|^localhost$|^127\.0\.0\.1$/i;

// Le chemin vient du client : on n'accepte que la forme d'une route du site,
// sinon n'importe qui remplirait la table de cles arbitraires.
const CHEMIN = /^\/(en\/?)?([a-z0-9-]+\/?){0,3}$/;

app.http("vue", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "vue",
  handler: async (req, context) => {
    // 204 dans tous les cas : un visiteur n'a rien a apprendre d'un refus, et
    // sendBeacon n'ecoute pas la reponse.
    const vide = { status: 204 };
    if (ROBOTS.test(req.headers.get("user-agent") || "")) return vide;
    if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return vide;

    const c = await lireJson(req, 1000);
    if (!c || typeof c.p !== "string") return vide;
    const chemin = (c.p.replace(/\/+$/, "") || "/").toLowerCase();
    if (!CHEMIN.test(chemin) || chemin.startsWith("/admin") || chemin.startsWith("/connexion")) return vide;

    let source = "";
    let entree = true;
    if (typeof c.r === "string" && c.r) {
      try {
        const h = new URL(c.r).hostname.replace(/^www\./, "").toLowerCase();
        if (HOTES_SITE.test(h) || HOTES_SITE.test("www." + h)) entree = false;
        else source = h.slice(0, 80);
      } catch {
        /* referent illisible : arrivee directe */
      }
    }

    try {
      await enregistrerVue({
        chemin,
        langue: chemin === "/en" || chemin.startsWith("/en/") ? "en" : "fr",
        appareil: Number(c.w) > 0 && Number(c.w) < 700 ? "mobile" : "ordinateur",
        source,
        entree,
      });
    } catch (e) {
      context.error("vue: enregistrement impossible", e.message);
    }
    return vide;
  },
});
