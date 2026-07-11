// OTR LMS · helpers de API — respuestas consistentes + parseo de body sin tirar 500.
import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

// [I18N-API] Código estable por frase de error común. El cliente (Aula.tsx apiErrorMsg)
// mapea `code` → llave i18n `apierr.*` y muestra el toast en el idioma activo; si la frase
// no está aquí (o la llave no existe), cae al mensaje ES del servidor. Centralizado aquí
// para no tocar los ~118 call-sites de bad().
const ERROR_CODES: Record<string, string> = {
  "No autenticado": "auth",
  "No autorizado": "forbidden",
  "Solo administradores": "adminOnly",
  "Solo profesores": "teacherOnly",
  "Solo coaches": "coachOnly",
  "Solo coaches pueden gestionar un perfil de coach": "coachOnly",
  "Solo un coach puede revisar solicitudes": "coachOnly",
  "Solo un coach puede ver la cola": "coachOnly",
  "Coach no encontrado": "coachNotFound",
  "Estudiante no encontrado": "studentNotFound",
  "Curso no encontrado": "courseNotFound",
  "Examen no encontrado": "quizNotFound",
  "Reserva no encontrada": "bookingNotFound",
  "Solicitud no encontrada": "requestNotFound",
  "Esta solicitud ya fue resuelta": "alreadyResolved",
  "Ese horario ya fue reservado": "slotTaken",
  "No estás inscrito en este curso": "notEnrolled",
  "No tienes un vínculo activo con ese estudiante": "noStudentLink",
  "Programa no completado": "courseIncomplete",
  "Nada que actualizar": "nothingToUpdate",
  "Estado inválido": "invalidState",
  "Este programa requiere pago": "requiresPayment",
  "Pagos no disponibles temporalmente": "paymentsUnavailable",
  "Correo o contraseña incorrectos": "badCredentials",
  "La contraseña debe tener al menos 6 caracteres": "passwordShort",
  "La nueva contraseña debe tener al menos 6 caracteres": "passwordShort",
  "El registro de menores de 13 años requiere el consentimiento verificable de su padre, madre o tutor. Pídele a tu tutor que nos contacte para crear tu cuenta.": "underThirteen",
};

export function bad(error: string, status = 400) {
  const code = ERROR_CODES[error];
  return NextResponse.json(code ? { ok: false, error, code } : { ok: false, error }, { status });
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
