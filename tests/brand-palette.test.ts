import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// [rebrand-brandbook-v1 · Task 1] Guardián de paleta.
//
// El Brand Book V1.0 (2026) define negro #171717 + naranja #F25623 + grises fríos como
// ÚNICA paleta del producto. Este test escanea las superficies de producto y falla
// mientras quede cualquier resto de la paleta anterior (crema/verde/oro y el azul navy
// aún más viejo). Arranca en ROJO a propósito: el listado de violaciones que imprime ES
// el inventario de trabajo del rebrand; cuando el test pasa, la migración está completa.
//
// Nota: este archivo vive en tests/ y las raíces escaneadas son app/, public/site/ y los
// archivos de prisma/ — por eso la lista FORBIDDEN de abajo no se auto-detecta.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Raíces escaneadas: directorios (recursivos) y archivos sueltos. */
const SCAN_TARGETS = [
  "app",
  "public/site",
  "prisma/seed.ts",
  "prisma/schema.prisma",
  "prisma/schema.postgres.prisma",
];

const EXTENSIONS = [".ts", ".tsx", ".css", ".html", ".js", ".mjs", ".prisma"];

/** Rutas (relativas a ROOT) que nunca se escanean. */
const EXCLUDED_DIRS = ["node_modules", ".next", "app/uploads"];

/**
 * Paleta prohibida. Cada entrada es un fragmento literal (case-insensitive), salvo la
 * fuente display de la landing, donde el separador puede ser espacio o `+` (query de
 * Google Fonts). Ver la TABLA DE MAPEO CANÓNICA del plan para el reemplazo de cada uno.
 */
const FORBIDDEN = [
  // Verdes (acción/acento viejo)
  "#2CAA20",
  "#54C247",
  "#1E8C16",
  "#E1F2DE",
  "#176B11",
  // Oro (logro viejo)
  "#F2B814",
  "#C8920C",
  "#FBEFCB",
  "#5A4206",
  // Neutrales cálidos (crema)
  "#F7F7ED",
  "#EFEFE5",
  "#E4E4D9",
  "#D3D3C7",
  "#B4B4A7",
  "#89897D",
  "#5F5F56",
  "#44443D",
  // Azul navy anterior
  "#0C2340",
  "#0A1A2F",
  "#4FA9E8",
  "#2E8BD0",
  "#7FC8F2",
  "#9FC6E8",
  "#DCEEFB",
  // Landing (ámbar/verde viejos)
  "#F5A623",
  "#FF9D2E",
  // Negro viejo
  "#0C0C0C",
  // rgba con los canales de la paleta vieja
  "rgba(44,170,32",
  "rgba(234,242,251",
];

/** Fuente display de la landing: `Archivo Expanded` o `Archivo+Expanded`. */
const FORBIDDEN_FONT = /Archivo[+ ]Expanded/gi;

/* ============================================================================
   [GOAL-E4 #10] Regla ESTRUCTURAL: nada de hexes FRÍOS.

   La lista FORBIDDEN de arriba es una denylist literal: solo caza los hexes exactos
   que alguien se acordó de apuntar. Por eso se le escapó `.chip--info{background:#E7EBEE;
   color:#3F5566}` en screens.css — un azul-pizarra que nadie había inventariado y que llegó
   vivo hasta la consola de usuarios (chip de rol "Profesor/Coach"), en un producto cuya
   paleta declarada es negro #171717 + naranja #F25623 sobre neutros CÁLIDOS.

   La propiedad que sí generaliza: en esta paleta el canal ROJO nunca es menor que el AZUL.
     · naranja  #F25623 → r242 > b35     · greige   #F1F1EF → r241 > b239
     · bordes   #E4E3DF → r228 > b223    · grises   #4D4D4D → r == b
   Un hex con b > r es, por construcción, de otra paleta (azul/pizarra/frío). Se permite un
   punto de holgura (b - r > 1) para no penalizar redondeos de un neutro puro.

   Esto NO sustituye a FORBIDDEN (los verdes/oros/cremas viejos son cálidos y siguen
   necesitando su literal); lo COMPLEMENTA por el flanco frío. */
const COOL_TOLERANCE = 1;
const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

/**
 * Excepciones EXPLÍCITAS al detector de fríos: hex + archivo + porqué. Se listan por archivo
 * a propósito — el mismo hex en otro sitio vuelve a fallar.
 */
const COOL_ALLOWED: Array<{ hex: string; file: string; why: string }> = [
  {
    hex: "#2FA84F",
    file: "app/styles/tokens.css",
    why:
      "[PEDIDO DE ISAAC · 2026-08-09] Verde de VICTORIA (--win) de la tarjeta de rating del " +
      "Debate Hub y RAÍZ de la escala --success. Textual del cliente sobre esa card: «Las W " +
      "- verde», «Las L - así negro»; y sobre el sistema entero: «Para completed - verde. " +
      "Para progress bar - verde». Aquí el color no decora: SIGNIFICA el resultado de la " +
      "ronda y el avance/completado. Vive SOLO en tokens.css (lo amarra el test «los colores " +
      "semánticos de Isaac no se escapan de tokens.css» de este mismo archivo); las pantallas " +
      "lo consumen por var(--win)/var(--success), nunca por hex. " +
      "Contraste MEDIDO (WCAG 2.1): letra negra #171717 encima → 5,83:1 (AA, ≥4,5); " +
      "letra blanca daría 3,07:1, por eso sobre verde el texto es SIEMPRE negro.",
  },
  {
    hex: "#1A7A38",
    file: "app/styles/tokens.css",
    why:
      "[PEDIDO DE ISAAC · 2026-08-09] --success-strong: el MISMO verde #2FA84F oscurecido " +
      "hasta cumplir AA como color de TEXTO sobre claro (es al verde lo que --otr-green-text " +
      "#9E3211 es al naranja). Lo consumen el % de progreso, --ok (éxito/completado), el " +
      "trazo del anillo claro y la punta de las barras. No es un tercer verde: es el paso " +
      "oscuro de la escala de --win. Contraste MEDIDO (WCAG 2.1, L=0,14426): sobre blanco " +
      "5,41:1 · sobre el greige #F1F1EF 4,78:1 · sobre --success-soft 4,70:1 · con letra " +
      "blanca encima 5,41:1 · contra la pista de barra #EFEFEF 4,70:1 (WCAG 1.4.11 pide 3:1).",
  },
  {
    hex: "#E3F3E7",
    file: "app/styles/tokens.css",
    why:
      "[PEDIDO DE ISAAC · 2026-08-09] --success-soft: tinte del mismo verde (≈12% de " +
      "#2FA84F sobre blanco) para los FONDOS de completado — chip suave «COMPLETADO», tile " +
      "del check de lección/módulo hecho, paso hecho de la escalera de niveles. Releva a " +
      "--ok-soft #EFEFEF sin cambiar el peso visual, solo el tono. Contraste MEDIDO " +
      "(L=0,86201): con --success-strong encima 4,70:1 (AA) · con #171717 encima 15,57:1.",
  },
  {
    hex: "#E8EDF3",
    file: "app/components/Aula.tsx",
    why:
      "Fallback muerto de `var(--n-150,#e8edf3)` en el modal de progreso: --n-150 SÍ está " +
      "definido en tokens.css (#E7E7E7), así que este valor no se pinta nunca. Queda " +
      "whitelisteado porque Aula.tsx está fuera del alcance de este cambio; hay que borrar " +
      "el fallback (no reemplazarlo) cuando se toque ese archivo.",
  },
];

/** Expande #abc → #aabbcc y devuelve los tres canales. */
function channelsOf(hex: string): { r: number; g: number; b: number } {
  let body = hex.slice(1);
  if (body.length === 3) body = body.split("").map((c) => c + c).join("");
  return {
    r: parseInt(body.slice(0, 2), 16),
    g: parseInt(body.slice(2, 4), 16),
    b: parseInt(body.slice(4, 6), 16),
  };
}

/** ¿Hex de una paleta fría (azul por encima del rojo)? */
function isCoolHex(hex: string): boolean {
  const { r, b } = channelsOf(hex);
  return b - r > COOL_TOLERANCE;
}

/** Normaliza a `#RRGGBB` en mayúsculas para comparar con la whitelist. */
function normalizeHex(hex: string): string {
  let body = hex.slice(1);
  if (body.length === 3) body = body.split("").map((c) => c + c).join("");
  return `#${body.toUpperCase()}`;
}

function isCoolAllowed(hex: string, relPath: string): boolean {
  const norm = normalizeHex(hex);
  return COOL_ALLOWED.some((e) => e.hex.toUpperCase() === norm && e.file === relPath);
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FORBIDDEN_RE = new RegExp(FORBIDDEN.map(escapeRegExp).join("|"), "gi");

function isExcluded(relPath: string): boolean {
  return EXCLUDED_DIRS.some(
    (excluded) => relPath === excluded || relPath.startsWith(`${excluded}/`),
  );
}

/** Devuelve las rutas relativas a ROOT de todos los archivos escaneables. */
function collectFiles(target: string, out: string[] = []): string[] {
  if (isExcluded(target)) return out;
  const absolute = path.join(ROOT, target);
  if (!existsSync(absolute)) return out;

  if (statSync(absolute).isDirectory()) {
    for (const entry of readdirSync(absolute).sort()) {
      collectFiles(path.posix.join(target, entry), out);
    }
    return out;
  }

  if (EXTENSIONS.includes(path.extname(target))) out.push(target);
  return out;
}

/** `archivo:línea → match` por cada aparición de la paleta prohibida. */
function findViolations(): string[] {
  const violations: string[] = [];
  const files = SCAN_TARGETS.flatMap((target) => collectFiles(target));

  for (const relPath of files) {
    const lines = readFileSync(path.join(ROOT, relPath), "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const re of [FORBIDDEN_RE, FORBIDDEN_FONT]) {
        re.lastIndex = 0;
        for (const match of line.matchAll(re)) {
          violations.push(`${relPath}:${index + 1} → ${match[0]}`);
        }
      }
      // [GOAL-E4 #10] Flanco frío: cualquier hex con azul por encima del rojo.
      HEX_RE.lastIndex = 0;
      for (const match of line.matchAll(HEX_RE)) {
        const hex = match[0];
        if (!isCoolHex(hex) || isCoolAllowed(hex, relPath)) continue;
        violations.push(`${relPath}:${index + 1} → ${hex} (frío: azul > rojo, fuera de paleta)`);
      }
    });
  }

  return violations;
}

describe("paleta de marca (Brand Book V1.0)", () => {
  it("no queda ningún color de la paleta pre-rebrand en el producto", () => {
    const violations = findViolations();
    // El diff de este expect lista TODAS las violaciones: es el inventario del rebrand.
    expect(violations).toEqual([]);
  });
});

/* ============================================================================
   [PEDIDO DE ISAAC · 2026-08-09] Los colores SEMÁNTICOS del sistema, y SOLO esos.

   El sistema de color del producto es, por decisión del cliente:
     · NEGRO + BLANCO + grises  → dominantes (canvas, cards, y el CTA de acción:
       «Reemplaza más por negro con blanco… Unirse a una llamada y todo eso negro
       con blanco»);
     · VERDE (escala de --win)  → semántica de avance y de hecho: «Para completed -
       verde. Para progress bar - verde»;
     · NARANJA #F25623          → acento PUNTUAL (barra de 3px de los títulos de
       sección, canto de los héroes, chips de EN VIVO/TORNEO/HOY, avisos), nunca
       superficies grandes ni todos los botones;
     · ORO/PLATINO              → el metal del tier del Debate Hub.

   Este bloque es el contrato de los colores que NO son negro/gris/naranja. Cada uno:
     1) está declarado, con su valor exacto, en app/styles/tokens.css;
     2) su hex NO aparece en ningún otro archivo del producto (quien quiera el color
        lo consume por var(--…): así la excepción no se convierte en una barra libre
        de hexes por las pantallas);
     3) queda anotado el contraste MEDIDO que justifica cada valor (WCAG 2.1).

   Ni el negro ni el blanco necesitan token nuevo (--otr-black #171717 / #FFFFFF), y
   la derrota del Debate Hub se pinta con ese mismo negro de marca.
   ========================================================================== */
const ISAAC_TOKENS: Array<{ name: string; hex: string; contraste: string }> = [
  {
    name: "--win",
    hex: "#2FA84F",
    contraste: "letra negra #171717 encima → 5,83:1 (AA) · letra blanca 3,07:1 (por eso el texto sobre verde es negro)",
  },
  {
    name: "--success-strong",
    hex: "#1A7A38",
    contraste:
      "sobre blanco 5,41:1 · sobre el greige #F1F1EF 4,78:1 · sobre --success-soft 4,70:1 · " +
      "con letra blanca encima 5,41:1 · contra la pista de barra #EFEFEF 4,70:1 (1.4.11 pide 3:1)",
  },
  {
    name: "--success-soft",
    hex: "#E3F3E7",
    contraste: "con --success-strong encima 4,70:1 (AA) · con #171717 encima 15,57:1",
  },
  {
    name: "--tier-gold",
    hex: "#D4AF37",
    contraste: "letra negra encima → 8,53:1 · como texto sobre la card #171717 → 8,53:1",
  },
  {
    name: "--tier-platinum",
    hex: "#D6D5D1",
    contraste: "letra negra encima → 12,21:1 · como texto sobre la card #171717 → 12,21:1",
  },
];

describe("colores semánticos del sistema (pedido de Isaac, 2026-08-09)", () => {
  it("cada token está declarado en tokens.css con el valor medido", () => {
    const tokensCss = readFileSync(path.join(ROOT, "app/styles/tokens.css"), "utf8");
    for (const { name, hex } of ISAAC_TOKENS) {
      expect(tokensCss).toContain(`${name}:${hex}`);
    }
  });

  it("--success cuelga de --win: un solo verde raíz, no dos", () => {
    // La escala verde NO puede introducir un cuarto hex por la puerta de atrás: --success
    // ES --win. Si alguien lo redeclara con su propio valor, este test lo caza.
    const tokensCss = readFileSync(path.join(ROOT, "app/styles/tokens.css"), "utf8");
    expect(tokensCss).toContain("--success:var(--win)");
    expect(tokensCss).toContain("--ok:var(--success-strong)");
    expect(tokensCss).toContain("--ok-soft:var(--success-soft)");
  });

  it("los colores semánticos de Isaac no se escapan de tokens.css", () => {
    const files = SCAN_TARGETS.flatMap((target) => collectFiles(target));
    const fugas: string[] = [];
    for (const relPath of files) {
      if (relPath === "app/styles/tokens.css") continue;
      const lines = readFileSync(path.join(ROOT, relPath), "utf8").split("\n");
      lines.forEach((line, index) => {
        for (const { name, hex } of ISAAC_TOKENS) {
          if (line.toUpperCase().includes(hex.toUpperCase())) {
            fugas.push(`${relPath}:${index + 1} → ${hex} suelto (usa var(${name}))`);
          }
        }
      });
    }
    expect(fugas).toEqual([]);
  });

  it("la derrota se pinta con el NEGRO de marca, sin token nuevo", () => {
    const screens = readFileSync(path.join(ROOT, "app/styles/screens.css"), "utf8");
    expect(screens).toMatch(/\.form-sq--loss\{background:var\(--otr-black\)/);
  });
});
