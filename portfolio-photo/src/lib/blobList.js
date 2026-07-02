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

    return names.map((name) => `${origin}/${container}/${name}`);
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
