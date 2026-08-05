// [FE-TEST · UI-NAV] Reorganización del sidebar pedida sobre las capturas:
//   N1 · "Mis programas" y "Progreso" son DESPLEGABLES (grupos colapsables con chevron).
//        Debate Hub baja de "Principal" a "Mis programas"; los dos sub-tabs de Cursos
//        (Activos / Buscar nuevos) se promueven a items del nav.
//   N2 · MEMBRESÍA y SISTEMA salen del sidebar: Perfil, Membresía, Ajustes y Salir
//        viven en el menú del chip de usuario (abajo).
//
// Además fija la INVARIANTE que evita destinos huérfanos: todo item de nav de todo rol
// apunta a una ruta que existe, y toda ruta con nav tiene quien la ilumine.
import { describe, it, expect } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { renderShell, type Role } from "../app/lib/shell";
import { ROUTES } from "../app/lib/screens";

Object.assign(DB, {
  me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor" },
  messages: [], notifications: [],
});

const shell = (activeNav = "course", role: Role = "student") =>
  renderShell(activeNav, ["Cursos"], "<div></div>", role);

/** Rutas que un `data-go` del sidebar declara (sin las del contenido de la página). */
function navRoutes(html: string): string[] {
  return [...html.matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]);
}

/* ================= N1 · desplegables ================= */
describe("N1 · Mis programas es un desplegable", () => {
  it("el grupo es un botón colapsable con chevron y estado accesible", () => {
    const html = shell();
    expect(html).toContain('data-nav-toggle="programs"');
    expect(html).toMatch(/aria-expanded="(true|false)"/);
    expect(html).toContain('id="sbg-programs"');
    expect(html).toContain("Mis programas");
  });

  it("contiene los 6 destinos de aprender, Debate Hub incluido", () => {
    const html = shell();
    const grupo = html.slice(html.indexOf('id="sbg-programs"'), html.indexOf('data-nav-toggle="progress"'));
    for (const r of ["course", "catalog", "explore", "listings", "debate", "messages"]) {
      expect(grupo, `"${r}" dentro de Mis programas`).toContain(`data-go="${r}"`);
    }
    expect(grupo).toContain("Activos");
    expect(grupo).toContain("Buscar nuevos");
    expect(grupo).toContain("Buscar coaches");
    expect(grupo).toContain("Buscar clases");
  });

  it("Debate Hub YA NO está en Principal (se movió al desplegable)", () => {
    const html = shell();
    const principal = html.slice(html.indexOf("sb-nav"), html.indexOf('data-nav-toggle="programs"'));
    expect(principal).toContain('data-go="dashboard"');
    expect(principal).toContain('data-go="events"');
    expect(principal).not.toContain('data-go="debate"');
  });

  it("el grupo que contiene la ruta activa se abre solo (no se esconde donde estás)", () => {
    const enCursos = shell("course");
    const abierto = enCursos.slice(enCursos.indexOf('data-nav-toggle="programs"'));
    expect(abierto.slice(0, 200)).toContain('aria-expanded="true"');
  });
});

describe("N1 · Progreso es un desplegable", () => {
  it("agrupa trayectoria, niveles, asignaciones y logros", () => {
    const html = shell();
    const grupo = html.slice(html.indexOf('id="sbg-progress"'), html.indexOf("sb-foot"));
    for (const r of ["lifetime", "progress", "grades", "badges"]) {
      expect(grupo, `"${r}" dentro de Progreso`).toContain(`data-go="${r}"`);
    }
    expect(grupo).toContain("Trayectoria");
    expect(grupo).toContain("Niveles");
    expect(grupo).toContain("Asignaciones");
    expect(grupo).toContain("Logros");
  });
});

/* ================= N2 · Membresía y Sistema al perfil ================= */
describe("N2 · el chip de usuario reemplaza a MEMBRESÍA y SISTEMA", () => {
  it("el sidebar ya no lista esos grupos como secciones sueltas", () => {
    const html = shell();
    const lista = html.slice(html.indexOf("sb-nav"), html.indexOf("sb-foot"));
    expect(lista).not.toContain('data-go="membership"');
    expect(lista).not.toContain('data-go="settings"');
    expect(lista).not.toContain('data-action="logout"');
  });

  it("el menú del chip ofrece Perfil, Membresía, Ajustes y Salir", () => {
    const html = shell();
    const menu = html.slice(html.indexOf('id="sb-usermenu"'));
    expect(menu).toContain('data-go="profile"');
    expect(menu).toContain('data-go="membership"');
    expect(menu).toContain('data-go="settings"');
    expect(menu).toContain('data-action="logout"');
    expect(html).toContain("data-user-menu");
  });

  it("el profesor no ve Membresía (no es su producto) pero sí Ajustes y Salir", () => {
    const html = shell("teacher", "teacher");
    const menu = html.slice(html.indexOf('id="sb-usermenu"'));
    expect(menu).not.toContain('data-go="membership"');
    expect(menu).toContain('data-go="settings"');
    expect(menu).toContain('data-action="logout"');
  });

  it("estando en Membresía/Ajustes/Perfil el chip se marca activo (no queda destino huérfano)", () => {
    for (const r of ["membership", "settings", "profile"]) {
      expect(shell(r), `${r} ilumina el chip`).toMatch(/class="sb-user active"/);
    }
    expect(shell("course")).not.toMatch(/class="sb-user active"/);
  });
});

/* ================= INVARIANTE · sin destinos rotos ================= */
describe("invariante · ningún item del nav apunta a una ruta inexistente", () => {
  const ROLES: Role[] = ["student", "teacher", "parent", "admin"];
  for (const role of ROLES) {
    it(`rol ${role}: todo data-go del shell resuelve en ROUTES`, () => {
      const rotos = navRoutes(shell("dashboard", role))
        .filter((r) => r !== "#" && !(ROUTES as any)[r]);
      expect(rotos, `rutas inexistentes en el nav de ${role}`).toEqual([]);
    });
  }
});
