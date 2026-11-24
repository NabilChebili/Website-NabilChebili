// Vignettes legeres : pour <dossier>/<nom>.jpg, la vignette est
// <dossier>/v/<nom>.webp (environ 800 px de large). La grille ne l'affiche que
// si elle existe vraiment (vue dans le listing du stockage, ou declaree par la
// page) : avant l'envoi des vignettes, le site retombe sur l'original.
const vignettesConnues = new Set();
export const urlVignette = (url) => url.replace(/\/([^/]+)\.jpe?g$/i, "/v/$1.webp");
export function declarerVignettes(urls) {
  for (const u of urls) vignettesConnues.add(urlVignette(u));
}
// Une seule lecture du conteneur entier par construction : elle repere toutes
// les vignettes deja envoyees, y compris celles des photos qu'aucune page ne
// liste (les recits Vietnam / Indonesie sont ecrits en dur dans leurs .json).
let chargement = null;
export function chargerVignettesDuStockage(conteneur = "https://stnchvlqvproduction.blob.core.windows.net/photos/") {
  chargement ??= (async () => {
    const u = new URL(conteneur);
    let marker = "";
    do {
      try {
        const res = await fetch(`${u.origin}${u.pathname.replace(/\/$/, "")}?restype=container&comp=list${marker ? `&marker=${encodeURIComponent(marker)}` : ""}`);
        if (!res.ok) return;
        const xml = await res.text();
        for (const m of xml.matchAll(/<Name>([^<]+\/v\/[^<]+\.webp)<\/Name>/gi)) vignettesConnues.add(`${u.origin}${u.pathname.replace(/\/$/, "")}/${m[1]}`);
        marker = xml.match(/<NextMarker>([^<]*)<\/NextMarker>/)?.[1] ?? "";
      } catch {
        return;
      }
    } while (marker);
  })();
  return chargement;
}

export function vignetteDe(url) {
  const v = urlVignette(url);
  return v !== url && vignettesConnues.has(v) ? v : null;
}

export async function listBlobsFromPublicContainer(containerUrl) {
  try {
    const u = new URL(containerUrl);
    const origin = u.origin;
    const parts = u.pathname.split("/").filter(Boolean);
    const container = parts[0] || "";
    const prefix = parts.slice(1).join("/");

    if (!container) return [];

    let listUrl = `${origin}/${container}?restype=container&comp=list`;
    if (prefix) {
      const p = prefix.endsWith("/") ? prefix : prefix + "/";
      listUrl += `&prefix=${encodeURIComponent(p)}`;
    }

    const res = await fetch(listUrl);
    if (!res.ok) return [];
    const xml = await res.text();

    const names = Array.from(xml.matchAll(/<Name>([^<]+)<\/Name>/g)).map((m) => m[1]);
    if (!names.length) return [];

    const urls = names.map((name) => `${origin}/${container}/${name}`);
    for (const u of urls) if (/\/v\/[^/]+\.webp$/i.test(u)) vignettesConnues.add(u);
    return urls.filter((u) => !/\/v\/[^/]+$/.test(u));
  } catch (err) {
    return [];
  }
}

export async function listGalleries(galleries, fallback = []) {
  const entries = await Promise.all(
    Object.entries(galleries).map(async ([key, url]) => {
      const list = url ? await listBlobsFromPublicContainer(url) : [];
      return [key, list.length ? list : fallback];
    })
  );
  return Object.fromEntries(entries);
}
