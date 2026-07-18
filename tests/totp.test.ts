// [R5] TOTP RFC 6238 — verificado contra los VECTORES OFICIALES del RFC (Apéndice B, SHA-1):
// secreto ASCII "12345678901234567890", T=59s → "94287082" (8 díg.) cuyos últimos 6 son
// "287082"; T=1111111109 → "…081804". Si nuestra implementación reproduce los vectores,
// es interoperable con Google Authenticator/Authy/1Password. Función pura, sin mocks.
import { describe, it, expect } from "vitest";
import { base32Encode, base32Decode, generateTotpSecret, totpCode, verifyTotp, otpauthUrl } from "../app/lib/totp";

// El secreto de los vectores RFC en base32 (ASCII "12345678901234567890").
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("totp — vectores oficiales RFC 6238 (SHA-1, 6 dígitos)", () => {
  it("T=59s → 287082 (vector RFC 94287082, últimos 6)", () => {
    expect(totpCode(RFC_SECRET, 59_000)).toBe("287082");
  });
  it("T=1111111109s → 081804", () => {
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
  });
  it("T=1234567890s → 005924 (conserva ceros a la izquierda)", () => {
    expect(totpCode(RFC_SECRET, 1_234_567_890_000)).toBe("005924");
  });
});

describe("totp — base32 y secreto", () => {
  it("base32 roundtrip exacto", () => {
    const buf = Buffer.from("12345678901234567890");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });
  it("generateTotpSecret: 160 bits → 32 chars base32 válidos y distintos por llamada", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).toMatch(/^[A-Z2-7]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe("verifyTotp — ventana y rechazos", () => {
  const NOW = 1_111_111_109_000; // T con vector conocido: 081804
  it("acepta el código del paso actual y de ±1 paso (desfase de reloj)", () => {
    expect(verifyTotp(RFC_SECRET, "081804", NOW)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, NOW - 30_000), NOW)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, NOW + 30_000), NOW)).toBe(true);
  });
  it("rechaza a ±2 pasos (fuera de ventana)", () => {
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, NOW - 60_000), NOW)).toBe(false);
  });
  it("rechaza formato inválido sin evaluar (letras, longitud, vacío) y tolera espacios", () => {
    expect(verifyTotp(RFC_SECRET, "abc123", NOW)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345", NOW)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "", NOW)).toBe(false);
    expect(verifyTotp(RFC_SECRET, " 081 804 ", NOW)).toBe(true); // los usuarios pegan con espacios
  });
});

describe("otpauthUrl — formato estándar de las apps autenticadoras", () => {
  it("incluye issuer, cuenta, secreto y parámetros SHA1/6/30", () => {
    const url = otpauthUrl("ABC234", "admin@otr.do");
    expect(url).toBe("otpauth://totp/OTR%20Academy:admin%40otr.do?secret=ABC234&issuer=OTR%20Academy&algorithm=SHA1&digits=6&period=30");
  });
});
