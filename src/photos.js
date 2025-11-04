const PHOTO_HOST = "encontreadvogados.co.mz";

export function isAllowedPhotoUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === PHOTO_HOST
      && url.pathname.startsWith("/wp-content/uploads/");
  } catch {
    return false;
  }
}

export function preferredPhotoUrl(media) {
  const sizes = media?.media_details?.sizes || {};
  const candidate = sizes.medium?.source_url || sizes.full?.source_url || media?.source_url || "";
  return isAllowedPhotoUrl(candidate) ? candidate : "";
}

export async function fetchPhoto(photoUrl, fetchImpl = fetch) {
  if (!isAllowedPhotoUrl(photoUrl)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetchImpl(photoUrl, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) return null;
    if (response.url && !isAllowedPhotoUrl(response.url)) return null;
    const type = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 80 || buffer.length > 2_500_000) return null;
    return { type, buffer };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function createPhotoCache(limit = 60) {
  const cache = new Map();
  return {
    get(key) {
      if (!cache.has(key)) return undefined;
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    },
    set(key, value) {
      cache.set(key, value);
      if (cache.size > limit) cache.delete(cache.keys().next().value);
    },
  };
}
