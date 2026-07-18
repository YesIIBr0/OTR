// [R2 — Tribunal 3.1] passwordPolicyError: mínimo 8 + bloqueo de contraseñas comunes.
// Se aplica en register y reset (credenciales NUEVAS); login queda fuera a propósito
// (las cuentas existentes entran y endurecen en su próximo cambio). Función pura, sin mocks.
import { describe, it, expect } from "vitest";
import { passwordPolicyError } from "../app/lib/password-policy";

describe("passwordPolicyError — política de contraseñas", () => {
  it("menos de 8 caracteres → error (aunque antes 6-7 pasaban)", () => {
    expect(passwordPolicyError("abc123")).toMatch(/al menos 8/);
    expect(passwordPolicyError("siete77")).toMatch(/al menos 8/);
    expect(passwordPolicyError("")).toMatch(/al menos 8/);
  });

  it("contraseñas comunes bloqueadas, sin importar mayúsculas", () => {
    expect(passwordPolicyError("12345678")).toMatch(/demasiado común/);
    expect(passwordPolicyError("password123")).toMatch(/demasiado común/);
    expect(passwordPolicyError("Contraseña")).toMatch(/demasiado común/);
    expect(passwordPolicyError("QWERTY123")).toMatch(/demasiado común/);
  });

  it("una contraseña razonable de 8+ pasa (null)", () => {
    expect(passwordPolicyError("mi clave con espacios 9")).toBeNull();
    expect(passwordPolicyError("caballo-correcto-bateria")).toBeNull();
    expect(passwordPolicyError("OTRdebate2026!")).toBeNull();
  });
});
