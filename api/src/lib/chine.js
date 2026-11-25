// Acces anticipe a la galerie Chine, par adresse IP.
//
// Table "chineip" : PartitionKey = "ip", RowKey = l'IP canonique, nom (pour
// savoir qui c'est), expire (ISO, vide = sans fin), ajoute (ISO).
//
// Les photos attendent la sortie dans un conteneur PRIVE — par defaut
// « attente », sous le prefixe « Chine/ », la ou le Terraform les range deja.
// Une IP autorisee recoit, photo par photo, un lien SAS en lecture seule et de
// courte duree. Sans lui, le conteneur repond 404 : c'est la que tient la
// protection, pas dans le HTML.

const { BlobServiceClient, BlobSASPermissions } = require("@azure/storage-blob");
const { table, normaliserIp } = require("./commun");

const CONTENEUR = () => process.env.CHINE_CONTENEUR || "attente";
const PREFIXE = () => process.env.CHINE_PREFIXE ?? "Chine/";

// La liste est relue au plus une fois par minute et par instance : une galerie
// de 300 photos ferait sinon 300 lectures de table.
let cache = { a: 0, liste: null };
async function listeIp(frais = false) {
  if (!frais && cache.liste && Date.now() - cache.a < 60000) return cache.liste;
  const t = await table("chineip");
  const liste = [];
  for await (const e of t.listEntities({ queryOptions: { filter: "PartitionKey eq 'ip'" } })) {
    liste.push({ ip: e.rowKey, nom: e.nom || "", expire: e.expire || "", ajoute: e.ajoute || "" });
  }
  cache = { a: Date.now(), liste };
  return liste;
}
const viderCache = () => (cache = { a: 0, liste: null });

async function ipAutorisee(ip) {
  if (!ip) return null;
  const maintenant = Date.now();
  return (await listeIp()).find((x) => x.ip === ip && (!x.expire || Date.parse(x.expire) > maintenant)) || null;
}

async function ajouterIp({ ip, nom, expire }) {
  const canon = normaliserIp(ip);
  if (!canon) throw Object.assign(new Error("IP invalide"), { statut: 400 });
  const t = await table("chineip");
  await t.upsertEntity(
    { partitionKey: "ip", rowKey: canon, nom: String(nom || "").slice(0, 80), expire: expire || "", ajoute: new Date().toISOString() },
    "Replace"
  );
  viderCache();
  return canon;
}

async function retirerIp(ip) {
  const canon = normaliserIp(ip);
  if (!canon) throw Object.assign(new Error("IP invalide"), { statut: 400 });
  const t = await table("chineip");
  try {
    await t.deleteEntity("ip", canon);
  } catch (e) {
    if (e.statusCode !== 404) throw e;
  }
  viderCache();
}

// <etape>/<id>.jpg, <etape>/v/<id>.webp (vignette), recit/... : rien d'autre.
const CHEMIN_PHOTO = /^[a-z0-9-]{1,40}\/(v\/)?[A-Za-z0-9_-]{1,80}\.(jpe?g|webp)$/;

let service = null;
function lienPhoto(chemin, minutes = 60) {
  service ??= BlobServiceClient.fromConnectionString(process.env.STOCKAGE_CONNEXION);
  const blob = service.getContainerClient(CONTENEUR()).getBlobClient(PREFIXE() + chemin);
  return blob.generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    startsOn: new Date(Date.now() - 5 * 60000),
    expiresOn: new Date(Date.now() + minutes * 60000),
  });
}

module.exports = { listeIp, ipAutorisee, ajouterIp, retirerIp, lienPhoto, CHEMIN_PHOTO };
