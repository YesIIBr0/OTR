// [BE-TEST · GOAL G3] Micro-caché en memoria de datos GLOBALES. Fija el contrato que hace
// seguro cachear en un servidor multi-usuario: TTL respetado, una sola ejecución para N
// peticiones concurrentes (anti-estampida), y un error NUNCA se cachea.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { cached, invalidate, cacheSize } from "../app/lib/cache";

beforeEach(() => invalidate());

describe("cached — TTL y deduplicación", () => {
  it("ejecuta una vez y sirve el valor cacheado dentro del TTL", async () => {
    const fn = vi.fn().mockResolvedValue("valor");
    expect(await cached("k1", 1000, fn)).toBe("valor");
    expect(await cached("k1", 1000, fn)).toBe("valor");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("N peticiones CONCURRENTES con caché fría → UNA sola query (anti-estampida)", async () => {
    let ejecuciones = 0;
    const fn = async () => { ejecuciones++; await new Promise((r) => setTimeout(r, 20)); return "x"; };
    const todas = await Promise.all(Array.from({ length: 10 }, () => cached("k2", 1000, fn)));
    expect(ejecuciones).toBe(1); // 10 usuarios entrando a la vez = 1 query, no 10
    expect(todas.every((v) => v === "x")).toBe(true);
  });

  it("al expirar el TTL vuelve a consultar (el dato no se queda viejo para siempre)", async () => {
    const fn = vi.fn().mockResolvedValue("v");
    await cached("k3", 5, fn);
    await new Promise((r) => setTimeout(r, 15));
    await cached("k3", 5, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("un error NO se cachea: el siguiente intento vuelve a ejecutar de verdad", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("db caída")).mockResolvedValue("ok");
    await expect(cached("k4", 1000, fn)).rejects.toThrow("db caída");
    expect(await cached("k4", 1000, fn)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("claves distintas no se pisan y invalidate() limpia", async () => {
    await cached("a", 1000, async () => 1);
    await cached("b", 1000, async () => 2);
    expect(cacheSize()).toBe(2);
    invalidate("a");
    expect(cacheSize()).toBe(1);
    invalidate();
    expect(cacheSize()).toBe(0);
  });
});
