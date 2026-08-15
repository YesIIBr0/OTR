// OTR Hub · Admin — derecho de supresión / erasure end-to-end [R4 — Tribunal 2.3].
// POST { userId } — SOLO ADMIN. Anonimiza al usuario y purga sus datos personales de
// forma DEMOSTRABLE (Ley 172-13 RD / COPPA): la primera solicitud real de un padre no
// se puede improvisar.
//
// QUÉ borra/anonimiza:
//   · User: nombre → "Usuario eliminado", email → tumba única (erased-<id>@otr.invalid,
//     conserva el unique), passwordHash rotado a aleatorio (invalida TODAS las sesiones vía
//     passwordFingerprint), suspended=true (no puede volver a entrar), y a null/limpio:
//     bio, headline, location, formats, teachingStyle, preferences, avatarUrl,
//     notificationPrefs, birthYear, ageBand; leaderboardOptIn=false.
//   · ActivityEvent (telemetría), PasswordReset (tokens) → deleteMany.
//   · Upload: filas + ARCHIVOS físicos en disco (unlink best-effort — un archivo ya
//     ausente no aborta el erasure).
//   · Snapshots de nombre: Submission.userName y QuizAttempt.userName → "Usuario eliminado"
//     (el nombre real no debe sobrevivir en copias desnormalizadas).
//   · Guardianship (como padre o como hijo) → REVOKED.
//   · [A4] Admission: TODO el bloque personal a null — del alumno (birthDate completa, phone,
//     school, gradeLevel), del TUTOR (guardianName, guardianDocument = cédula/pasaporte,
//     guardianRelation, guardianPhone, guardianEmail, guardianSignature, guardianSignedAt),
//     de programa (program, priorExperience, preferredDays) y la URL del vídeo DPP. Mismo
//     criterio que Enrollment/Booking: la fila-registro se conserva (los 4 timestamps de
//     progreso y el status NO son datos personales), las columnas de PII se vacían — igual
//     que se hace con Submission.userName.
//   · [A4] ConsultationBooking (llamada de descubrimiento, paso 2 de la admisión): trae su
//     PROPIA copia de name/email/phone/goal (no se deriva del User) → se anonimiza igual que
//     el User, por userId Y por correo (la reserva puede ser anterior a la cuenta). La fila
//     se conserva: el hueco de la agenda es un registro, no un dato personal.
//   · [A4] El ARCHIVO del vídeo DPP (30 s de un MENOR) se desenlaza del disco. En el camino
//     normal ya cae con los Upload del alumno; el unlink extra cubre la fila huérfana.
//
// QUÉ conserva (por diseño legal, documentado):
//   · Enrollment / Booking / EscrowTxn: registro académico-financiero — queda apuntando a
//     un usuario ya anónimo. · AuditLog: el rastro de QUIÉN pidió/ejecutó el erasure DEBE
//     sobrevivir (es la evidencia de cumplimiento). · ChatMessage: pseudonimizado (el nombre
//     visible sale del User ya anonimizado); el body no se toca en v1 — decisión registrada.
//   · [A4] AdmissionConsent: la fila NO se borra — es la prueba de que hubo consentimiento.
//     Se le quita la IDENTIDAD (acceptedByName → "Usuario eliminado", acceptedByUserId →
//     null) y queda exactamente la forma que este esquema ya usa como prueba de
//     consentimiento en ConsentRecord: ids + kind + version + texto (una plantilla, idéntica
//     para todos) + createdAt. La tensión "bórralo todo" vs "conserva la prueba" se resuelve
//     a favor de las DOS: no sobrevive ningún dato personal, pero sí "hubo consentimiento de
//     este tipo, de esta versión, este día".
//
// Guardas anti-abuso: no puedes borrarte a ti mismo ni borrar a otro ADMIN (misma doctrina
// anti-lockout de admin/users). Idempotente: repetir sobre un usuario ya anonimizado re-anonimiza
// sin efectos nuevos visibles.
import { randomBytes } from "crypto";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";
import { hashPassword } from "../../../lib/auth-crypto";
import { UPLOAD_DIR } from "../../../lib/uploads";
import { audit } from "../../../lib/audit";

const ANON_NAME = "Usuario eliminado";

/**
 * [A4] Nombre de archivo PLANO y seguro a partir de una URL "/uploads/<archivo>".
 * `dppVideoUrl` se valida al escribirse, pero aquí se va a llamar a unlink(): la misma guarda
 * que usa app/uploads/[...path]/route.ts (sin subrutas, sin traversal, sin ocultos) se repite
 * en el sitio donde el fallo sería destructivo. Cualquier otra cosa → null (no se toca disco).
 */
function uploadFilename(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string" || !url.startsWith("/uploads/")) return null;
  const rest = url.slice("/uploads/".length).split(/[?#]/)[0];
  const base = path.basename(rest);
  if (!base || base !== rest || base.includes("..") || base.startsWith(".")) return null;
  return base;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

  const body = await readJson<{ userId?: string }>(req);
  const userId = clean(body.userId, 64);
  if (!userId) return bad("Falta el usuario", 400);
  if (userId === user.id) return bad("No puedes borrar tu propia cuenta desde aquí", 400);

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, email: true } });
  if (!target) return bad("Usuario no encontrado", 404);
  if (target.role === "ADMIN") return bad("No puedes borrar a otro administrador", 400);

  // Archivos físicos: se listan ANTES de la transacción (después las filas ya no existen).
  const uploads = await db.upload.findMany({ where: { userId }, select: { filename: true } });

  // [A4] Igual que los uploads: la URL del vídeo DPP hay que leerla ANTES de vaciarla.
  const admission = await db.admission.findUnique({ where: { studentId: userId }, select: { dppVideoUrl: true } });

  // [A4] El vídeo DPP es material de un MENOR: el archivo debe salir del disco, no solo la
  // fila. Normalmente ya está en `uploads` (se subió por /api/uploads con su userId) y no hay
  // nada extra que hacer. Este bloque cubre el caso en que la fila Upload NO exista (subida
  // antigua, purga previa). Guarda: si la fila existe y es de OTRO usuario, no se toca — el
  // dppVideoUrl es una cadena libre y borrar el archivo de un tercero sería destruir su dato.
  const dppFile = uploadFilename(admission?.dppVideoUrl);
  const filenames = uploads.map((u) => u.filename);
  if (dppFile && !filenames.includes(dppFile)) {
    const owner = await db.upload.findFirst({ where: { filename: dppFile }, select: { userId: true } });
    if (!owner || owner.userId === userId) filenames.push(dppFile);
  }

  // Núcleo del erasure en UNA transacción: o se anonimiza TODO, o nada queda a medias.
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        name: ANON_NAME,
        email: `erased-${userId}@otr.invalid`, // tumba única — conserva el unique(email)
        passwordHash: hashPassword(randomBytes(24).toString("hex")), // invalida todas las sesiones
        suspended: true,
        initials: "–",
        headline: null, bio: null, location: null, formats: null, teachingStyle: null,
        preferences: null, avatarUrl: null, notificationPrefs: null,
        birthYear: null, ageBand: null,
        leaderboardOptIn: false,
      },
    }),
    db.activityEvent.deleteMany({ where: { userId } }),
    db.passwordReset.deleteMany({ where: { userId } }),
    db.upload.deleteMany({ where: { userId } }),
    db.submission.updateMany({ where: { userId }, data: { userName: ANON_NAME } }),
    db.quizAttempt.updateMany({ where: { userId }, data: { userName: ANON_NAME } }),
    db.guardianship.updateMany({ where: { OR: [{ studentId: userId }, { parentId: userId }] }, data: { status: "REVOKED" } }),
    // [A4] Admisión: se vacía COLUMNA POR COLUMNA (no un delete) para conservar el registro
    // de progreso. La lista es exhaustiva a propósito: si el modelo gana una columna personal,
    // hay que añadirla aquí y en tests/api-admin-erase.test.ts (PII_ADMISION).
    db.admission.updateMany({
      where: { studentId: userId },
      data: {
        // Alumno
        birthDate: null, phone: null, school: null, gradeLevel: null,
        // Tutor (incluye la cédula/pasaporte y la firma)
        guardianName: null, guardianDocument: null, guardianRelation: null, guardianPhone: null,
        guardianEmail: null, guardianSignature: null, guardianSignedAt: null,
        // Programa y preferencias declaradas
        program: null, priorExperience: null, preferredDays: null,
        // Paso 4: la ruta del vídeo (el archivo se desenlaza abajo)
        dppVideoUrl: null,
      },
    }),
    // [A4] Consentimiento: se conserva la PRUEBA, se le quita la IDENTIDAD.
    db.admissionConsent.updateMany({
      where: { studentId: userId },
      data: { acceptedByName: ANON_NAME, acceptedByUserId: null },
    }),
    // [A4] Llamada de descubrimiento: copia propia de PII (no derivada del User). Por correo
    // además de por userId, porque la reserva pudo hacerse antes de existir la cuenta — es la
    // misma regla de propiedad que usa el paso 2 de la admisión (userId o email).
    db.consultationBooking.updateMany({
      where: { OR: [{ userId }, { email: target.email }] },
      data: { name: ANON_NAME, email: `erased-${userId}@otr.invalid`, phone: null, goal: null },
    }),
  ]);

  // Archivos en disco: best-effort DESPUÉS de la transacción (un unlink fallido no debe
  // revertir el erasure de datos; el archivo huérfano ya no tiene fila que lo sirva).
  let filesDeleted = 0;
  for (const filename of filenames) {
    try {
      await unlink(path.join(UPLOAD_DIR, filename));
      filesDeleted++;
    } catch {
      /* ya no existe o disco de solo lectura — la fila ya se borró, el archivo queda inservible */
    }
  }

  // El rastro del CUMPLIMIENTO sobrevive por diseño (targetId = id, sin el nombre real
  // más allá del snapshot mínimo necesario para la evidencia).
  await audit({
    actorId: user.id, actorName: user.name, action: "user.erase", targetType: "user", targetId: userId,
    detail: `Datos personales suprimidos (era "${target.name}"); ${filenames.length} archivo(s), ${filesDeleted} borrados de disco${admission ? "; admisión purgada" : ""}`,
  });

  return ok({ erased: true, files: filenames.length, filesDeleted });
}
