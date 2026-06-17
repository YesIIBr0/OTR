// Guardianship (PRD §3.3, §11.3): vínculo de datos parent ↔ student.
// POST  — un PARENT vincula a un estudiante por email (crea/reactiva el vínculo).
// GET   — lista los vínculos: estudiantes de un PARENT, o los parents de un STUDENT.
// Esto es SOLO el vínculo de datos; el Parent Portal completo llega después.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";

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

  // Un menor queda ACTIVE de inmediato (el tutor tiene custodia); un adulto requiere
  // su consentimiento → PENDING hasta que lo apruebe.
  const status = student.ageBand === "adult" ? "PENDING" : "ACTIVE";

  const existing = await db.guardianship.findUnique({
    where: { parentId_studentId: { parentId: user.id, studentId: student.id } },
  });
  if (existing) {
    // [MINORS-CONSENT-01 §11.3] El PARENT confirma el vínculo: si no estaba activo
    // (REVOKED, o PENDING que el menor creó al registrarse) y ahora corresponde
    // ACTIVE (menor con su tutor presente), actívalo. Para un estudiante ADULTO el
    // status calculado es PENDING → el vínculo permanece idempotente (espera al alumno).
    if (existing.status !== "ACTIVE" && status === "ACTIVE") {
      const updated = await db.guardianship.update({
        where: { id: existing.id },
        data: { status, consentLevel },
      });
      return ok({ guardianship: updated, already: false });
    }
    return ok({ guardianship: existing, already: true });
  }

  const guardianship = await db.guardianship.create({
    data: { parentId: user.id, studentId: student.id, status, consentLevel },
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

// PATCH — un PARENT ajusta los controles de consentimiento de un hijo ya vinculado.
// PRD §11.3 (umbral configurable de auto-aprobación): body { studentId,
// approveUnderCents?: number|null, consentLevel? }.
//  - approveUnderCents: null = aprobar CADA reserva manualmente; N (entero >=0) =
//    auto-aprueba reservas hasta N centavos. Omitido = no se toca.
//  - consentLevel: full | standard | progress_only (allowlist). Omitido = no se toca.
// Requiere un Guardianship ACTIVE con parentId = yo y el studentId dado.
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (user.role !== "PARENT") return bad("Solo una cuenta de padre/madre puede ajustar el consentimiento", 403);

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
