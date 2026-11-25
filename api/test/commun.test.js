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

test("ipClient prend le premier en-tete exploitable", () => {
  assert.equal(ipClient(req({ "x-forwarded-for": "81.2.3.4:1234, 10.0.0.1" })), "81.2.3.4");
  assert.equal(ipClient(req({ "x-azure-clientip": "90.1.1.1", "x-forwarded-for": "1.1.1.1" })), "90.1.1.1");
  assert.equal(ipClient(req({})), "");
});

test("IP_ENTETE force l'en-tete lu", () => {
  process.env.IP_ENTETE = "x-forwarded-for";
  try {
    assert.equal(ipClient(req({ "x-azure-clientip": "90.1.1.1", "x-forwarded-for": "1.1.1.1" })), "1.1.1.1");
  } finally {
    delete process.env.IP_ENTETE;
  }
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
