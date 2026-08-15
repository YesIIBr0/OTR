// [BE-TEST · R4 — Tribunal 2.3] POST /api/admin/erase — derecho de supresión end-to-end.
// Fija el contrato legal (Ley 172-13 RD / COPPA): anonimización COMPLETA del User (nombre,
// email-tumba única, sesiones invalidadas por rotación de hash, suspended), purga de
// telemetría/tokens/uploads (filas + unlink de archivos best-effort), snapshots de nombre
// (Submission/QuizAttempt) anonimizados, tutelas REVOKED — y lo que se CONSERVA por diseño:
// el AuditLog del cumplimiento. Guardas anti-abuso: ni a ti mismo ni a otro ADMIN.
// [A4] Añadido el bloque de ADMISIÓN: Admission (teléfono, escuela, fecha de nacimiento y
// TODO el bloque del tutor → null), AdmissionConsent (rastro sí, identidad no),
// ConsultationBooking (la llamada de descubrimiento trae su propia copia de PII) y el
// ARCHIVO del vídeo DPP de un menor.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any, unlink: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));
// Solo se stubbea unlink (lo único que la ruta usa de fs/promises) — sin tocar disco real.
vi.mock("fs/promises", () => ({ unlink: (...a: unknown[]) => box.unlink(...a) }));

import { POST } from "../app/api/admin/erase/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Root", role: "ADMIN" };
const TARGET_ID = "student-9";
const TARGET_EMAIL = "ana.ruiz@otr.do";

async function erase(userId?: string) {
  const res = await POST(jsonReq("/api/admin/erase", userId === undefined ? {} : { userId }));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = ADMIN;
  box.unlink = vi.fn().mockResolvedValue(undefined);
  db.fn("user.findUnique").mockResolvedValue({ id: TARGET_ID, name: "Ana Ruiz", role: "STUDENT", email: TARGET_EMAIL });
  db.fn("upload.findMany").mockResolvedValue([]);
  db.fn("admission.findUnique").mockResolvedValue(null);
  db.fn("user.update").mockResolvedValue({ id: TARGET_ID });
  db.fn("activityEvent.deleteMany").mockResolvedValue({ count: 3 });
  db.fn("passwordReset.deleteMany").mockResolvedValue({ count: 1 });
  db.fn("upload.deleteMany").mockResolvedValue({ count: 0 });
  db.fn("submission.updateMany").mockResolvedValue({ count: 2 });
  db.fn("quizAttempt.updateMany").mockResolvedValue({ count: 2 });
  db.fn("guardianship.updateMany").mockResolvedValue({ count: 1 });
  db.fn("admission.updateMany").mockResolvedValue({ count: 1 });
  db.fn("admissionConsent.updateMany").mockResolvedValue({ count: 2 });
  db.fn("consultationBooking.updateMany").mockResolvedValue({ count: 1 });
  db.fn("upload.findFirst").mockResolvedValue(null);
  db.fn("auditLog.create").mockResolvedValue({ id: "a1" });
});

describe("POST /api/admin/erase — guardas", () => {
  it("sin sesión → 401; TEACHER → 403 (solo ADMIN ejecuta un erasure)", async () => {
    box.user = null;
    expect((await erase(TARGET_ID)).status).toBe(401);
    box.user = { id: "t1", name: "Coach", role: "TEACHER" };
    expect((await erase(TARGET_ID)).status).toBe(403);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("sin userId → 400; usuario inexistente → 404", async () => {
    expect((await erase()).status).toBe(400);
    db.fn("user.findUnique").mockResolvedValue(null);
    expect((await erase("no-existe")).status).toBe(404);
  });

  it("auto-borrado → 400 sin tocar nada (doctrina anti-lockout)", async () => {
    const { status } = await erase(ADMIN.id);
    expect(status).toBe(400);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("borrar a otro ADMIN → 400 sin tocar nada", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: "admin-2", name: "Otro", role: "ADMIN" });
    const { status } = await erase("admin-2");
    expect(status).toBe(400);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/erase — el erasure completo", () => {
  it("anonimiza el User: nombre, email-tumba única, hash rotado, suspended, PII a null", async () => {
    const { status, json } = await erase(TARGET_ID);
    expect(status).toBe(200);
    expect(json.erased).toBe(true);

    const arg = db.fn("user.update").mock.calls[0][0];
    expect(arg.where).toEqual({ id: TARGET_ID });
    expect(arg.data.name).toBe("Usuario eliminado");
    expect(arg.data.email).toBe(`erased-${TARGET_ID}@otr.invalid`); // única → no rompe el unique(email)
    expect(arg.data.suspended).toBe(true);
    // Hash ROTADO a aleatorio: invalida todas las sesiones (passwordFingerprint) y nadie
    // puede volver a entrar. Es un hash scrypt real, nunca vacío ni predecible.
    expect(typeof arg.data.passwordHash).toBe("string");
    expect(arg.data.passwordHash.length).toBeGreaterThan(20);
    for (const k of ["headline", "bio", "location", "formats", "teachingStyle", "preferences", "avatarUrl", "notificationPrefs", "birthYear", "ageBand"]) {
      expect(arg.data[k]).toBeNull();
    }
    expect(arg.data.leaderboardOptIn).toBe(false);
  });

  it("purga telemetría/tokens/uploads y anonimiza snapshots + tutelas REVOKED", async () => {
    await erase(TARGET_ID);
    expect(db.fn("activityEvent.deleteMany")).toHaveBeenCalledWith({ where: { userId: TARGET_ID } });
    expect(db.fn("passwordReset.deleteMany")).toHaveBeenCalledWith({ where: { userId: TARGET_ID } });
    expect(db.fn("upload.deleteMany")).toHaveBeenCalledWith({ where: { userId: TARGET_ID } });
    expect(db.fn("submission.updateMany")).toHaveBeenCalledWith({ where: { userId: TARGET_ID }, data: { userName: "Usuario eliminado" } });
    expect(db.fn("quizAttempt.updateMany")).toHaveBeenCalledWith({ where: { userId: TARGET_ID }, data: { userName: "Usuario eliminado" } });
    expect(db.fn("guardianship.updateMany")).toHaveBeenCalledWith({
      where: { OR: [{ studentId: TARGET_ID }, { parentId: TARGET_ID }] },
      data: { status: "REVOKED" },
    });
  });

  it("borra los archivos físicos de los uploads (unlink por filename) y reporta el conteo", async () => {
    db.fn("upload.findMany").mockResolvedValue([{ filename: "abc.pdf" }, { filename: "def.mp3" }]);
    const { json } = await erase(TARGET_ID);
    expect(box.unlink).toHaveBeenCalledTimes(2);
    expect(String(box.unlink.mock.calls[0][0])).toContain("abc.pdf");
    expect(json.files).toBe(2);
    expect(json.filesDeleted).toBe(2);
  });

  it("un unlink fallido NO aborta el erasure (best-effort documentado)", async () => {
    db.fn("upload.findMany").mockResolvedValue([{ filename: "ya-no-existe.pdf" }]);
    box.unlink = vi.fn().mockRejectedValue(new Error("ENOENT"));
    const { status, json } = await erase(TARGET_ID);
    expect(status).toBe(200);
    expect(json.filesDeleted).toBe(0); // honesto: la fila se purgó, el archivo no estaba
  });

  it("deja el rastro de CUMPLIMIENTO en AuditLog (action user.erase) — sobrevive por diseño", async () => {
    await erase(TARGET_ID);
    const arg = db.fn("auditLog.create").mock.calls[0][0].data;
    expect(arg.action).toBe("user.erase");
    expect(arg.targetId).toBe(TARGET_ID);
    expect(arg.actorId).toBe(ADMIN.id);
  });
});

// --- [A4] Bloque de ADMISIÓN --------------------------------------------------------------
// Lo que la supresión prometía y no cumplía: el formulario de admisión guarda el TELÉFONO del
// alumno, su ESCUELA, su fecha de nacimiento completa y la CÉDULA/PASAPORTE del tutor.
describe("POST /api/admin/erase — Admission: no queda NI UN dato personal", () => {
  // Toda columna de Admission que contenga un dato personal. Si el modelo crece, este array
  // es el que hay que crecer: el test es la lista de lo que la ley obliga a borrar.
  const PII_ADMISION = [
    "birthDate", "phone", "school", "gradeLevel",
    "guardianName", "guardianDocument", "guardianRelation", "guardianPhone",
    "guardianEmail", "guardianSignature", "guardianSignedAt",
    "program", "priorExperience", "preferredDays",
    "dppVideoUrl",
  ];

  it("pone a null TODO el bloque personal (alumno + tutor + vídeo) en una sola pasada", async () => {
    const { status } = await erase(TARGET_ID);
    expect(status).toBe(200);
    const arg = db.fn("admission.updateMany").mock.calls[0][0];
    expect(arg.where).toEqual({ studentId: TARGET_ID });
    for (const k of PII_ADMISION) expect(arg.data[k]).toBeNull();
  });

  it("CONSERVA el progreso (los 4 timestamps y el status): registro académico, no dato personal", async () => {
    await erase(TARGET_ID);
    const data = db.fn("admission.updateMany").mock.calls[0][0].data;
    for (const k of ["status", "completedAt", "formCompletedAt", "callCompletedAt", "communityCompletedAt", "videoCompletedAt"]) {
      expect(data).not.toHaveProperty(k);
    }
  });

  it("va DENTRO de la transacción (o se anonimiza todo, o nada queda a medias)", async () => {
    await erase(TARGET_ID);
    // El harness resuelve $transaction([...]) con Promise.all: las promesas ya se invocaron
    // ANTES del unlink de disco. Basta comprobar que la llamada ocurrió junto a las demás.
    expect(db.fn("admission.updateMany")).toHaveBeenCalledOnce();
    expect(db.fn("admissionConsent.updateMany")).toHaveBeenCalledOnce();
  });
});

describe("POST /api/admin/erase — AdmissionConsent: el rastro sobrevive, la identidad no", () => {
  it("anonimiza al firmante (nombre → 'Usuario eliminado', acceptedByUserId → null)", async () => {
    await erase(TARGET_ID);
    expect(db.fn("admissionConsent.updateMany")).toHaveBeenCalledWith({
      where: { studentId: TARGET_ID },
      data: { acceptedByName: "Usuario eliminado", acceptedByUserId: null },
    });
  });

  it("NO borra la fila: kind/version/createdAt/text son la prueba de que hubo consentimiento", async () => {
    await erase(TARGET_ID);
    expect(db.fn("admissionConsent.deleteMany")).not.toHaveBeenCalled();
    const data = db.fn("admissionConsent.updateMany").mock.calls[0][0].data;
    for (const k of ["kind", "version", "text", "createdAt"]) expect(data).not.toHaveProperty(k);
  });
});

describe("POST /api/admin/erase — ConsultationBooking (llamada de descubrimiento)", () => {
  it("anonimiza las reservas del alumno por userId Y por su correo (reservó antes de tener cuenta)", async () => {
    await erase(TARGET_ID);
    expect(db.fn("consultationBooking.updateMany")).toHaveBeenCalledWith({
      where: { OR: [{ userId: TARGET_ID }, { email: TARGET_EMAIL }] },
      data: { name: "Usuario eliminado", email: `erased-${TARGET_ID}@otr.invalid`, phone: null, goal: null },
    });
  });

  it("conserva la fila (slot/estado): el hueco de la agenda es un registro, no un dato personal", async () => {
    await erase(TARGET_ID);
    expect(db.fn("consultationBooking.deleteMany")).not.toHaveBeenCalled();
    const data = db.fn("consultationBooking.updateMany").mock.calls[0][0].data;
    for (const k of ["slotAt", "status", "durationMin"]) expect(data).not.toHaveProperty(k);
  });
});

describe("POST /api/admin/erase — el ARCHIVO del vídeo DPP (material de un MENOR)", () => {
  it("borra el archivo del disco aunque su fila Upload ya no exista (huérfano)", async () => {
    db.fn("admission.findUnique").mockResolvedValue({ dppVideoUrl: "/uploads/dpp-menor.mp4" });
    db.fn("upload.findFirst").mockResolvedValue(null); // sin fila que lo respalde
    const { json } = await erase(TARGET_ID);
    expect(String(box.unlink.mock.calls[0][0])).toContain("dpp-menor.mp4");
    expect(json.files).toBe(1);
    expect(json.filesDeleted).toBe(1);
  });

  it("no lo cuenta dos veces si ya venía en los uploads del propio alumno", async () => {
    db.fn("upload.findMany").mockResolvedValue([{ filename: "dpp-menor.mp4" }]);
    db.fn("admission.findUnique").mockResolvedValue({ dppVideoUrl: "/uploads/dpp-menor.mp4" });
    const { json } = await erase(TARGET_ID);
    expect(box.unlink).toHaveBeenCalledTimes(1);
    expect(json.files).toBe(1);
  });

  it("NO borra el archivo si su fila Upload es de OTRO usuario (no es suyo)", async () => {
    db.fn("admission.findUnique").mockResolvedValue({ dppVideoUrl: "/uploads/de-otro.mp4" });
    db.fn("upload.findFirst").mockResolvedValue({ userId: "otro-alumno" });
    const { json } = await erase(TARGET_ID);
    expect(box.unlink).not.toHaveBeenCalled();
    expect(json.files).toBe(0);
  });

  it("una URL con traversal o externa NO llega al unlink (defensa en profundidad)", async () => {
    for (const url of ["/uploads/../../etc/passwd", "https://evil.example/x.mp4", "/uploads/sub/dir/x.mp4", "/uploads/"]) {
      db.reset();
      box.unlink = vi.fn().mockResolvedValue(undefined);
      db.fn("user.findUnique").mockResolvedValue({ id: TARGET_ID, name: "Ana Ruiz", role: "STUDENT", email: TARGET_EMAIL });
      db.fn("upload.findMany").mockResolvedValue([]);
      db.fn("admission.findUnique").mockResolvedValue({ dppVideoUrl: url });
      db.fn("upload.findFirst").mockResolvedValue(null);
      const { status, json } = await erase(TARGET_ID);
      expect(status).toBe(200);
      expect(box.unlink, `no debió tocar disco por: ${url}`).not.toHaveBeenCalled();
      expect(json.files).toBe(0);
    }
  });
});
