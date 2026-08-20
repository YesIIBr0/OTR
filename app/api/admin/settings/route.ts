// OTR Hub · Admin — AJUSTES DE PLATAFORMA editables desde la consola.
//
// Nace de un hueco concreto: el enlace del grupo de WhatsApp del paso 3 de la admisión
// vivía SOLO en una variable de entorno. Cambiarlo exigía entrar por SSH al servidor y
// redesplegar, o sea que el sitio no se podía administrar sin un desarrollador — justo lo
// contrario de lo que un admin espera.
//
//  GET   — solo ADMIN — devuelve los ajustes conocidos con su valor efectivo y de dónde
//          sale (base de datos, variable de entorno o sin definir) → ok({ settings }).
//  PATCH — solo ADMIN — { key, value } guarda un ajuste. `value` vacío BORRA la fila, para
//          poder volver al valor del entorno sin tener que adivinar cuál era.
//
// Lista blanca estricta de claves: sin ella, un PATCH podría sembrar cualquier par
// clave/valor en la tabla y convertirla en un basurero sin dueño.
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { audit } from "../../../lib/audit";

/** Los ajustes que existen. Añadir uno aquí es todo lo que hace falta: no hay migración
 *  por ajuste porque la tabla es clave/valor. */
export const SETTINGS = [
  {
    key: "admission.communityUrl",
    env: "ADMISSION_COMMUNITY_URL",
    label: "Enlace del grupo de la comunidad",
    help: "Se usa en el paso 3 de la admisión. Si se deja vacío, el paso enseña su estado honesto (\"seguimos montando el grupo\") en vez de un enlace roto.",
    kind: "url" as const,
  },
];

const BY_KEY = new Map(SETTINGS.map((s) => [s.key, s]));

/** Solo http(s) absoluto. Un `javascript:` aquí acabaría en un href que ve un menor. */
function validate(kind: string, value: string): string | null {
  if (!value) return null;                      // vacío = borrar, siempre válido
  if (kind === "url" && !/^https?:\/\//i.test(value)) return "El enlace tiene que empezar por http:// o https://";
  return null;
}

/** Valor efectivo de un ajuste: manda la base, y si no hay fila cae a la variable de
 *  entorno. Así lo que ya estaba configurado en el servidor sigue funcionando el día que
 *  esto se despliega, sin que nadie tenga que copiar nada a mano. */
export async function settingValue(key: string): Promise<string> {
  const def = BY_KEY.get(key);
  if (!def) return "";
  try {
    const row = await db.platformSetting.findUnique({ where: { key } });
    if (row?.value) return row.value;
  } catch {
    // La tabla puede no estar migrada todavía: se cae al entorno en vez de tumbar la
    // pantalla que consulta el ajuste. Mismo criterio que el resto de lecturas opcionales.
  }
  return String(process.env[def.env] || "").trim();
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("No autorizado", 403);

  /* El catch devuelve [] si la tabla aún no está migrada: la consola sigue abriendo y
     enseña los valores del entorno en vez de romperse. El tipo se fija a mano porque
     `[] as never[]` en el catch ensancha la unión a unknown. */
  type Row = { key: string; value: string; updatedByName: string | null; updatedAt: Date };
  const rows: Row[] = await db.platformSetting.findMany().catch(() => [] as Row[]);
  const byKey = new Map<string, Row>(rows.map((r) => [r.key, r]));

  const settings = SETTINGS.map((s) => {
    const row = byKey.get(s.key);
    const envValue = String(process.env[s.env] || "").trim();
    const value = row?.value || envValue;
    return {
      key: s.key,
      label: s.label,
      help: s.help,
      kind: s.kind,
      value,
      // De dónde sale el valor que está en vigor — el admin tiene que poder distinguir
      // "lo puse yo" de "viene del servidor" antes de cambiarlo.
      source: row?.value ? "db" : envValue ? "env" : "unset",
      envName: s.env,
      updatedByName: row?.updatedByName || "",
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : "",
    };
  });
  return ok({ settings });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("No autorizado", 403);

  const body = await readJson(req);
  const key = clean((body as Record<string, unknown>)?.key, 80);
  const def = BY_KEY.get(key);
  if (!def) return bad("Ajuste desconocido", 400);

  const value = clean((body as Record<string, unknown>)?.value, 500).trim();
  const err = validate(def.kind, value);
  if (err) return bad(err, 400);

  const before = await db.platformSetting.findUnique({ where: { key } }).catch(() => null);

  if (!value) {
    await db.platformSetting.deleteMany({ where: { key } });
  } else {
    await db.platformSetting.upsert({
      where: { key },
      create: { key, value, updatedById: user.id, updatedByName: user.name || "" },
      update: { value, updatedById: user.id, updatedByName: user.name || "" },
    });
  }

  await audit({
    actorId: user.id,
    actorName: user.name || "",
    action: "setting.update",
    targetType: "setting",
    targetId: key,
    detail: `${def.label}: "${before?.value || "(sin definir)"}" → "${value || "(sin definir)"}"`,
  });

  return ok({ key, value });
}
