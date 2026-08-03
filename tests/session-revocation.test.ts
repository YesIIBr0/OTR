// [BE-TEST · GOAL G4] Revocación de sesiones server-side (sessionEpoch).
// Cierra el gap que el Tribunal marcó (3.1): hasta ahora "cerrar sesión" solo borraba TU
// cookie — un token robado seguía valiendo 30 días. Ahora el token lleva el epoch de la
// cuenta y getSessionUser lo compara con la fila: incrementarlo mata TODAS las sesiones
// vivas al instante, sin tabla de sesiones que purgar.
// Se prueba la CRIPTO real (firma HMAC de verdad, sin mocks) + el gate de getSessionUser.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, cookie: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
// next/headers: cookie store falso en memoria (get/set/delete) para ejercitar auth.ts real.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (box.cookie ? { name: k, value: box.cookie } : undefined),
    set: (_k: string, v: string) => { box.cookie = v; },
    delete: () => { box.cookie = null; },
  }),
}));

import { signSession, verifySession, passwordFingerprint } from "../app/lib/auth-crypto";
import { getSessionUser, setSession, revokeAllSessions, clearSession } from "../app/lib/auth";

box.db = makeDb();
const db = box.db;

const HASH = "salt:hash-de-prueba";
const USER = { id: "u-1", name: "Ana", role: "STUDENT", passwordHash: HASH, suspended: false, sessionEpoch: 0 };

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.cookie = null;
  db.fn("user.findUnique").mockResolvedValue({ ...USER });
  db.fn("user.update").mockResolvedValue({ sessionEpoch: 1 });
});

describe("token de sesión — el epoch viaja firmado", () => {
  it("signSession/verifySession conservan userId, fp y epoch", () => {
    const fp = passwordFingerprint(HASH);
    const s = verifySession(signSession("u-1", fp, 7));
    expect(s).toEqual({ userId: "u-1", fp, epoch: 7 });
  });

  it("el epoch está DENTRO de la firma: manipularlo invalida el token", () => {
    const token = signSession("u-1", passwordFingerprint(HASH), 0);
    const parts = token.split(".");
    parts[3] = "99"; // un atacante sube su epoch para sobrevivir a una revocación
    expect(verifySession(parts.join("."))).toBeNull();
  });

  it("un token del formato ANTERIOR (sin epoch) ya no vale → re-login", () => {
    const fp = passwordFingerprint(HASH);
    // Formato viejo de 4 partes, firmado con el mismo secreto.
    const viejo = signSession("u-1", fp, 0).split(".");
    expect(verifySession([viejo[0], viejo[1], viejo[2], viejo[4]].join("."))).toBeNull();
  });
});

describe("getSessionUser — el gate del epoch", () => {
  it("sesión con el epoch vigente → usuario válido", async () => {
    await setSession(USER);
    expect(await getSessionUser()).toMatchObject({ id: "u-1" });
  });

  it("REVOCADA: el epoch de la fila subió → la cookie vieja deja de valer AL INSTANTE", async () => {
    await setSession(USER); // cookie emitida con epoch 0
    db.fn("user.findUnique").mockResolvedValue({ ...USER, sessionEpoch: 1 }); // alguien revocó
    expect(await getSessionUser()).toBeNull();
  });

  it("tras revocar, una sesión NUEVA (epoch 1) sí vale — el usuario vuelve a entrar", async () => {
    db.fn("user.findUnique").mockResolvedValue({ ...USER, sessionEpoch: 1 });
    await setSession({ ...USER, sessionEpoch: 1 });
    expect(await getSessionUser()).toMatchObject({ id: "u-1" });
  });

  it("las otras defensas siguen: suspendido y cambio de contraseña también invalidan", async () => {
    await setSession(USER);
    db.fn("user.findUnique").mockResolvedValue({ ...USER, suspended: true });
    expect(await getSessionUser()).toBeNull();
    db.fn("user.findUnique").mockResolvedValue({ ...USER, passwordHash: "otro:hash" });
    expect(await getSessionUser()).toBeNull();
  });
});

describe("revokeAllSessions", () => {
  it("incrementa el epoch de la cuenta (O(1), sin tabla de sesiones) y devuelve el nuevo", async () => {
    const nuevo = await revokeAllSessions("u-1");
    expect(db.fn("user.update")).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { sessionEpoch: { increment: 1 } },
      select: { sessionEpoch: true },
    });
    expect(nuevo).toBe(1);
  });

  it("clearSession solo borra la cookie local (no revoca las otras)", async () => {
    await setSession(USER);
    await clearSession();
    expect(box.cookie).toBeNull();
    expect(db.fn("user.update")).not.toHaveBeenCalled();
  });
});
