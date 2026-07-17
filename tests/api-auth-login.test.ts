// [BE-TEST · F5.2] Integración de POST /api/auth/login — la puerta de entrada.
// Protege: (1) credenciales malas devuelven SIEMPRE el MISMO mensaje/estado tanto si el
// correo no existe como si la contraseña es mala (anti-enumeración de cuentas); (2) el éxito
// emite sesión llamando setSession con el usuario resuelto; (3) el rate-limit REAL corta a
// fuerza-bruta al 9º intento (límite 8 / ventana) — como api-reports, este archivo NO mockea
// el limiter: usa una key (ip+email) dedicada por test para aislar el contador de módulo.
//
// verifyPassword/hashPassword se usan REALES (crypto de Node): generamos un hash scrypt del
// password "correcto" y el route lo verifica de verdad. Solo se mockea Prisma + la sesión.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";
import { hashPassword } from "../app/lib/auth-crypto";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST } from "../app/api/auth/login/route";
import { setSession } from "../app/lib/auth";

box.db = makeDb();
const db = box.db;

const PASSWORD = "correct-horse-battery";
const HASH = hashPassword(PASSWORD); // hash scrypt real; verifyPassword lo valida de verdad
const USER = { id: "u-login-1", name: "Ana Ruiz", role: "STUDENT", passwordHash: HASH, suspended: false };

// email distinto por test → key `login:<ip>:<email>` aislada (no acumula en el limiter real).
async function login(email: string, password: string) {
  const res = await POST(jsonReq("/api/auth/login", { email, password }));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks(); // limpia setSession; NO toca el estado del limiter real
});

describe("POST /api/auth/login — credenciales", () => {
  it("éxito: usuario existe + password correcta → 200 y emite sesión (setSession con el usuario)", async () => {
    db.fn("user.findUnique").mockResolvedValue(USER);
    const { status, json } = await login("ok-user@x.com", PASSWORD);
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(setSession).toHaveBeenCalledOnce();
    expect(setSession).toHaveBeenCalledWith(USER);
  });

  it("password mala (usuario SÍ existe) → 401 y NO emite sesión", async () => {
    db.fn("user.findUnique").mockResolvedValue(USER);
    const { status, json } = await login("badpass@x.com", "no-es-la-clave");
    expect(status).toBe(401);
    expect(json.error).toBe("Correo o contraseña incorrectos");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("usuario INEXISTENTE → 401 con EL MISMO mensaje que password mala (anti-enumeración)", async () => {
    db.fn("user.findUnique").mockResolvedValue(null);
    const { status, json } = await login("nadie@x.com", PASSWORD);
    expect(status).toBe(401);
    // Mismo status y misma frase que el caso de password mala → no revela si el correo existe.
    expect(json.error).toBe("Correo o contraseña incorrectos");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("campos faltantes (password vacía) → 401 y ni consulta la DB", async () => {
    db.fn("user.findUnique").mockResolvedValue(USER);
    const { status, json } = await login("sinpass@x.com", "");
    expect(status).toBe(401);
    expect(json.error).toBe("Correo o contraseña incorrectos");
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
  });

  // [F5-fix] El login ahora RECHAZA suspendidos con 403 explícito y sin cookie (antes emitía
  // sesión y era getSessionUser — auth.ts P0-7, que sigue vigente como segunda capa — quien
  // lo cortaba en el request siguiente). El chequeo va DESPUÉS de verificar la contraseña:
  // no filtra la existencia de la cuenta a quien no la conoce.
  it("usuario suspendido con password correcta → 403 y NO emite sesión", async () => {
    db.fn("user.findUnique").mockResolvedValue({ ...USER, suspended: true });
    const { status, json } = await login("suspendido@x.com", PASSWORD);
    expect(status).toBe(403);
    expect(json.error).toMatch(/suspendida/i);
    expect(setSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/login — rate-limit real (anti fuerza-bruta, 8 / ventana)", () => {
  it("al 9º intento sobre la misma key (ip+email) responde 429 (los 8 previos pasan al chequeo de credenciales)", async () => {
    db.fn("user.findUnique").mockResolvedValue(USER);
    const EMAIL = "flood-login@x.com"; // key dedicada → contador aislado del resto de tests
    const statuses: number[] = [];
    for (let i = 0; i < 9; i++) {
      // password mala a propósito: los que superan el limiter caen en 401; el 9º lo corta el limiter.
      statuses.push((await login(EMAIL, "mala")).status);
    }
    expect(statuses.slice(0, 8)).toEqual(Array(8).fill(401));
    expect(statuses[8]).toBe(429);
  });
});
