/* OTR · Regla del teléfono móvil / WhatsApp — FUENTE ÚNICA
   ---------------------------------------------------------------------------
   Módulo puro (cero imports) que comparten la PANTALLA que valida mientras se escribe y
   el SERVIDOR que normaliza y guarda.

   Por qué existe: la pantalla exigía "exactamente 10 dígitos" y el servidor guarda en E.164
   (+18095550177, once dígitos). Cada regla era razonable por su lado, pero juntas producían
   esto: el alumno llenaba el paso 1, volvía más tarde a corregir cualquier cosa, y el
   formulario rechazaba SUS PROPIOS teléfonos —los que la plataforma le había guardado— con
   "Revisa 2 campos" señalando dos campos correctos. Quedaba encerrado sin poder guardar.
   Lo encontramos con clicks; ningún test lo vio, porque cada lado se probaba solo y el
   flujo feliz llena el formulario una única vez.
   ------------------------------------------------------------------------- */

/** Códigos de área del NANP dominicano. */
export const RD_AREA_CODES = ["809", "829", "849"];

/**
 * Devuelve el número en E.164 (+1809…) o null si no es utilizable. Acepta las tres formas
 * en que un teléfono llega de verdad:
 *   · local dominicano de 10 dígitos, como lo escribe una familia: (809) 555-0123
 *   · con el 1 delante, 11 dígitos: 1 809 555 0123
 *   · ya normalizado o internacional explícito con "+": +18095550123, +34600123456
 * Esa tercera forma es la que faltaba en el cliente: es la que la plataforma DEVUELVE.
 */
export function normalizePhoneNumber(v: unknown): string | null {
  const raw = String(v ?? "").trim().slice(0, 40);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && RD_AREA_CODES.includes(digits.slice(0, 3))) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1" && RD_AREA_CODES.includes(digits.slice(1, 4))) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** ¿Se puede guardar este teléfono? Es exactamente "normalizarlo no da null", para que la
 *  pantalla no pueda tener un criterio distinto del que decide el servidor. */
export function isValidPhoneNumber(v: unknown): boolean {
  return normalizePhoneNumber(v) !== null;
}
