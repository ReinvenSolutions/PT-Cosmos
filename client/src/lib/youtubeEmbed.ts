/**
 * Convierte enlaces de YouTube (cualquier formato habitual) a URL de embed.
 * Acepta URLs sin esquema (p. ej. "youtu.be/xxx"), youtu.be, watch, embed, Shorts, live.
 */
export function youtubeUrlToEmbed(src: string): string | null {
  const raw = src?.trim();
  if (!raw) return null;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let u: URL;
  try {
    u = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase().replace(/^www\./, "");

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0]?.split("?")[0];
    return validateAndEmbed(id);
  }

  const isYouTube =
    host === "youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host.endsWith(".youtube.com");

  if (!isYouTube) {
    return null;
  }

  const v = u.searchParams.get("v");
  if (v) return validateAndEmbed(v);

  const parts = u.pathname.split("/").filter(Boolean);

  // /embed/VIDEO_ID, /shorts/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID
  for (const key of ["embed", "shorts", "live", "v"] as const) {
    const i = parts.indexOf(key);
    if (i >= 0 && parts[i + 1]) {
      return validateAndEmbed(parts[i + 1]);
    }
  }

  // Ruta /watch/VIDEO_ID (poco frecuente)
  if (parts[0] === "watch" && parts[1] && !parts[1].includes("=")) {
    return validateAndEmbed(parts[1]);
  }

  return null;
}

function validateAndEmbed(id: string | undefined): string | null {
  if (!id) return null;
  const clean = id.replace(/[?&].*$/, "").trim();
  // IDs estándar: 11 caracteres; aceptamos rango seguro para no rechazar casos límite
  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(clean)) return null;
  return `https://www.youtube.com/embed/${clean}`;
}
