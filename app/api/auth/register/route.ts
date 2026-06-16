import { db } from "../../../lib/db";
import { setSession } from "../../../lib/auth";
import { hashPassword } from "../../../lib/auth-crypto";
import { ok, bad, readJson, clean, clientIp } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const data = await readJson<{
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    headline?: string;
    formats?: string;
    birthYear?: number | string;
    guardianEmail?: string;
  }>(req);
  const name = clean(data.name, 80);
  const email = clean(data.email, 160).toLowerCase(); // consistencia con login/forgot (l13)
  const password = String(data.password ?? "");

  // Rol (PRD §2): el formulario manda 'student' | 'parent'.
  // AUTO-REGISTRO DE COACHES APAGADO (PRD §7.4/§7.6): Fase 1 = solo coaches de OTR,
  // verificados ANTES de salir al marketplace. Los crea el admin/equipo, no el público.
  const roleRaw = clean(data.role, 20).toLowerCase();
  if (roleRaw === "teacher" || roleRaw === "coach") {
    return bad("El registro de coaches es por invitación del equipo OTR", 403);
  }
  const role = roleRaw === "parent" ? "PARENT" : "STUDENT";
  const isTeacher = false;
  const isStudent = role === "STUDENT";

  if (name.length < 2) return bad("Nombre inválido", 400);
  if (!EMAIL_RE.test(email)) return bad("Correo inválido", 400);
  if (password.length < 6) return bad("La contraseña debe tener al menos 6 caracteres", 400);

  // Age-gate (PRD §11.3): solo estudiantes declaran año de nacimiento.
  // ageBand = minor (<18) | adult (>=18). Validamos un rango razonable.
  let birthYear: number | null = null;
  let ageBand: string | null = null;
  if (isStudent) {
    const yr = Number.parseInt(String(data.birthYear ?? ""), 10);
    const currentYear = new Date().getFullYear();
    if (!Number.isFinite(yr) || yr < currentYear - 100 || yr > currentYear - 5) {
      return bad("Año de nacimiento inválido", 400);
    }
    birthYear = yr;
    ageBand = currentYear - yr < 18 ? "minor" : "adult";
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return bad("Ese correo ya está registrado", 409);

  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const user = await db.user.create({
    data: {
      name, email, role,
      passwordHash: hashPassword(password),
      initials, level: "Novato", xp: 0, streak: 0,
      // Age-gate: solo estudiantes guardan birthYear/ageBand
      ...(isStudent ? { birthYear, ageBand } : {}),
      // Si es profesor/coach, guarda lo que enseña (allowlist + saneo de longitud)
      ...(isTeacher
        ? {
            headline: clean(data.headline, 80) || null,
            formats: clean(data.formats, 160) || null,
          }
        : {}),
    },
  });
  // PRD §11.3 'parental sign-off on account creation': si un STUDENT MENOR llega
  // con guardianEmail (correo del padre/madre), intentamos vincularlo de una vez.
  // Comportamiento:
  //  - Si existe un User PARENT con ese correo → se crea Guardianship ACTIVE
  //    (el tutor de un menor tiene custodia; no requiere su consentimiento).
  //  - Si NO existe (o no es PARENT) → el menor se crea igual SIN guardián. El
  //    Safety Gate del marketplace (POST /api/bookings) ya bloquea sus reservas
  //    hasta que un padre lo vincule (POST /api/guardianship). No inventamos modelo
  //    nuevo ni dejamos vínculos huérfanos.
  // Esto NO afecta el registro de adultos ni de PARENT (guardianEmail se ignora).
  if (isStudent && ageBand === "minor") {
    const guardianEmail = clean(data.guardianEmail, 160).toLowerCase();
    if (guardianEmail && EMAIL_RE.test(guardianEmail) && guardianEmail !== email) {
      const parent = await db.user.findUnique({ where: { email: guardianEmail } });
      if (parent && parent.role === "PARENT") {
        // Idempotente por el @@unique([parentId, studentId]); el estudiante es nuevo,
        // así que en la práctica siempre es una creación.
        const existingLink = await db.guardianship.findUnique({
          where: { parentId_studentId: { parentId: parent.id, studentId: user.id } },
        });
        if (!existingLink) {
          const guardianship = await db.guardianship.create({
            // PRD §11.3: el default seguro es "standard" (aprobar CADA reserva del
            // menor). "full" (confianza total) es opt-in explícito del padre desde
            // el selector del Portal de familia — nunca por defecto al vincular.
            data: { parentId: parent.id, studentId: user.id, status: "ACTIVE", consentLevel: "standard" },
          });
          // Ledger universal (cara del parent): toda acción escribe en ActivityEvent.
          await db.activityEvent.create({
            data: {
              userId: parent.id,
              type: "guardianship_linked",
              source: "guardianship",
              refId: guardianship.id,
              title: `Vinculó a ${user.name}`,
              detail: "Vínculo creado en el registro del menor",
            },
          });
        }
      }
      // parent inexistente o no-PARENT: el menor queda sin guardián (ver nota arriba).
    }
  }

  await setSession(user);
  return ok();
}
