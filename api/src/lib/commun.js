// Briques partagees par toutes les fonctions : stockage, identite, IP, reponses.
//
// Une seule variable d'environnement obligatoire : STOCKAGE_CONNEXION, la chaine
// de connexion du compte de stockage du site (posee par Terraform dans les app
// settings de la Static Web App). En local : "UseDevelopmentStorage=true"
// (Azurite).

const crypto = require("node:crypto");
const net = require("node:net");
const { TableClient } = require("@azure/data-tables");

const connexion = () => {
  const c = process.env.STOCKAGE_CONNEXION;
  if (!c) throw new Error("STOCKAGE_CONNEXION absente");
  return c;
};

// Les tables se creent a la premiere utilisation : l'infra n'a qu'a fournir le
// compte de stockage, et un environnement neuf (Azurite, preview) marche seul.
const tables = new Map();
async function table(nom) {
  if (!tables.has(nom)) {
    tables.set(
      nom,
      (async () => {
        const t = TableClient.fromConnectionString(connexion(), nom, { allowInsecureConnection: true });
        try {
          await t.createTable();
        } catch (e) {
          if (e.statusCode !== 409) {
            tables.delete(nom);
            throw e;
          }
        }
        return t;
      })()
    );
  }
  return tables.get(nom);
}

// ------------------------------------------------------------------ IP ---

// Une IP arrive sous plusieurs formes selon le proxy : "1.2.3.4:5678",
// "[2001:db8::1]:443", "::ffff:1.2.3.4". On la ramene a sa forme canonique pour
// qu'une liste d'autorisation la reconnaisse quelle que soit l'ecriture.
function normaliserIp(brut) {
  if (!brut) return "";
  let ip = String(brut).trim();
  const v6Port = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (v6Port) ip = v6Port[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  ip = ip.replace(/^::ffff:(\d{1,3}(\.\d{1,3}){3})$/i, "$1").toLowerCase();
  return net.isIP(ip) ? ip : "";
}

// L'IP du visiteur, telle que la plateforme l'a vue.
//
// Mesure en production le 25/11/2026, en forgeant chaque en-tete :
//   - x-azure-clientip, x-client-ip, x-real-ip ne sont PAS poses par Static
//     Web Apps : un client y met ce qu'il veut, et c'etait repris tel quel ;
//   - x-forwarded-for : SWA garde ce que le client y a ecrit et AJOUTE a la fin
//     DEUX entrees : l'adresse du visiteur, puis celle de son propre relais
//     (une IP Microsoft en 13.69.116.x, qui change d'une requete a l'autre :
//     on se fie a la position de l'entree, jamais a sa valeur).
//     Forme : "<forge par le client…>, <visiteur>, <relais SWA>".
// La bonne valeur est donc l'AVANT-DERNIERE entree. Lire la premiere laissait
// un client forger son IP ; lire la derniere donnait a tous les visiteurs l'IP
// du relais. Le reste ne sert qu'au diagnostic (entetesIp).
const RELAIS_PLATEFORME = 1;
const ENTETES_IP = ["x-forwarded-for", "x-azure-clientip", "x-client-ip", "x-real-ip"];
function ipClient(req) {
  const entrees = (req.headers.get("x-forwarded-for") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // Moins d'entrees que prevu : l'en-tete n'a pas la forme posee par la
  // plateforme (appel direct, environnement local). Pas d'IP plutot qu'une
  // IP devinee.
  if (entrees.length < RELAIS_PLATEFORME + 1) return "";
  return normaliserIp(entrees[entrees.length - 1 - RELAIS_PLATEFORME]);
}

function entetesIp(req) {
  return Object.fromEntries(ENTETES_IP.map((n) => [n, req.headers.get(n) ?? null]));
}

// Empreinte d'une IP : sert a limiter le debit et a reperer un spammeur sans
// conserver l'adresse elle-meme.
function empreinte(valeur) {
  const sel = process.env.SEL_EMPREINTE || connexion();
  return crypto.createHmac("sha256", sel).update(String(valeur)).digest("hex").slice(0, 20);
}

// ------------------------------------------------------------ identite ---

// Static Web Apps authentifie en amont et transmet l'utilisateur dans cet
// en-tete, qu'un client ne peut pas forger : la plateforme l'ecrase.
function principal(req) {
  const brut = req.headers.get("x-ms-client-principal");
  if (!brut) return null;
  try {
    return JSON.parse(Buffer.from(brut, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

// La route /api/gestion/* est deja reservee au role admin par
// staticwebapp.config.json. On le reverifie ici : si la config de routes venait
// a sauter, l'API resterait fermee.
//
// Les ecritures exigent en plus l'en-tete x-demande: admin. Un formulaire pose
// sur un autre site ne peut pas l'ajouter (ce serait une requete CORS avec
// pre-verification, que l'API ne sert pas) : c'est la parade au CSRF.
function refusAdmin(req, { ecriture = false } = {}) {
  const p = principal(req);
  if (!p || !Array.isArray(p.userRoles) || !p.userRoles.includes("admin")) {
    return json(403, { erreur: "Réservé à l'administrateur." });
  }
  if (ecriture && req.headers.get("x-demande") !== "admin") {
    return json(400, { erreur: "En-tête x-demande manquant." });
  }
  return null;
}

// ------------------------------------------------------------ reponses ---

function json(status, corps, entetes = {}) {
  return {
    status,
    jsonBody: corps,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff", ...entetes },
  };
}

async function lireJson(req, max = 8000) {
  const texte = await req.text();
  if (texte.length > max) return null;
  try {
    const v = JSON.parse(texte);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

// Texte saisi par un visiteur : sans caracteres de controle (on garde les
// sauts de ligne), sans blancs en trop, borne en longueur.
// Construite par code : U+2028 et U+2029 ecrits en clair cassent le source.
const INVISIBLES = new RegExp("[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e]", "g");
function nettoyer(v, max) {
  if (typeof v !== "string") return "";
  return v
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLES, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

// Une cle de table (RowKey) refuse / \ # ? et les caracteres de controle.
const cleTable = (v) => encodeURIComponent(String(v)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16));
const deCleTable = (v) => decodeURIComponent(v);

// Echappe une valeur dans un filtre OData.
const odata = (v) => String(v).replace(/'/g, "''");

module.exports = {
  table,
  normaliserIp,
  ipClient,
  entetesIp,
  empreinte,
  principal,
  refusAdmin,
  json,
  lireJson,
  nettoyer,
  cleTable,
  deCleTable,
  odata,
};
