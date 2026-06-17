import { describe, it, expect } from "vitest";
import { esc } from "../app/lib/esc";

// [escaping-contract] queries.ts escapa el texto de usuario UNA vez; los builders scr-*.ts
// renderizan crudo. Estos tests fijan el contrato de esc(): cada carácter peligroso se escapa
// exactamente una vez (un doble-escape produciría &amp;amp; en la UI).
describe("esc()", () => {
  it("escapa los cinco caracteres peligrosos", () => {
    expect(esc("&")).toBe("&amp;");
    expect(esc("<")).toBe("&lt;");
    expect(esc(">")).toBe("&gt;");
    expect(esc('"')).toBe("&quot;");
    expect(esc("'")).toBe("&#39;");
  });

  it("neutraliza un intento de XSS", () => {
    expect(esc("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("escapa el ampersand UNA sola vez (no doble-escape)", () => {
    // El bug clásico: esc(esc("&")) === "&amp;amp;". esc() en sí debe dar "&amp;".
    expect(esc("Tom & Jerry")).toBe("Tom &amp; Jerry");
    // Doble-escape (lo que NO debe pasar en el render) sería &amp;amp;.
    expect(esc(esc("&"))).toBe("&amp;amp;");
  });

  it("coacciona valores nulos/indefinidos a cadena vacía", () => {
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
    expect(esc(0)).toBe("0");
  });
});
