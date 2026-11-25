const test = require("node:test");
const assert = require("node:assert/strict");
process.env.STOCKAGE_CONNEXION = "UseDevelopmentStorage=true";
const { normaliserIp, ipClient, nettoyer, refusAdmin, cleTable } = require("../src/lib/commun");
const { CHEMIN_PHOTO } = require("../src/lib/chine");

const req = (h) => ({ headers: new Map(Object.entries(h)) });
const principal = (roles) => Buffer.from(JSON.stringify({ userDetails: "x", userRoles: roles })).toString("base64");

test("normaliserIp ramene chaque ecriture a la forme canonique", () => {
  assert.equal(normaliserIp("81.2.3.4:51234"), "81.2.3.4");
  assert.equal(normaliserIp("[2001:DB8::1]:443"), "2001:db8::1");
  assert.equal(normaliserIp("::ffff:81.2.3.4"), "81.2.3.4");
  assert.equal(normaliserIp(" 2a01:cb00::5 "), "2a01:cb00::5");
  assert.equal(normaliserIp("pas une ip"), "");
  assert.equal(normaliserIp("999.1.1.1"), "");
});

// Forme mesuree en production le 25/11/2026 : "<forge…>, <visiteur>, <relais SWA>".
const RELAIS = "13.69.116.6";

test("ipClient lit l avant-derniere entree de x-forwarded-for : le visiteur, avant le relais SWA", () => {
  assert.equal(ipClient(req({ "x-forwarded-for": `83.167.38.106:51234, ${RELAIS}` })), "83.167.38.106");
  assert.equal(ipClient(req({ "x-forwarded-for": `83.167.38.106, ${RELAIS}:443` })), "83.167.38.106");
});

test("une IP forgee par le client dans x-forwarded-for est ignoree", () => {
  assert.equal(ipClient(req({ "x-forwarded-for": `198.51.100.66, 83.167.38.106, ${RELAIS}` })), "83.167.38.106");
  assert.equal(ipClient(req({ "x-forwarded-for": `198.51.100.66,198.51.100.67, 83.167.38.106, ${RELAIS}` })), "83.167.38.106");
});

test("jamais l IP du relais, commune a tous les visiteurs", () => {
  assert.notEqual(ipClient(req({ "x-forwarded-for": `83.167.38.106, ${RELAIS}` })), RELAIS);
  // Une seule entree : forme inattendue, pas d IP plutot qu une IP devinee.
  assert.equal(ipClient(req({ "x-forwarded-for": RELAIS })), "");
});

test("les en-tetes que la plateforme ne pose pas sont ignores", () => {
  const forges = { "x-azure-clientip": "198.51.100.66", "x-client-ip": "198.51.100.66", "x-real-ip": "198.51.100.66" };
  assert.equal(ipClient(req({ ...forges, "x-forwarded-for": `83.167.38.106, ${RELAIS}` })), "83.167.38.106");
  assert.equal(ipClient(req(forges)), "");
  assert.equal(ipClient(req({})), "");
});

test("refusAdmin : role et en-tete anti-CSRF", () => {
  assert.equal(refusAdmin(req({})).status, 403);
  assert.equal(refusAdmin(req({ "x-ms-client-principal": principal(["anonymous", "authenticated"]) })).status, 403);
  assert.equal(refusAdmin(req({ "x-ms-client-principal": "pas du base64 json" })).status, 403);
  assert.equal(refusAdmin(req({ "x-ms-client-principal": principal(["authenticated", "admin"]) })), null);
  assert.equal(refusAdmin(req({ "x-ms-client-principal": principal(["admin"]) }), { ecriture: true }).status, 400);
  assert.equal(refusAdmin(req({ "x-ms-client-principal": principal(["admin"]), "x-demande": "admin" }), { ecriture: true }), null);
});

test("nettoyer retire les caracteres de controle et borne la longueur", () => {
  assert.equal(nettoyer("  bonjour\u0000‮  ", 50), "bonjour");
  assert.equal(nettoyer("a\r\n\r\n\r\n\r\nb", 50), "a\n\nb");
  assert.equal(nettoyer("x".repeat(100), 10).length, 10);
  assert.equal(nettoyer(42, 10), "");
});

test("cleTable ne laisse passer aucun caractere interdit en RowKey", () => {
  for (const v of ["/chine/apercu", "a#b?c\d", "l'été (2)"]) assert.doesNotMatch(cleTable(v), /[\/\#?'()]/);
});

test("CHEMIN_PHOTO n'accepte que la forme d'une photo", () => {
  assert.match("recit/10461104_p0079.jpg", CHEMIN_PHOTO);
  assert.match("cite-interdite/v/IMG_0001.webp", CHEMIN_PHOTO);
  for (const mauvais of ["../photos/x.jpg", "recit/../../x.jpg", "recit/x.png", "a/b/c/x.jpg", "recit/x.jpg?sv=1", "%2e%2e/x.jpg"])
    assert.doesNotMatch(mauvais, CHEMIN_PHOTO);
});
