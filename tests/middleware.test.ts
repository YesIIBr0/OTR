// [BE-TEST · GOAL G5] Backstop global de rate limit. Fija: solo frena ESCRITURAS de /api,
// nunca lecturas; los webhooks (autenticados por firma, con ráfagas legítimas del proveedor)
// y el cron quedan exentos; y al pasar el tope responde 429 con Retry-After.
import { describe, it, expect, beforeEach, vi } from "vitest";

// Módulo con estado (el contador vive en memoria): se reimporta limpio en cada test.
async function freshMiddleware() {
  vi.resetModules();
  return (await import("../middleware")).middleware;
}

function req(path: string, method = "POST", ip = "203.0.113.9") {
  return new Request(`http://test.local${path}`, {
    method,
    headers: { "x-forwarded-for": `10.0.0.1, ${ip}` }, // el ÚLTIMO hop es el de nuestro proxy
  }) as never;
}

let middleware: Awaited<ReturnType<typeof freshMiddleware>>;
beforeEach(async () => { middleware = await freshMiddleware(); });

describe("middleware — backstop de escrituras", () => {
  it("las LECTURAS nunca se frenan (aunque sean muchas)", async () => {
    for (let i = 0; i < 200; i++) {
      const res = middleware(req("/api/app-data", "GET"));
      expect(res.status).not.toBe(429);
    }
  });

  it("una escritura normal pasa; al superar el tope por IP responde 429 con Retry-After", async () => {
    let last;
    for (let i = 0; i < 61; i++) last = middleware(req("/api/bookings", "POST"));
    expect(last!.status).toBe(429);
    expect(last!.headers.get("Retry-After")).toBeTruthy();
    const json = await last!.json();
    expect(json.code).toBe("rateLimited");
  });

  it("el tope es POR IP: otra IP no hereda el bloqueo del vecino", async () => {
    for (let i = 0; i < 61; i++) middleware(req("/api/bookings", "POST", "203.0.113.9"));
    const otra = middleware(req("/api/bookings", "POST", "198.51.100.7"));
    expect(otra.status).not.toBe(429);
  });

  it("webhooks y cron EXENTOS: Stripe/WhatsApp mandan ráfagas legítimas y van firmados", async () => {
    for (let i = 0; i < 120; i++) {
      expect(middleware(req("/api/stripe/webhook", "POST")).status).not.toBe(429);
      expect(middleware(req("/api/whatsapp/webhook", "POST")).status).not.toBe(429);
      expect(middleware(req("/api/cron/reminders", "POST")).status).not.toBe(429);
    }
  });
});
