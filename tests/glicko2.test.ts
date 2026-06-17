import { describe, it, expect } from "vitest";
import { tierFor, updateRating } from "../app/lib/glicko2";

// [§6.2] Tiers de debate derivados del rating Glicko-2 + que el rating se MUEVE al adjudicar.
describe("tierFor()", () => {
  it("mapea los límites de cada tier", () => {
    expect(tierFor(1299)).toBe("Novato");
    expect(tierFor(1300)).toBe("Bronze");
    expect(tierFor(1449)).toBe("Bronze");
    expect(tierFor(1450)).toBe("Silver");
    expect(tierFor(1599)).toBe("Silver");
    expect(tierFor(1600)).toBe("Gold");
    expect(tierFor(2200)).toBe("Grandmaster");
    expect(tierFor(3000)).toBe("Grandmaster");
  });
  it("trata valores inválidos como 0 (Novato)", () => {
    expect(tierFor(NaN as any)).toBe("Novato");
    expect(tierFor(undefined as any)).toBe("Novato");
  });
});

describe("updateRating()", () => {
  const player = { rating: 1500, rd: 350, vol: 0.06 };
  it("sube el rating tras una victoria y baja tras una derrota", () => {
    const win = updateRating(player, [{ rating: 1500, rd: 200, score: 1 }]);
    const loss = updateRating(player, [{ rating: 1500, rd: 200, score: 0 }]);
    expect(win.rating).toBeGreaterThan(player.rating);
    expect(loss.rating).toBeLessThan(player.rating);
  });
  it("reduce el RD (mayor certeza) tras jugar una ronda", () => {
    const after = updateRating(player, [{ rating: 1500, rd: 200, score: 1 }]);
    expect(after.rd).toBeLessThan(player.rd);
  });
});
