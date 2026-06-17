import { describe, it, expect } from "vitest";
import { norm, matches } from "../app/lib/text";

// [ENT-03] Búsqueda acento- y case-insensible en los filtros del cliente.
describe("norm()", () => {
  it("quita diacríticos y baja a minúsculas", () => {
    expect(norm("Analía")).toBe("analia");
    expect(norm("ORATORIA")).toBe("oratoria");
    expect(norm("Público")).toBe("publico");
    expect(norm("  Saúl  ")).toBe("saul");
  });
  it("es estable con cadenas ya normalizadas", () => {
    expect(norm("debate")).toBe("debate");
  });
  it("tolera null/undefined", () => {
    expect(norm(null as any)).toBe("");
    expect(norm(undefined as any)).toBe("");
  });
});

describe("matches()", () => {
  it("encuentra ignorando acentos y mayúsculas", () => {
    expect(matches("Analía Reyes", "analia")).toBe(true);
    expect(matches("Analía Reyes", "ANALÍA")).toBe(true);
    expect(matches("Público Forum", "publico")).toBe(true);
    expect(matches("Lincoln-Douglas", "douglas")).toBe(true);
  });
  it("no encuentra lo que no está", () => {
    expect(matches("Analía Reyes", "carla")).toBe(false);
  });
  it("una needle vacía siempre hace match (sin filtro)", () => {
    expect(matches("cualquiera", "")).toBe(true);
    expect(matches("cualquiera", "   ")).toBe(true);
  });
});
