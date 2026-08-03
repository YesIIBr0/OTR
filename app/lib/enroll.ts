// OTR · Inscripción idempotente bajo CONCURRENCIA [GOAL G2].
// Antes, checkout y el webhook de Stripe hacían findUnique → create: dos peticiones
// simultáneas del mismo alumno al mismo curso veían ambas `null`, ambas intentaban crear,
// y la segunda reventaba el unique (userId_courseId) con un 500 al usuario. Verificado en
// staging con dos checkouts en paralelo (respuesta 200/500) — el estado final era correcto
// (1 inscripción) pero la experiencia y el log decían "error del servidor".
//
// La solución NO es un chequeo previo (siempre habrá una ventana entre leer y escribir):
// se INTENTA la escritura y se trata la violación de unicidad como "ya estaba inscrito".
// Es la única forma correcta sin bloqueos: la unicidad la garantiza la DB, no la app.
import { db } from "./db";

/** Código de Prisma para violación de restricción única. */
const UNIQUE_VIOLATION = "P2002";

export interface EnrollResult {
  /** true = esta llamada creó la inscripción; false = ya existía (otra la creó, quizá a la vez). */
  created: boolean;
}

/**
 * Inscribe al alumno en el curso de forma idempotente y atómica.
 * `source`: FREE (inscripción directa) | PAID (webhook de Stripe) | MANUAL.
 * El contador studentsCount se incrementa SOLO cuando esta llamada creó la fila,
 * dentro de la misma transacción — así nunca cuenta de más bajo concurrencia.
 */
export async function enrollOnce(userId: string, courseId: string, source: "FREE" | "PAID" | "MANUAL"): Promise<EnrollResult> {
  try {
    await db.$transaction([
      db.enrollment.create({ data: { userId, courseId, status: "ACTIVE", source, lastAccess: "ahora" } }),
      db.course.update({ where: { id: courseId }, data: { studentsCount: { increment: 1 } } }),
    ]);
    return { created: true };
  } catch (err) {
    // Carrera perdida (o reintento): la otra petición ya inscribió → resultado idéntico.
    if ((err as { code?: string })?.code === UNIQUE_VIOLATION) return { created: false };
    throw err; // cualquier otro fallo SÍ es un error real: que suba.
  }
}
