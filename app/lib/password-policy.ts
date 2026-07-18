// OTR · Política de contraseñas [R2 — Tribunal 3.1]. Mínimo 8 + bloqueo de las comunes.
// Antes el mínimo era 6 y cualquier "123456" pasaba — flojo para una plataforma con cuentas
// ADMIN y datos de menores. Se aplica en register y reset (creación de credenciales NUEVAS);
// login NO la aplica a propósito: las cuentas existentes siguen entrando y endurecen al
// próximo cambio de contraseña.
// La lista es corta y local (top ofensoras + variantes en español) — el objetivo es cortar
// lo trivialmente adivinable, no reimplementar zxcvbn.

const COMUNES = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
  "password", "password1", "password123", "passw0rd", "p@ssw0rd",
  "contraseña", "contrasena", "contrasena1", "clave1234",
  "qwerty123", "qwertyui", "1q2w3e4r", "zaq12wsx", "asdfghjk", "abcd1234", "abc12345",
  "iloveyou", "letmein1", "welcome1", "admin123", "administrador",
  "monkey123", "dragon123", "football", "baseball", "superman", "princesa", "mariposa",
  "otr12345", "debate123", "academia1",
]);

// null = válida; string = mensaje de error listo para bad() (en español, como el resto).
export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (COMUNES.has(password.toLowerCase())) return "Esa contraseña es demasiado común — elige otra más difícil de adivinar";
  return null;
}
