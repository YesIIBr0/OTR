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
