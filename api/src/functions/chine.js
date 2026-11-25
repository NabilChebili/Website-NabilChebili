// GET /api/chine/acces           — cette IP a-t-elle l'acces anticipe ?
// GET /api/chine/photo/{chemin}  — redirige vers un lien SAS de la photo,
//                                  seulement pour une IP autorisee.

const { app } = require("@azure/functions");
const { json, ipClient } = require("../lib/commun");
const { ipAutorisee, lienPhoto, CHEMIN_PHOTO } = require("../lib/chine");

app.http("chineAcces", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "chine/acces",
  handler: async (req) => {
    const ip = ipClient(req);
    const entree = await ipAutorisee(ip);
    // L'IP est rendue au visiteur lui-meme : c'est ce qu'il envoie a Nabil
    // pour etre ajoute a la liste.
    return json(200, { acces: !!entree, ip });
  },
});

app.http("chinePhoto", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "chine/photo/{*chemin}",
  handler: async (req) => {
    const chemin = req.params.chemin || "";
    if (!CHEMIN_PHOTO.test(chemin)) return { status: 404 };
    if (!(await ipAutorisee(ipClient(req)))) return { status: 403, headers: { "cache-control": "no-store" } };
    return {
      status: 302,
      headers: {
        location: await lienPhoto(chemin, 60),
        // Le navigateur garde la redirection dix minutes, le lien en vaut
        // soixante : revenir sur une photo ne rappelle pas l'API.
        "cache-control": "private, max-age=600",
      },
    };
  },
});
