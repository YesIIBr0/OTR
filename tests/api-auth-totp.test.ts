// [BE-TEST · R5] POST /api/auth/totp — activar/desactivar 2FA (solo ADMIN) — y el login
// exigiendo el código cuando la cuenta la tiene activa. Usa la lib TOTP REAL (totpCode)
// para generar códigos vigentes en los asserts: se prueba el flujo criptográfico entero,
// no un mock del verificador.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";
import { generateTotpSecret, totpCode } from "../app/lib/totp";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { POST } from "../app/api/auth/totp/route";

box.db = makeDb();
const db = box.db;

const ADMIN = { id: "admin-1", name: "Root", email: "root@otr.do", role: "ADMIN", totpSecret: null as string | null };

async function totp(body: Record<string, unknown>) {
  const res = await POST(jsonReq("/api/auth/totp", body));
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = { ...ADMIN };
  db.fn("user.update").mockResolvedValue({ id: ADMIN.id });
  db.fn("auditLog.create").mockResolvedValue({ id: "a1" });
});

describe("POST /api/auth/totp — gates", () => {
  it("sin sesión 401; STUDENT 403 (solo ADMIN gestiona su 2FA)", async () => {
    box.user = null;
    expect((await totp({ action: "setup" })).status).toBe(401);
    box.user = { id: "s1", name: "Ana", email: "a@x.com", role: "STUDENT", totpSecret: null };
    expect((await totp({ action: "setup" })).status).toBe(403);
  });

  it("acción inválida → 400", async () => {
    expect((await totp({ action: "hack" })).status).toBe(400);
  });
});

describe("POST /api/auth/totp — setup → enable → disable (flujo completo)", () => {
  it("setup: devuelve secreto base32 + otpauth SIN persistir nada", async () => {
    const { status, json } = await totp({ action: "setup" });
    expect(status).toBe(200);
    expect(json.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(json.otpauth).toContain("otpauth://totp/");
    expect(json.otpauth).toContain(json.secret);
    expect(db.fn("user.update")).not.toHaveBeenCalled(); // dos fases: aún no se guarda
  });

  it("setup con 2FA ya activa → 400 (desactivar primero)", async () => {
    box.user = { ...ADMIN, totpSecret: generateTotpSecret() };
    expect((await totp({ action: "setup" })).status).toBe(400);
  });

  it("enable: código INCORRECTO → 401 sin persistir (prueba de posesión fallida)", async () => {
    const secret = generateTotpSecret();
    const { status } = await totp({ action: "enable", secret, code: "000000" });
    // (probabilidad 1e-6 de colisión real con "000000" — aceptada en el arnés)
    expect(status).toBe(401);
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });

  it("enable: secreto malformado → 400 aunque el código fuera válido", async () => {
    const { status } = await totp({ action: "enable", secret: "corto", code: "123456" });
    expect(status).toBe(400);
  });

  it("enable: código VIGENTE del secreto → persiste totpSecret + audit user.totp_enable", async () => {
    const secret = generateTotpSecret();
    const { status, json } = await totp({ action: "enable", secret, code: totpCode(secret) });
    expect(status).toBe(200);
    expect(json.enabled).toBe(true);
    expect(db.fn("user.update")).toHaveBeenCalledWith({ where: { id: ADMIN.id }, data: { totpSecret: secret } });
    expect(db.fn("auditLog.create").mock.calls[0][0].data.action).toBe("user.totp_enable");
  });

  it("disable: exige código vigente del secreto ACTUAL; correcto → limpia + audit", async () => {
    const secret = generateTotpSecret();
    box.user = { ...ADMIN, totpSecret: secret };
    expect((await totp({ action: "disable", code: "000000" })).status).toBe(401);
    const { status, json } = await totp({ action: "disable", code: totpCode(secret) });
    expect(status).toBe(200);
    expect(json.enabled).toBe(false);
    expect(db.fn("user.update")).toHaveBeenCalledWith({ where: { id: ADMIN.id }, data: { totpSecret: null } });
    expect(db.fn("auditLog.create").mock.calls[0][0].data.action).toBe("user.totp_disable");
  });

  it("disable sin 2FA activa → 400", async () => {
    expect((await totp({ action: "disable", code: "123456" })).status).toBe(400);
  });
});
