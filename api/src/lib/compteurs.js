// Compteurs du site, agreges par jour.
//
// Table "stats" : PartitionKey = jour (AAAA-MM-JJ, heure de Paris), RowKey =
// "<type>|<cle>", propriete n. Une page vue incremente une poignee de lignes :
// le total du jour, la page, la langue, l'appareil, et la provenance quand le
// visiteur arrive d'ailleurs. On ne stocke ni IP, ni identifiant, ni cookie :
// c'est ce qui dispense de bandeau de consentement.

const { table, cleTable } = require("./commun");

const jourParis = (d = new Date()) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

// Increment optimiste : on relit et on reecrit tant qu'un autre appel ne s'est
// pas glisse entre les deux (ETag). A ce volume, un ou deux essais suffisent.
async function incrementer(t, pk, rk, essais = 6) {
  for (let i = 0; i < essais; i++) {
    try {
      const e = await t.getEntity(pk, rk);
      await t.updateEntity({ partitionKey: pk, rowKey: rk, n: (e.n || 0) + 1 }, "Merge", { etag: e.etag });
      return;
    } catch (err) {
      if (err.statusCode === 404) {
        try {
          await t.createEntity({ partitionKey: pk, rowKey: rk, n: 1 });
          return;
        } catch (e2) {
          if (e2.statusCode !== 409) throw e2;
        }
      } else if (err.statusCode !== 412) {
        throw err;
      }
    }
  }
}

async function enregistrerVue({ chemin, langue, appareil, source, entree }) {
  const t = await table("stats");
  const jour = jourParis();
  const lignes = ["t|vues", `p|${cleTable(chemin)}`, `l|${langue}`, `d|${appareil}`];
  if (entree) lignes.push("t|entrees", `r|${cleTable(source || "(direct)")}`);
  await Promise.all(lignes.map((rk) => incrementer(t, jour, rk)));
}

// Lecture pour l'admin : les N derniers jours, regroupes par type.
async function lireStats(jours) {
  const t = await table("stats");
  // Les jours se comptent sur le calendrier, pas en tranches de 24h : un
  // changement d'heure ferait sauter ou doubler une date.
  const a = jourParis();
  const [y, m, d] = a.split("-").map(Number);
  const liste = Array.from({ length: jours }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (jours - 1 - i))).toISOString().slice(0, 10)
  );
  const de = liste[0];
  const parJour = new Map(liste.map((j) => [j, { jour: j, vues: 0, entrees: 0 }]));
  const somme = { p: new Map(), r: new Map(), l: new Map(), d: new Map() };
  const iter = t.listEntities({
    queryOptions: { filter: `PartitionKey ge '${de}' and PartitionKey le '${a}'`, select: ["PartitionKey", "RowKey", "n"] },
  });
  for await (const e of iter) {
    const [type, ...reste] = e.rowKey.split("|");
    const cle = decodeURIComponent(reste.join("|"));
    if (type === "t") {
      const j = parJour.get(e.partitionKey);
      if (j && (cle === "vues" || cle === "entrees")) j[cle] += e.n || 0;
    } else if (somme[type]) {
      somme[type].set(cle, (somme[type].get(cle) || 0) + (e.n || 0));
    }
  }
  const classer = (m, max = 50) => [...m].sort((x, y) => y[1] - x[1]).slice(0, max);
  const serie = [...parJour.values()];
  return {
    periode: { de, a, jours },
    totaux: {
      vues: serie.reduce((s, j) => s + j.vues, 0),
      entrees: serie.reduce((s, j) => s + j.entrees, 0),
    },
    jours: serie,
    pages: classer(somme.p),
    sources: classer(somme.r),
    langues: classer(somme.l),
    appareils: classer(somme.d),
  };
}

module.exports = { enregistrerVue, lireStats, jourParis, incrementer };
