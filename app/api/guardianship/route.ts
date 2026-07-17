// Guardianship (PRD §3.3, §11.3): vínculo de datos parent ↔ student.
// POST  — un PARENT vincula a un estudiante por email (crea/reactiva el vínculo).
// GET   — lista los vínculos: estudiantes de un PARENT, o los parents de un STUDENT.
// Esto es SOLO el vínculo de datos; el Parent Portal completo llega después.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { sendMail, emailShell } from "../../lib/mail";
import { esc } from "../../lib/esc";

// [COPPA] Versión de la política de privacidad vigente que ampara el consentimiento.
const POLICY_VERSION = "2026-07";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "PARENT") return bad("Solo una cuenta de padre/madre puede vincular estudiantes", 403);

  const data = await readJson<{ email?: string; consentLevel?: string }>(req);
  const studentEmail = clean(data.email, 160).toLowerCase();
  if (!EMAIL_RE.test(studentEmail)) return bad("Correo del estudiante inválido", 400);

  const student = await db.user.findUnique({ where: { email: studentEmail } });
  if (!student) return bad("No encontramos un estudiante con ese correo", 404);
  if (student.role !== "STUDENT") return bad("Ese correo no pertenece a una cuenta de estudiante", 400);
  if (student.id === user.id) return bad("No puedes vincularte contigo mismo", 400);

  // consentLevel permitido: full | standard | progress_only (allowlist).
  // PRD §11.3: el default seguro es "standard" (aprobar cada reserva del menor);
  // "full" (confianza total) es opt-in explícito del padre, no por defecto.
  const consentLevel =
    data.consentLevel === "full" ? "full" :
    data.consentLevel === "progress_only" ? "progress_only" :
    "standard";

  const isMinor = student.ageBand !== "adult";

  const existing = await db.guardianship.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
  });
  if (existing) {
    // [SEGURIDAD §11.3] El PARENT confirma el vínculo → ACTIVE SOLO si lo DECLARÓ el alumno
    // (initiatedBy="student", creado en su registro con guardianEmail) y es un menor. Un
    // vínculo que el propio padre reclamó (initiatedBy="parent") NO se auto-activa con un
    // segundo POST: requiere el consentimiento del lado del menor. Un alumno ADULTO consiente
    // por su cuenta (el vínculo queda PENDING hasta que él lo apruebe).
    if (existing.status !== "ACTIVE" && existing.initiatedBy === "student" && isMinor) {
      // [COPPA §11] Activación + evidencia auditable en UNA transacción: si el create del
      // ConsentRecord falla, el vínculo NO queda ACTIVE (el reintento vuelve a activar).
      // Sin la tx, un fallo tras el update dejaba ACTIVE sin evidencia para siempre
      // (el retry caía en already:true y nunca reescribía la fila).
      const [updated] = await db.$transaction([
        db.guardianship.update({ where: { id: existing.id }, data: { status: "ACTIVE", consentLevel } }),
        db.consentRecord.create({ data: { studentId: existing.studentId, grantedById: user.id, kind: "guardianship", policyVersion: POLICY_VERSION } }),
      ]);

      // [TAREA-D] Email al alumno, fuera de la tx, best-effort (sendMail nunca lanza).
      if (student.email) {
        const emailBody = `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44443D;"><strong>${esc(user.name)}</strong> confirmó el vínculo de tutor/a con tu cuenta de OTR Academy.</p>`;
        await sendMail({
          to: student.email,
          subject: "Tu tutor confirmó el vínculo · OTR Academy",
          html: emailShell("Tu tutor confirmó el vínculo", emailBody),
        });
      }

      return ok({ guardianship: updated, already: false });
    }
    return ok({ guardianship: existing, already: true });
  }

  // [SEGURIDAD §11.3] Vínculo NUEVO reclamado por el PADRE → SIEMPRE PENDING (incluido un
  // menor). Antes un menor quedaba ACTIVE por la sola palabra del padre, lo que permitía a
  // cualquier cuenta "padre" reclamar a cualquier menor por email y leer su PII/grabaciones.
  // Para llegar a ACTIVE, el menor debe haber declarado a este padre en su registro (eso crea
  // el vínculo PENDING student-initiated que el padre confirma en la rama de arriba).
  const status = "PENDING";
  const guardianship = await db.guardianship.create({
    data: { parentId: user.id, studentId: student.id, status, consentLevel, initiatedBy: "parent" },
  });

  // Ledger universal: toda acción escribe en ActivityEvent (cara del parent).
  await db.activityEvent.create({
    data: {
      userId: user.id,
      type: "guardianship_linked",
      source: "guardianship",
      refId: guardianship.id,
      title: `Vinculó a ${student.name}`,
      detail: status === "PENDING" ? "Esperando consentimiento del estudiante" : null,
    },
  });

  return ok({ guardianship, already: false });
}

// PATCH — dos usos por rol (gate primero, luego se despacha):
//  · PARENT ajusta los controles de consentimiento de un hijo ya vinculado.
//  · STUDENT confirma o rechaza una solicitud de tutela que un PARENT reclamó sobre
//    su cuenta (ver patchStudentConfirm — el lado que faltaba del bug de vínculo).
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role === "STUDENT") return patchStudentConfirm(req, user);
  if (user.role !== "PARENT") return bad("Solo una cuenta de padre/madre puede ajustar el consentimiento", 403);
  return patchParentConsent(req, user);
}

// PRD §11.3 (umbral configurable de auto-aprobación): body { studentId,
// approveUnderCents?: number|null, consentLevel? }.
//  - approveUnderCents: null = aprobar CADA reserva manualmente; N (entero >=0) =
//    auto-aprueba reservas hasta N centavos. Omitido = no se toca.
//  - consentLevel: full | standard | progress_only (allowlist). Omitido = no se toca.
// Requiere un Guardianship ACTIVE con parentId = yo y el studentId dado.
async function patchParentConsent(req: Request, user: { id: string }) {
  const data = await readJson<{ studentId?: string; approveUnderCents?: number | null; consentLevel?: string }>(req);
  const studentId = clean(data.studentId, 60);
  if (!studentId) return bad("Falta el estudiante", 400);

  const guardianship = await db.guardianship.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId } },
  });
  if (!guardianship || guardianship.status !== "ACTIVE") {
    return bad("No existe un vínculo activo con ese estudiante", 404);
  }

  // Construye el patch solo con los campos presentes (no pisa lo que no llega).
  const patch: { approveUnderCents?: number | null; consentLevel?: string } = {};

  if ("approveUnderCents" in data) {
    const v = data.approveUnderCents;
    if (v === null) {
      patch.approveUnderCents = null; // aprobar cada reserva
    } else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) return bad("Umbral de aprobación inválido", 400);
      patch.approveUnderCents = n;
    }
  }

  if (data.consentLevel !== undefined) {
    // [MINORS-CONSENT-02 §11.3] allowlist completa: full (confianza total) |
    // standard (aprobar cada reserva, default seguro) | progress_only (solo ve progreso).
    if (!["full", "standard", "progress_only"].includes(data.consentLevel)) {
      return bad("Nivel de consentimiento inválido", 400);
    }
    patch.consentLevel = data.consentLevel;
  }

  if (Object.keys(patch).length === 0) return bad("Nada que actualizar", 400);

  const updated = await db.guardianship.update({
    where: { id: guardianship.id },
    data: patch,
  });
  return ok({ guardianship: updated });
}

// [BUG vínculo-padre §11.3] El lado del ALUMNO que faltaba: un padre que reclama un vínculo
// (initiatedBy="parent") lo deja PENDING para siempre por diseño — un padre NO puede activar
// un vínculo sobre un menor por su sola palabra (COPPA). Hasta ahora nada del lado del menor
// permitía cerrar ese círculo: el alumno no tenía forma de VER ni CONFIRMAR la solicitud.
// body { guardianshipId, action?: "confirm"|"reject" } (default "confirm").
async function patchStudentConfirm(req: Request, user: { id: string; name: string }) {
  const data = await readJson<{ guardianshipId?: string; action?: string }>(req);
  const guardianshipId = clean(data.guardianshipId, 60);
  if (!guardianshipId) return bad("Falta la solicitud", 400);
  const action = data.action === "reject" ? "reject" : "confirm";

  const guardianship = await db.guardianship.findUnique({ where: { id: guardianshipId } });
  // Ownership estricto: solo el ALUMNO dueño de esta fila puede resolverla (nunca por id ajeno).
  if (!guardianship || guardianship.studentId !== user.id) {
    return bad("Solicitud no encontrada", 404);
  }
  // Solo aplica a solicitudes PENDIENTES que el PADRE reclamó — un vínculo que el propio
  // alumno declaró (initiatedBy="student") lo confirma el PADRE (POST), no esta ruta; y un
  // vínculo ya ACTIVE/REVOKED no tiene nada que confirmar/rechazar aquí.
  if (guardianship.status !== "PENDING" || guardianship.initiatedBy !== "parent") {
    return bad("Esta solicitud ya fue resuelta", 400);
  }

  const parent = await db.user.findUnique({ where: { id: guardianship.parentId } });

  if (action === "reject") {
    const updated = await db.guardianship.update({ where: { id: guardianship.id }, data: { status: "REVOKED" } });
    return ok({ guardianship: updated });
  }

  // [COPPA §11] Activación + evidencia auditable en UNA transacción (mismo patrón que la
  // confirmación del lado del padre en POST): si el ConsentRecord falla, el vínculo NO
  // queda ACTIVE — el reintento vuelve a activar en vez de dejar un ACTIVE sin evidencia.
  const [updated] = await db.$transaction([
    db.guardianship.update({ where: { id: guardianship.id }, data: { status: "ACTIVE" } }),
    db.consentRecord.create({ data: { studentId: guardianship.studentId, grantedById: user.id, kind: "guardianship", policyVersion: POLICY_VERSION } }),
  ]);

  // Email al padre, fuera de la tx, best-effort (sendMail nunca lanza).
  if (parent?.email) {
    const emailBody = `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44443D;"><strong>${esc(user.name)}</strong> confirmó tu solicitud de vínculo de tutor/a en OTR Academy. Ya puedes ver su progreso desde el Portal de familia.</p>`;
    await sendMail({
      to: parent.email,
      subject: "Tu hijo/a confirmó el vínculo · OTR Academy",
      html: emailShell("Vínculo confirmado", emailBody),
    });
  }

  return ok({ guardianship: updated, already: false });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  if (user.role === "PARENT") {
    const links = await db.guardianship.findMany({
      where: { parentId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const studentIds = links.map((l) => l.studentId);
    const students = studentIds.length
      ? await db.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true, email: true, initials: true, ageBand: true, level: true, xp: true },
        })
      : [];
    const byId = new Map(students.map((s) => [s.id, s]));
    const children = links.map((l) => ({
      id: l.id,
      status: l.status,
      consentLevel: l.consentLevel,
      createdAt: l.createdAt,
      student: byId.get(l.studentId) ?? null,
    }));
    return ok({ role: "PARENT", children });
  }

  if (user.role === "STUDENT") {
    const links = await db.guardianship.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
    });
    const parentIds = links.map((l) => l.parentId);
    const parents = parentIds.length
      ? await db.user.findMany({
          where: { id: { in: parentIds } },
          select: { id: true, name: true, email: true, initials: true },
        })
      : [];
    const byId = new Map(parents.map((p) => [p.id, p]));
    const guardians = links.map((l) => ({
      id: l.id,
      status: l.status,
      consentLevel: l.consentLevel,
      createdAt: l.createdAt,
      parent: byId.get(l.parentId) ?? null,
    }));
    return ok({ role: "STUDENT", guardians });
  }

  return ok({ role: user.role, children: [], guardians: [] });
}
