// OTR LMS · helpers de API — respuestas consistentes + parseo de body sin tirar 500.
import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Lee JSON del request sin lanzar: body malformado → objeto vacío. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return ((await req.json()) ?? {}) as T;
  } catch {
    return {} as T;
  }
}

/** Recorta y limita una string de entrada. */
export function clean(v: unknown, max = 2000): string {
  return String(v ?? "").trim().slice(0, max);
}

/**
 * Valida una URL para almacenar/renderizar como href/src. Acepta rutas relativas
 * (/uploads/…, #ancla) y los esquemas http/https/mailto/tel. Rechaza javascript:,
 * data:, vbscript:, etc. → devuelve null. Úsalo para avatarUrl/fileUrl/url de recursos.
 */
export function safeUrl(v: unknown, max = 2000): string | null {
  const s = String(v ?? "").trim().slice(0, max);
  if (!s) return null;
  // Relativa (misma app) o ancla → segura.
  if (s.startsWith("/") || s.startsWith("#")) return s;
  // ¿Tiene esquema? Si no, es relativa → segura.
  const m = s.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (!m) return s;
  const scheme = m[1].toLowerCase();
  return ["http", "https", "mailto", "tel"].includes(scheme) ? s : null;
}

/**
 * IP del cliente detrás del reverse proxy de confianza (Nginx). x-forwarded-for es una lista
 * "ipCliente, proxy1, proxy2…"; nuestro Nginx AÑADE el remote_addr real al FINAL, así que el
 * ÚLTIMO hop NO es falsificable por el cliente (a diferencia del primero). Tomamos ese.
 * Supuesto: exactamente un proxy de confianza (Nginx) delante. (OPS-04 / SEC-2)
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "local";
}

// Dominios de video permitidos para grabaciones (anti open-redirect/phishing). El coach NO
// puede meter una URL arbitraria que luego clican padres/alumnos. Acepta ruta relativa
// (grabación subida a la propia app) o https de un host de video conocido. (INJ recordingUrl)
const VIDEO_HOST_SUFFIXES = ["youtube.com", "youtu.be", "vimeo.com", "cloudflarestream.com", "videodelivery.net"];
export function safeVideoUrl(v: unknown, max = 2000): string | null {
  const s = safeUrl(v, max);
  if (!s) return null;
  if (s.startsWith("/")) return s; // grabación alojada en la propia plataforma
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    return VIDEO_HOST_SUFFIXES.some((h) => host === h || host.endsWith("." + h)) ? s : null;
  } catch {
    return null;
  }
}
