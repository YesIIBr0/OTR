// OTR · /api/admission — progreso de admisión (4 pasos) y paso 1 (formulario) [ADM].
//   GET  — progreso PROPIO del estudiante, o el de un alumno para el staff vía ?studentId=.
//          Staff = SOLO LECTURA, y en DOS capas [A4 · SEC]: (1) un coach solo entra al
//          expediente de un alumno CON EL QUE TIENE VÍNCULO (reserva con él o inscrito en su
//          curso — el criterio que ya usan /uploads y /api/debates); ADMIN entra a cualquiera.
//          (2) cada rol recibe SOLO lo que necesita: el coach, progreso y estado del
//          consentimiento; el admin, el expediente del alumno y quién firmó; el documento de
//          identidad y el contacto del TUTOR, solo su dueño. Ver `admissionPayloadFor`.
//   POST — guarda el formulario del paso 1 (solo el STUDENT dueño). Validado ENTERO en
//          servidor, registra la evidencia de consentimiento y enlaza con Guardianship.
//
// Quién NO entra: PARENT y cualquier otro rol. El portal de familia ya tiene su propia
// superficie (/api/parent-report); abrir la admisión —que trae cédula del tutor y firma—
// a un vínculo que puede estar PENDING sería regalar PII de un menor. Decisión registrada.
//
// Rate-limit por usuario, como las demás escrituras que genera el usuario (reports, reviews,
// listings). audit() NO aplica: ese rastro es "qué ADMIN tocó a quién" (ver lib/audit.ts) y
// aquí el alumno escribe sobre su propia ficha; la trazabilidad legal la da AdmissionConsent
// (evidencia inmutable) y el ledger universal ActivityEvent.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean } from "../../lib/api";
import { requireRole } from "../../lib/authz";
import { rateLimit } from "../../lib/rate-limit";
import { logActivitySafe } from "../../lib/activity";
import {
  CONSENT_KIND_DATA,
  CONSENT_KIND_GUARDIAN,
  CONSENT_TEXT_DATA,
  CONSENT_TEXT_GUARDIAN,
  CONSENT_VERSION,
  MINOR_AGE,
  admissionPayload,
  admissionPayloadFor,
  cleanAdmissionForm,
  initialsFor,
  type AdmissionRow,
  type AdmissionScope,
} from "./input";

/** Roles con lectura sobre la admisión de un alumno. Nunca escritura. */
const STAFF = ["TEACHER", "COACH", "ADMIN"] as const;

/** Admisión + su evidencia de consentimiento, recortada para quien pregunta (ver §minimización). */
async function loadAdmission(studentId: string, scope: AdmissionScope) {
  const admission = (await db.admission.findUnique({ where: { studentId } })) as AdmissionRow | null;
  const consents = admission
    ? await db.admissionConsent.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } })
    : [];
  return admissionPayloadFor(scope, admission, consents);
}

/**
 * [A4 · SEC] ¿Este coach tiene VÍNCULO REAL con este alumno? Es el mismo criterio que ya usa
 * el repo para dejar que un coach toque material o rating de un menor —reserva con él, o
 * inscripción en un curso que imparte— en app/uploads/[...path]/route.ts y en /api/debates.
 * Se reutiliza tal cual, incluido el corto-circuito: si hay reserva, no se consulta matrícula.
 */
async function coachTieneVinculo(coach: { id: string; email: string }, studentId: string): Promise<boolean> {
  const booked = await db.booking.count({ where: { coachId: coach.id, studentId } });
  if (booked > 0) return true;
  const enrolled = await db.enrollment.count({ where: { userId: studentId, course: { teacher: { email: coach.email } } } });
  return enrolled > 0;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const asked = clean(new URL(req.url).searchParams.get("studentId"), 64);

  if (user.role === "STUDENT") {
    // Un estudiante solo ve la SUYA. Pedir la de otro es 403, no un 404 silencioso: el
    // intento existe y el cliente tiene que enterarse de que no está autorizado.
    if (asked && asked !== user.id) return bad("Solo puedes ver tu propia admisión", 403);
    return ok({ admission: await loadAdmission(user.id, "owner"), student: { id: user.id, name: user.name } });
  }

  if (!requireRole(user, ...STAFF)) return bad("No autorizado", 403);
  if (!asked) return bad("Falta el estudiante", 400);

  const student = await db.user.findUnique({
    where: { id: asked },
    select: { id: true, name: true, email: true, role: true, ageBand: true },
  });
  if (!student || student.role !== "STUDENT") return bad("Estudiante no encontrado", 404);

  // [A4 · SEC] Authz de RELACIÓN, no solo de rol. El gate anterior daba por bueno el ROL:
  // cualquier cuenta TEACHER/COACH —incluida una que no imparte nada— podía pedir el
  // expediente de CUALQUIER menor y recibir la cédula de su tutor. El rol dice qué clase de
  // cuenta eres; no dice de quién eres coach.
  if (user.role !== "ADMIN") {
    if (!(await coachTieneVinculo(user, student.id))) {
      return bad("Solo puedes ver la admisión de tus alumnos (con reserva contigo o inscritos en tu curso)", 403);
    }
    // Con vínculo, pero SOLO progreso y estado de consentimiento (ver admissionPayloadFor):
    // ni el correo del alumno hace falta para dar clase — la mensajería vive en la plataforma.
    return ok({
      admission: await loadAdmission(student.id, "coach"),
      student: { id: student.id, name: student.name, ageBand: student.ageBand },
    });
  }

  return ok({ admission: await loadAdmission(student.id, "admin"), student });
}

/**
 * Enlaza con el Guardianship que YA existe en la plataforma en vez de abrir un sistema
 * paralelo. Reglas respetadas al pie de la letra:
 *  · Solo para MENORES (<18). Un alumno de 19-20 aporta datos de tutor porque la academia
 *    los pide, pero NO se le cuelga un vínculo de tutela que daría a un tercero acceso a los
 *    datos de un adulto sin su consentimiento aparte.
 *  · El vínculo nace PENDING con initiatedBy="student" — exactamente igual que cuando el
 *    menor declara a su tutor al registrarse: el ALUMNO declara, el PADRE confirma
 *    (POST /api/guardianship). Nada aquí activa una tutela.
 * Devuelve el id del vínculo o null (sin cuenta de tutor que enlazar todavía).
 */
async function linkGuardianship(p: {
  studentId: string;
  studentName: string;
  isMinor: boolean;
  guardianEmail: string | null;
}): Promise<string | null> {
  if (!p.isMinor) return null;

  const existing = await db.guardianship.findFirst({
    where: { studentId: p.studentId, status: { in: ["PENDING", "ACTIVE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.id;

  if (!p.guardianEmail) return null;
  const parent = await db.user.findUnique({ where: { email: p.guardianEmail } });
  if (!parent || parent.role !== "PARENT") return null;

  const already = await db.guardianship.findUnique({
    where: { parentId_studentId: { parentId: parent.id, studentId: p.studentId } },
  });
  if (already) return already.id;

  const created = await db.guardianship.create({
    data: { parentId: parent.id, studentId: p.studentId, status: "PENDING", consentLevel: "standard", initiatedBy: "student" },
  });
  // Ledger universal (cara del parent) — mismo evento que emite el registro.
  await db.activityEvent.create({
    data: {
      userId: parent.id,
      type: "guardianship_linked",
      source: "guardianship",
      refId: created.id,
      title: `${p.studentName} te designó como tutor`,
      detail: "Pendiente de tu confirmación (vincular para activar)",
    },
  });
  return created.id;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  // Solo el alumno llena su formulario. Ni el coach ni el admin escriben aquí: la firma del
  // tutor y el consentimiento solo valen si los envía quien los dio.
  if (!requireRole(user, "STUDENT")) return bad("Solo el estudiante puede llenar su admisión", 403);

  const rl = rateLimit(`admission-form:${user.id}`, 20, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const body = await readJson<Record<string, unknown>>(req);
  const now = new Date();
  const form = cleanAdmissionForm(body, now);
  if (!form.data) return bad(form.error || "Formulario inválido", 400);
  const data = form.data;

  const existing = (await db.admission.findUnique({ where: { studentId: user.id } })) as AdmissionRow | null;
  const guardianshipId = await linkGuardianship({
    studentId: user.id,
    studentName: user.name,
    isMinor: form.isMinor,
    guardianEmail: data.guardianEmail,
  });

  // El paso 1 se completa al guardar un formulario VÁLIDO — el formulario ES el paso. La
  // marca se pone UNA vez: re-guardar corrige datos, no reescribe cuándo se completó (eso
  // falsificaría el rastro).
  const formCompletedAt = existing?.formCompletedAt ?? now;
  const fullName = `${form.firstName} ${form.lastName}`.trim();

  const consentBase = { studentId: user.id, acceptedByUserId: user.id, version: CONSENT_VERSION };

  const admission = await db.$transaction(async (tx) => {
    const row = await tx.admission.upsert({
      where: { studentId: user.id },
      create: { studentId: user.id, ...data, guardianshipId, formCompletedAt },
      update: { ...data, guardianshipId, formCompletedAt },
    });

    // El formulario es el dueño de estos datos del User y los actualiza EXPLÍCITAMENTE (no
    // se guarda una segunda copia en Admission). La fecha completa es más precisa que el año
    // declarado en el registro, así que ageBand puede corregirse — incluso de adult a minor,
    // que es la dirección protectora.
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: fullName,
        initials: initialsFor(fullName),
        birthYear: data.birthDate.getUTCFullYear(),
        ageBand: form.age < MINOR_AGE ? "minor" : "adult",
      },
    });

    // [EVIDENCIA] Insert-only e idempotente por el @@unique(admissionId, kind, version): el
    // update vacío NUNCA toca una prueba ya escrita, y re-guardar el formulario no duplica
    // filas. Si el texto cambia, cambia la versión → fila NUEVA, y ambas quedan.
    await tx.admissionConsent.upsert({
      where: { admissionId_kind_version: { admissionId: row.id, kind: CONSENT_KIND_DATA, version: CONSENT_VERSION } },
      update: {},
      create: {
        ...consentBase,
        admissionId: row.id,
        kind: CONSENT_KIND_DATA,
        text: CONSENT_TEXT_DATA,
        acceptedByName: fullName,
        acceptedByRole: "student",
      },
    });

    if (data.guardianSignature) {
      await tx.admissionConsent.upsert({
        where: { admissionId_kind_version: { admissionId: row.id, kind: CONSENT_KIND_GUARDIAN, version: CONSENT_VERSION } },
        update: {},
        create: {
          ...consentBase,
          admissionId: row.id,
          kind: CONSENT_KIND_GUARDIAN,
          text: CONSENT_TEXT_GUARDIAN,
          // Quien firma es el TUTOR: el snapshot guarda SU nombre (el escrito como firma),
          // aunque la sesión que envió el formulario sea la del alumno (acceptedByUserId).
          acceptedByName: data.guardianSignature,
          acceptedByRole: "guardian",
        },
      });
    }

    return row as AdmissionRow;
  });

  if (!existing?.formCompletedAt) {
    await logActivitySafe({
      userId: user.id,
      type: "admission_step",
      source: "admission",
      refId: admission.id,
      title: "Completó el formulario de admisión",
      detail: "Paso 1 de 4",
    });
  }

  const consents = await db.admissionConsent.findMany({ where: { admissionId: admission.id }, orderBy: { createdAt: "asc" } });
  return ok({ admission: admissionPayload(admission, consents) });
}
