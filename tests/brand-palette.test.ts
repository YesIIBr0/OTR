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
