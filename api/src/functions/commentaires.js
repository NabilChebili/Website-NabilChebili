// GET  /api/commentaires?page=vietnam — les commentaires publies d'une page.
// POST /api/commentaires               — depot d'un commentaire, en attente de
//                                        moderation : rien n'est public avant
//                                        validation dans /admin.
//
// Table "commentaires" : PartitionKey = page, RowKey = horodatage inverse (le
// plus recent d'abord a la lecture) + alea.

const crypto = require("node:crypto");
const { app } = require("@azure/functions");
const { table, json, lireJson, nettoyer, ipClient, empreinte, odata } = require("../lib/commun");
const { incrementer } = require("../lib/compteurs");

const PAGES = new Set(["vietnam", "indonesie", "chine"]);
const PAR_HEURE = 4;

const rowKeyRecent = () => `${String(9e15 - Date.now()).padStart(16, "0")}-${crypto.randomBytes(3).toString("hex")}`;

app.http("commentaires", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "commentaires",
  handler: async (req, context) => {
    if (req.method === "GET") {
      const page = req.query.get("page");
      if (!PAGES.has(page)) return json(400, { erreur: "Page inconnue." });
      const t = await table("commentaires");
      const liste = [];
      const iter = t.listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${odata(page)}' and statut eq 'publie'`,
          select: ["nom", "texte", "cree", "langue"],
        },
      });
      for await (const e of iter) {
        liste.push({ nom: e.nom, texte: e.texte, cree: e.cree, langue: e.langue });
        if (liste.length >= 200) break;
      }
      return json(200, { commentaires: liste }, { "cache-control": "public, max-age=60" });
    }

    const c = await lireJson(req, 6000);
    if (!c) return json(400, { erreur: "Requête illisible." });

    // Le champ « site » est invisible pour un humain : un robot qui remplit
    // tout le formulaire se signale en le remplissant. Meme reponse qu'un
    // succes, pour ne rien lui apprendre.
    if (c.site) return json(202, { ok: true });
    // Moins de trois secondes entre l'affichage et l'envoi : pas un humain.
    if (!(Number(c.t) >= 3000)) return json(202, { ok: true });

    const page = String(c.page || "");
    const nom = nettoyer(c.nom, 60);
    const texte = nettoyer(c.texte, 2000);
    const langue = c.langue === "en" ? "en" : "fr";
    if (!PAGES.has(page)) return json(400, { erreur: "Page inconnue." });
    if (nom.length < 2) return json(400, { erreur: "nom" });
    if (texte.length < 3) return json(400, { erreur: "texte" });
    if ((texte.match(/https?:\/\//g) || []).length > 2) return json(400, { erreur: "liens" });

    const ip = ipClient(req);
    const trace = ip ? empreinte(ip) : "";

    // Limite de debit par empreinte d'IP et par heure.
    if (trace) {
      const limites = await table("limites");
      const heure = new Date().toISOString().slice(0, 13).replace(/\D/g, "");
      const rk = `${trace}-${heure}`;
      let deja = 0;
      try {
        deja = (await limites.getEntity("commentaire", rk)).n || 0;
      } catch (e) {
        if (e.statusCode !== 404) throw e;
      }
      if (deja >= PAR_HEURE) return json(429, { erreur: "trop" });
      await incrementer(limites, "commentaire", rk);
    }

    const t = await table("commentaires");
    await t.createEntity({
      partitionKey: page,
      rowKey: rowKeyRecent(),
      nom,
      texte,
      langue,
      statut: "attente",
      cree: new Date().toISOString(),
      trace,
    });
    context.log(`commentaire en attente sur ${page}`);
    return json(202, { ok: true });
  },
});
