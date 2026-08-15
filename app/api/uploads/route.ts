// POST /api/uploads — sube un archivo real a disco (public/uploads) y registra la fila.
import { ok, bad, clean } from "../../lib/api";
import { getSessionUser } from "../../lib/auth";
import { rateLimit } from "../../lib/rate-limit";
import { saveUpload, isAllowedMime, MAX_UPLOAD_BYTES, checkKindPolicy } from "../../lib/uploads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  // [F1.4] Anti-DoS de disco: sin límite, un autenticado sube 25 MB/req en bucle hasta llenar
  // el disco del VPS (y tumba Postgres + backups). Tope por usuario: 20 subidas / 10 min cubre
  // el uso legítimo (materiales de un curso, grabaciones) e impide el flood.
  const rl = rateLimit(`uploads:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
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
    return bad(`Archivo demasiado grande (máx ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB)`);
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
    return bad(e instanceof Error ? e.message : "No se pudo guardar el archivo");
  }
}
