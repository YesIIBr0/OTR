import { ok } from "../../../lib/api";

// NSDA · Tabroom (indexcards) — proxy server-side de la API pública oficial (api.tabroom.com/v1).
// FASE 1: lista de torneos con resultados publicados. Usa SOLO endpoints public (security:[]),
// SIN api_key y SIN datos personales de terceros (COPPA-safe). El scraping del HTML está
// prohibido por el ToS de NSDA; esta es la vía sancionada (API JSON oficial).
// El historial personal por alumno (GET /v1/ext/nsda/history) es FASE 2: requiere el grant
// institucional api_auth_nsda de NSDA, o que el alumno autentique su propia cuenta Tabroom.
//
// Server-side a propósito: evita el CSP/CORS del browser (connect-src no permite api.tabroom.com)
// y cachea la respuesta (revalidate) para no golpear la API de NSDA en cada carga.

const TABROOM_TOURNS = "https://api.tabroom.com/v1/rest/tourns";

export async function GET() {
  try {
    const url = `${TABROOM_TOURNS}?publishedResults=true&limit=40`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      // Caché de 30 min: los resultados de torneos no cambian minuto a minuto.
      next: { revalidate: 1800 },
      // [RESIL] Timeout de 5s: un hang de api.tabroom.com no debe dejar la request
      // colgada ~300s (default de undici) en un VPS de 1 CPU. El catch degrada a lista vacía.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return ok({ tourns: [], unavailable: true });
    const raw = await res.json().catch(() => []);
    const list = Array.isArray(raw) ? raw : [];
    const tourns = list
      .map((t: any) => ({
        id: Number(t.id) || 0,
        name: String(t.name || "").trim(),
        city: String(t.city || "").trim(),
        state: String(t.state || "").trim(),
        country: String(t.country || "").trim(),
        start: t.start || null,
        end: t.end || null,
        // Página pública de resultados del torneo en Tabroom (destino del "Ver resultados").
        resultsUrl: t.id ? `https://www.tabroom.com/index/tourn/results/index.mhtml?tourn_id=${Number(t.id)}` : "",
      }))
      .filter((t: any) => t.id && t.name)
      // Más recientes primero (resultados = torneos ya ocurridos o en curso).
      .sort((a: any, b: any) => String(b.start || "").localeCompare(String(a.start || "")))
      .slice(0, 10);
    return ok({ tourns });
  } catch {
    // Nunca romper el Aula por la API externa: degradar a lista vacía + flag.
    return ok({ tourns: [], unavailable: true });
  }
}
