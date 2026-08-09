// OTR · Campana de notificaciones (servidor) — helper único para crear una Notification in-app.
// Envuelve la forma REPETIDA en 5+ sitios (messages, bookings POST, bookings/[id] approve y
// complete, submissions/[id]): siempre el instante de creación, unread true y position 0. Centralizar
// evita que cada call-site reinvente esos tres campos (y que uno se olvide de `unread`, dejando
// una notificación que nunca ilumina el badge).
//
// El TEXTO (title/detail) va SIN esc(): el contrato de escape lo aplica queries.ts
// (GET /api/notifications) UNA sola vez al servir al cliente. Doble escape → `&amp;amp;`.
//
// Best-effort: NUNCA lanza — una campana que falla no debe tumbar ni revertir la acción
// principal ya persistida (crear el mensaje, aprobar la reserva, calificar la entrega).
// Mismo contrato que audit() y logActivitySafe().
import { db } from "./db";

export interface NotifyInput {
  userId: string;
  icon: string;
  tone: string;
  title: string;
  detail: string;
}

export async function notify(input: NotifyInput) {
  try {
    return await db.notification.create({
      data: {
        userId: input.userId,
        icon: input.icon,
        tone: input.tone,
        title: input.title,
        detail: input.detail,
        // [DEUDA-H] Se guarda el INSTANTE, no la palabra: "ahora" quedaba congelado en la fila
        // (y en español) y una notificación de anteayer seguía anunciándose como recién llegada
        // aunque la UI estuviera en inglés. La etiqueta la deriva el lector con su idioma.
        whenLabel: "",
        whenAt: new Date(),
        unread: true,
        position: 0,
      },
    });
  } catch {
    return null;
  }
}
