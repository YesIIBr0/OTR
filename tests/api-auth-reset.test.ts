// [BE-TEST · F5.2] Integración de recuperación de contraseña — /api/auth/forgot + /api/auth/reset.
// Protege:
//   FORGOT — no filtra si un correo existe: responde SIEMPRE ok() (mismo cuerpo) exista o no la
//     cuenta; solo cuando existe crea un PasswordReset (token HASHEADO en DB) y manda el correo.
//   RESET  — token inválido / expirado / ya usado → 4xx con el mismo mensaje (no distingue casos);
//     token válido actualiza el passwordHash del usuario y marca el token como usado, en UNA
//     $transaction. hashPassword es real; hashToken se mockea (identidad prefijada) para poder
//     afirmar que la búsqueda es por HASH, nunca por el token en claro.
// El rate-limit NO es el foco aquí → se neutraliza (patrón api-register). Mockea Prisma + mail.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

// Caja hoisteada (los factory de vi.mock se elevan sobre los imports; solo pueden tocar
// `vi` y vars de vi.hoisted). El Proxy reenvía perezosamente a box.db.db.
const box = vi.hoisted(() => ({ db: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
// mail: hashToken determinista (prefijado) para poder afirmar el where por HASH; sendPasswordReset spy.
vi.mock("../app/lib/mail", () => ({
  sendMail: vi.fn(),
  sendPasswordReset: vi.fn(),
  hashToken: (t: string) => `H(${t})`,
  emailShell: vi.fn(),
  emailButton: vi.fn(),
}));
// El limiter no es el foco → siempre ok (no contamina entre tests).
vi.mock("../app/lib/rate-limit", () => ({ rateLimit: () => ({ ok: true, retryAfter: 0 }) }));

import { POST as FORGOT } from "../app/api/auth/forgot/route";
import { POST as RESET } from "../app/api/auth/reset/route";
import { sendPasswordReset } from "../app/lib/mail";

box.db = makeDb();
const db = box.db;

async function forgot(email?: string) {
  const res = await FORGOT(jsonReq("/api/auth/forgot", { email }));
  return { status: res.status, json: await res.json() };
}
async function reset(body: Record<string, unknown>) {
  const res = await RESET(jsonReq("/api/auth/reset", body));
  return { status: res.status, json: await res.json() };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// FORGOT — anti-enumeración
// ---------------------------------------------------------------------------
describe("POST /api/auth/forgot — no filtra existencia del correo", () => {
  it("correo EXISTENTE → 200 ok(): crea PasswordReset con tokenHash + envía el enlace", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: "u1", email: "existe@x.com" });
    db.fn("passwordReset.create").mockResolvedValue({ id: "pr1" });

    const { status, json } = await forgot("existe@x.com");
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true });

    // Se guarda el token HASHEADO (nunca en claro).
    expect(db.fn("passwordReset.create")).toHaveBeenCalledOnce();
    const data = db.fn("passwordReset.create").mock.calls[0][0].data;
    expect(data.userId).toBe("u1");
    expect(data.tokenHash).toMatch(/^H\(.+\)$/); // pasó por hashToken
    expect(data.expiresAt).toBeInstanceOf(Date);
    // Se envía el correo de recuperación al usuario.
    expect(sendPasswordReset).toHaveBeenCalledOnce();
    expect(vi.mocked(sendPasswordReset).mock.calls[0][0]).toBe("existe@x.com");
  });

  it("correo INEXISTENTE → 200 ok() IDÉNTICO, SIN crear token ni enviar correo (anti-enumeración)", async () => {
    db.fn("user.findUnique").mockResolvedValue(null);
    const { status, json } = await forgot("nadie@x.com");
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true }); // mismo cuerpo que el caso existente
    expect(db.fn("passwordReset.create")).not.toHaveBeenCalled();
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  it("email vacío → 200 ok() sin ni siquiera consultar la DB", async () => {
    const { status, json } = await forgot("");
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(db.fn("user.findUnique")).not.toHaveBeenCalled();
    expect(db.fn("passwordReset.create")).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// RESET — validación de token + efecto
// ---------------------------------------------------------------------------
describe("POST /api/auth/reset — validación del token", () => {
  const VALID_RECORD = {
    id: "pr1",
    userId: "u1",
    usedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // +30 min → vigente
  };

  it("sin token → 400 'Token inválido' (no toca la DB)", async () => {
    const { status, json } = await reset({ password: "nuevaClave1" });
    expect(status).toBe(400);
    expect(json.error).toBe("Token inválido");
    expect(db.fn("passwordReset.findUnique")).not.toHaveBeenCalled();
  });

  it("password corta (<6) → 400 y NO busca el token todavía", async () => {
    const { status, json } = await reset({ token: "tok", password: "123" });
    expect(status).toBe(400);
    expect(json.error).toBe("La contraseña debe tener al menos 6 caracteres");
    expect(db.fn("passwordReset.findUnique")).not.toHaveBeenCalled();
  });

  it("token INEXISTENTE → 4xx sin actualizar nada", async () => {
    db.fn("passwordReset.findUnique").mockResolvedValue(null);
    const { status, json } = await reset({ token: "tok", password: "nuevaClave1" });
    expect(status).toBe(400);
    expect(json.error).toBe("El enlace de recuperación es inválido o ha expirado");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
    expect(db.fn("passwordReset.update")).not.toHaveBeenCalled();
    // La búsqueda es por HASH del token, nunca por el token en claro.
    expect(db.fn("passwordReset.findUnique").mock.calls[0][0].where).toEqual({ tokenHash: "H(tok)" });
  });

  it("token YA USADO (usedAt seteado) → 4xx mismo mensaje, sin efecto", async () => {
    db.fn("passwordReset.findUnique").mockResolvedValue({ ...VALID_RECORD, usedAt: new Date() });
    const { status, json } = await reset({ token: "tok", password: "nuevaClave1" });
    expect(status).toBe(400);
    expect(json.error).toBe("El enlace de recuperación es inválido o ha expirado");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("token EXPIRADO → 4xx mismo mensaje, sin efecto", async () => {
    db.fn("passwordReset.findUnique").mockResolvedValue({ ...VALID_RECORD, expiresAt: new Date(Date.now() - 1000) });
    const { status, json } = await reset({ token: "tok", password: "nuevaClave1" });
    expect(status).toBe(400);
    expect(json.error).toBe("El enlace de recuperación es inválido o ha expirado");
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("token VÁLIDO → 200: actualiza el passwordHash del usuario y marca el token usado (en una $transaction)", async () => {
    db.fn("passwordReset.findUnique").mockResolvedValue({ ...VALID_RECORD });
    db.fn("user.update").mockResolvedValue({ id: "u1" });
    db.fn("passwordReset.update").mockResolvedValue({ id: "pr1" });

    const { status, json } = await reset({ token: "tok", password: "nuevaClave1" });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);

    // Nuevo hash sobre el usuario del token.
    expect(db.fn("user.update")).toHaveBeenCalledOnce();
    const userArg = db.fn("user.update").mock.calls[0][0];
    expect(userArg.where).toEqual({ id: "u1" });
    expect(typeof userArg.data.passwordHash).toBe("string");
    expect(userArg.data.passwordHash).toContain(":"); // formato salt:hash de hashPassword
    expect(userArg.data.passwordHash).not.toBe("nuevaClave1"); // nunca en claro

    // Token de un solo uso: marcado usado.
    expect(db.fn("passwordReset.update")).toHaveBeenCalledOnce();
    const prArg = db.fn("passwordReset.update").mock.calls[0][0];
    expect(prArg.where).toEqual({ id: "pr1" });
    expect(prArg.data.usedAt).toBeInstanceOf(Date);
  });
});
