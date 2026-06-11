// POST /api/uploads — sube un archivo real a disco (public/uploads) y registra la fila.
import { ok, bad, clean } from "../../lib/api";
import { getSessionUser } from "../../lib/auth";
import { saveUpload, isAllowedMime, MAX_UPLOAD_BYTES } from "../../lib/uploads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

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
    return bad("Archivo demasiado grande (máx 50MB)");
  }

  try {
    const saved = await saveUpload(f, user.id, kind);
    return ok({ url: saved.url, original: saved.original, mime: saved.mime, size: saved.size, id: saved.id });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "No se pudo guardar el archivo");
  }
}
