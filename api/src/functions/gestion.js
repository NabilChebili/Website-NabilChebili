// /api/gestion/* — l'API de /admin. Reservee au role « admin » deux fois :
// par staticwebapp.config.json, puis ici (refusAdmin). Le prefixe n'est pas
// « admin » : Azure Functions reserve /admin a ses propres routes.

const { app } = require("@azure/functions");
const { table, json, lireJson, refusAdmin, principal, ipClient, entetesIp, odata } = require("../lib/commun");
const { lireStats } = require("../lib/compteurs");
const { listeIp, ajouterIp, retirerIp } = require("../lib/chine");

const PAGES = ["vietnam", "indonesie", "chine"];
const STATUTS = new Set(["attente", "publie", "refuse"]);

// Qui suis-je, et quelle IP le serveur voit-il ? Sert aussi a verifier, une
// fois deploye, quel en-tete porte la vraie IP (voir commun.ipClient).
app.http("gestionMoi", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "gestion/moi",
  handler: async (req) => {
    const refus = refusAdmin(req);
    if (refus) return refus;
    const p = principal(req);
    return json(200, {
      utilisateur: p.userDetails,
      fournisseur: p.identityProvider,
      roles: p.userRoles,
      ip: ipClient(req),
      entetes: entetesIp(req),
    });
  },
});

app.http("gestionStats", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "gestion/stats",
  handler: async (req) => {
    const refus = refusAdmin(req);
    if (refus) return refus;
    const jours = Math.min(Math.max(parseInt(req.query.get("jours") || "30", 10) || 30, 1), 365);
    return json(200, await lireStats(jours));
  },
});

app.http("gestionCommentaires", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "gestion/commentaires",
  handler: async (req) => {
    const refus = refusAdmin(req, { ecriture: req.method === "POST" });
    if (refus) return refus;
    const t = await table("commentaires");

    if (req.method === "GET") {
      const statut = req.query.get("statut") || "attente";
      const filtre = STATUTS.has(statut) ? `statut eq '${odata(statut)}'` : undefined;
      const liste = [];
      for await (const e of t.listEntities({ queryOptions: { filter: filtre } })) {
        liste.push({
          page: e.partitionKey,
          id: e.rowKey,
          nom: e.nom,
          texte: e.texte,
          langue: e.langue,
          statut: e.statut,
          cree: e.cree,
          trace: e.trace,
        });
        if (liste.length >= 500) break;
      }
      liste.sort((a, b) => (a.cree < b.cree ? 1 : -1));
      return json(200, { commentaires: liste });
    }

    const c = await lireJson(req);
    if (!c || !PAGES.includes(c.page) || typeof c.id !== "string") return json(400, { erreur: "Requête illisible." });
    if (c.action === "supprimer") {
      try {
        await t.deleteEntity(c.page, c.id);
      } catch (e) {
        if (e.statusCode !== 404) throw e;
      }
      return json(200, { ok: true });
    }
    const statut = { publier: "publie", refuser: "refuse", attente: "attente" }[c.action];
    if (!statut) return json(400, { erreur: "Action inconnue." });
    try {
      await t.updateEntity({ partitionKey: c.page, rowKey: c.id, statut, modere: new Date().toISOString() }, "Merge");
    } catch (e) {
      if (e.statusCode === 404) return json(404, { erreur: "Commentaire introuvable." });
      throw e;
    }
    return json(200, { ok: true, statut });
  },
});

app.http("gestionChineIp", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "gestion/chine-ip",
  handler: async (req) => {
    const refus = refusAdmin(req, { ecriture: req.method === "POST" });
    if (refus) return refus;
    if (req.method === "GET") return json(200, { ip: await listeIp(true), moi: ipClient(req) });

    const c = await lireJson(req);
    if (!c) return json(400, { erreur: "Requête illisible." });
    try {
      if (c.action === "ajouter") {
        const expire = c.expire ? new Date(c.expire) : null;
        if (expire && Number.isNaN(expire.getTime())) return json(400, { erreur: "Date d'expiration invalide." });
        const ip = await ajouterIp({ ip: c.ip, nom: c.nom, expire: expire ? expire.toISOString() : "" });
        return json(200, { ok: true, ip });
      }
      if (c.action === "retirer") {
        await retirerIp(c.ip);
        return json(200, { ok: true });
      }
    } catch (e) {
      if (e.statut === 400) return json(400, { erreur: e.message });
      throw e;
    }
    return json(400, { erreur: "Action inconnue." });
  },
});
