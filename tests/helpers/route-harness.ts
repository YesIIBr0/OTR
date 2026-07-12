// [BE-TEST] Harness para tests de INTEGRACIÓN de route handlers sin DB real.
// Mockea Prisma (app/lib/db) y la sesión (app/lib/auth) para poder ejercitar la LÓGICA
// de cada ruta —gates de rol, validación, transiciones de estado, qué escribe— de forma
// determinista y rápida (igual que el resto de la suite, corre en CI sin Postgres).
//
// Uso en un test file (los vi.mock DEBEN vivir en el propio archivo — se hoistean):
//   import { vi } from "vitest";
//   import { makeDb, jsonReq } from "./helpers/route-harness";
//   // Caja hoisteada: los factory de vi.mock (que se elevan sobre los imports) solo pueden
//   // tocar `vi` y variables de vi.hoisted — nunca imports. El Proxy reenvía PEREZOSAMENTE
//   // a box.db.db, que se rellena en la evaluación del módulo (antes de que corra ningún it).
//   const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
//   vi.mock("../app/lib/db", () => ({
//     db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
//   }));
//   vi.mock("../app/lib/auth", () => ({
//     getSessionUser: () => box.user, setSession: vi.fn(), clearSession: vi.fn(),
//   }));
//   import { POST } from "../app/api/.../route";
//   box.db = makeDb();
// Ver tests/api-register.test.ts como plantilla completa.

import { vi } from "vitest";

export type MockDb = {
  db: any;
  /** Devuelve (creándolo si hace falta) el vi.fn() de "modelo.metodo" o "$queryRawUnsafe". */
  fn: (path: string) => ReturnType<typeof vi.fn>;
  /** Resetea todos los mocks entre tests. */
  reset: () => void;
};

// Construye un cliente Prisma falso: cualquier `db.<model>.<method>(...)` es un vi.fn()
// memoizado por ruta "model.method". $transaction soporta las dos formas del código:
//   - callback:  db.$transaction(async (tx) => {...})   → tx = el mismo proxy
//   - array:     db.$transaction([ p1, p2 ])            → Promise.all (ya invocados)
export function makeDb(): MockDb {
  const calls: Record<string, ReturnType<typeof vi.fn>> = {};
  const fn = (path: string) => (calls[path] ??= vi.fn());

  const modelProxy = (model: string) =>
    new Proxy({}, { get: (_t, method: string) => fn(`${model}.${String(method)}`) });

  const models: Record<string, any> = {};
  const db: any = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        const p = String(prop);
        if (p === "then") return undefined; // no es una promesa
        if (p === "$transaction") {
          return async (arg: any) =>
            Array.isArray(arg) ? Promise.all(arg) : arg(db);
        }
        if (p.startsWith("$")) return fn(p); // $queryRawUnsafe, $executeRaw, etc.
        return (models[p] ??= modelProxy(p));
      },
    },
  );

  return {
    db,
    fn,
    reset: () => {
      for (const k of Object.keys(calls)) delete calls[k];
      for (const k of Object.keys(models)) delete models[k];
    },
  };
}

// Helper: construye un Request JSON POST/PATCH como los que reciben los handlers.
export function jsonReq(url: string, body: unknown, method = "POST", headers: Record<string, string> = {}): Request {
  return new Request(`http://test.local${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
