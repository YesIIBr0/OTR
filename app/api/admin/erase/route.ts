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
//
// QUÉ conserva (por diseño legal, documentado):
//   · Enrollment / Booking / EscrowTxn: registro académico-financiero — queda apuntando a
//     un usuario ya anónimo. · AuditLog: el rastro de QUIÉN pidió/ejecutó el erasure DEBE
//     sobrevivir (es la evidencia de cumplimiento). · ChatMessage: pseudonimizado (el nombre
//     visible sale del User ya anonimizado); el body no se toca en v1 — decisión registrada.
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

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

  const body = await readJson<{ userId?: string }>(req);
  const userId = clean(body.userId, 64);
  if (!userId) return bad("Falta el usuario", 400);
  if (userId === user.id) return bad("No puedes borrar tu propia cuenta desde aquí", 400);

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
  if (!target) return bad("Usuario no encontrado", 404);
  if (target.role === "ADMIN") return bad("No puedes borrar a otro administrador", 400);

  // Archivos físicos: se listan ANTES de la transacción (después las filas ya no existen).
  const uploads = await db.upload.findMany({ where: { userId }, select: { filename: true } });

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
  ]);

  // Archivos en disco: best-effort DESPUÉS de la transacción (un unlink fallido no debe
  // revertir el erasure de datos; el archivo huérfano ya no tiene fila que lo sirva).
  let filesDeleted = 0;
  for (const u of uploads) {
    try {
      await unlink(path.join(UPLOAD_DIR, u.filename));
      filesDeleted++;
    } catch {
      /* ya no existe o disco de solo lectura — la fila ya se borró, el archivo queda inservible */
    }
  }

  // El rastro del CUMPLIMIENTO sobrevive por diseño (targetId = id, sin el nombre real
  // más allá del snapshot mínimo necesario para la evidencia).
  await audit({
    actorId: user.id, actorName: user.name, action: "user.erase", targetType: "user", targetId: userId,
    detail: `Datos personales suprimidos (era "${target.name}"); ${uploads.length} archivo(s), ${filesDeleted} borrados de disco`,
  });

  return ok({ erased: true, files: uploads.length, filesDeleted });
}
