// POST /api/uploads — sube un archivo real a disco (public/uploads) y registra la fila.
import { ok, bad, clean } from "../../lib/api";
import { getSessionUser } from "../../lib/auth";
import { rateLimit } from "../../lib/rate-limit";
import {
  saveUpload,
  isAllowedMime,
  MAX_UPLOAD_BYTES,
  MAX_BODY_BYTES,
  tooBigMsg,
  checkKindPolicy,
} from "../../lib/uploads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // [F1.4] Anti-DoS de disco: sin límite, un autenticado sube 25 MB/req en bucle hasta llenar
  // el disco del VPS (y tumba Postgres + backups). Tope por usuario: 20 subidas / 10 min cubre
  // el uso legítimo (materiales de un curso, grabaciones) e impide el flood.
  const rl = rateLimit(`uploads:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  // [A5] Guardia por TAMAÑO antes de parsear. Dos razones, y la segunda es la del bug:
  //  ① no gastar memoria parseando un multipart que se va a rechazar igual;
  //  ② decir la VERDAD. Este proyecto tiene middleware.ts, así que Next clona el cuerpo y lo
  //     TRUNCA a MAX_BODY_BYTES (`middlewareClientMaxBodySize`, next.config.mjs). Un cuerpo
  //     truncado hace que `req.formData()` reviente, y el usuario leía "Esperaba
  //     multipart/form-data" —un error sobre el FORMATO— cuando el problema era el TAMAÑO.
  // Content-Length lo declara el cliente, así que esto NO sustituye a ninguna validación
  // posterior: sólo permite dar el mensaje correcto antes de que el truncamiento lo esconda.
  const declaredBody = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredBody) && declaredBody > MAX_BODY_BYTES) {
    return bad(tooBigMsg(), 413);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    // Cuerpo ilegible. Si venía cargado, la causa real es el tamaño (el cuerpo llegó partido),
    // no el formato: por debajo del tope de archivo el cuerpo SÍ llega entero, así que ahí un
    // fallo de parseo es de verdad un multipart malformado y se dice tal cual.
    if (declaredBody > MAX_UPLOAD_BYTES) return bad(tooBigMsg(), 413);
    return bad("Esperaba multipart/form-data");
  }

  const file = form.get("file");
  const kind = clean(form.get("kind"), 20) || "file";

  if (!file || typeof file === "string" || typeof (file as File).arrayBuffer !== "function") {
    return bad("Falta el archivo");
  }
  const f = file as File;

  // Validación temprana (la lib revalida en profundidad antes de escribir).
  if (!isAllowedMime(f.type || "")) return bad("Tipo de archivo no permitido");
  if (typeof f.size === "number" && f.size > MAX_UPLOAD_BYTES) {
    // [F5-fix] Tope derivado de la constante real (antes decía "50MB" con tope efectivo de 25MB).
    return bad(tooBigMsg(), 413);
  }
  // Reglas ESTRECHAS por kind (hoy: el vídeo DPP del paso 4 de admisión). Sólo puede rechazar
  // lo que los gates comunes ya aceptaron — el resto de kinds pasa sin cambios. La lib lo
  // revalida con el tamaño real, porque `f.size` lo declara el cliente.
  const kindErr = checkKindPolicy(kind, f.type || "", typeof f.size === "number" ? f.size : 0);
  if (kindErr) return bad(kindErr);

  try {
    const saved = await saveUpload(f, user.id, kind);
    return ok({ url: saved.url, original: saved.original, mime: saved.mime, size: saved.size, id: saved.id });
  } catch (e) {
    // La lib revalida con los bytes REALES (`f.size` lo declara el cliente). Si el rechazo es
    // por tamaño, sale con el mismo 413 que los guardias de arriba: mismo motivo, misma
    // respuesta — que el status no dependa de en qué capa se detectó.
    const msg = e instanceof Error ? e.message : "No se pudo guardar el archivo";
    return bad(msg, msg === tooBigMsg() ? 413 : 400);
  }
}
