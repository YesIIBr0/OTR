// OTR · AuditLog (servidor) — rastro inmutable de acciones ADMINISTRATIVAS (F2.1).
// A diferencia de activity.ts (ledger de aprendizaje del PROPIO usuario), este registra QUÉ
// admin tocó a QUIÉN: cambios de rol, verificación de coach, suspensiones, resolución de
// reportes, borrado de cursos. Requisito de trazabilidad de una plataforma con menores
// (COPPA / Ley 172-13 RD): toda acción administrativa debe ser atribuible.
//
// El registro NO tiene relación FK a User (ver schema): guarda actorId + actorName (snapshot)
// e ids del objetivo, para que el rastro SOBREVIVA al borrado del actor o del objetivo.
import { db } from "./db";

export interface AuditInput {
  actorId: string; // quién ejecuta la acción
  actorName: string; // snapshot del nombre del actor (sobrevive si el actor se borra)
  action: string; // "user.role_change" | "user.suspend" | "user.unsuspend" | "coach.verify" | "coach.unverify" | "report.resolve" | "course.delete"
  targetType: string; // user | report | course ...
  targetId: string;
  detail: string; // resumen legible en español (antes→después)
}

// Escribe un AuditLog. Best-effort: NUNCA lanza — el rastro no debe tumbar ni revertir la
// acción administrativa que ya se persistió (mismo contrato que logActivitySafe en activity.ts).
// Se invoca FUERA de las transacciones existentes, después del cambio.
export async function audit(input: AuditInput) {
  try {
    return await db.auditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        detail: input.detail,
      },
    });
  } catch {
    return null;
  }
}
