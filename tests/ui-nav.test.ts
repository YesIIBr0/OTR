// [FE-TEST · UI-NAV] Organización de la navegación:
//   N1 · [MOCKUP T2, 2026-08-07] los grupos ("Mis programas", "Progreso") ya no son
//        desplegables del sidebar —el sidebar murió— sino cabeceras dentro del menú "Más"
//        de la top-nav. Debate Hub sigue fuera de "Principal"; los dos sub-tabs de Cursos
//        (Activos / Buscar nuevos) siguen siendo items propios. Los ítems y sus `data-go`
//        son EXACTAMENTE los mismos que tenía el sidebar.
//   N2 · MEMBRESÍA y SISTEMA no se listan en el nav: Perfil, Membresía, Ajustes y Salir
//        viven en el menú del chip de usuario.
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

/** El bloque del menú "Más" (lleva TODOS los ítems del rol, agrupados). */
const menuMas = (html: string) => html.slice(html.indexOf('class="tn-menu"'), html.indexOf("</details>"));

/* ================= N1 · los mismos ítems, ahora en la top-nav ================= */
describe("N1 · Mis programas es una sección del menú 'Más'", () => {
  it("el menú es un <details> nativo con su cabecera de grupo", () => {
    const html = shell();
    expect(html).toContain("<details class=\"tn-more");
    expect(html).toContain('class="tn-menu"');
    expect(menuMas(html)).toContain("Mis programas");
  });

  it("contiene los 6 destinos de aprender, Debate Hub incluido", () => {
    const html = shell();
    const grupo = menuMas(html).slice(menuMas(html).indexOf("Mis programas"), menuMas(html).indexOf("Progreso"));
    for (const r of ["course", "catalog", "explore", "listings", "debate", "messages"]) {
      expect(grupo, `"${r}" dentro de Mis programas`).toContain(`data-go="${r}"`);
    }
    expect(grupo).toContain("Activos");
    expect(grupo).toContain("Buscar nuevos");
    expect(grupo).toContain("Buscar coaches");
    expect(grupo).toContain("Buscar clases");
  });

  it("Debate Hub YA NO está en Principal", () => {
    const menu = menuMas(shell());
    const principal = menu.slice(menu.indexOf("Principal"), menu.indexOf("Mis programas"));
    expect(principal).toContain('data-go="dashboard"');
    expect(principal).toContain('data-go="events"');
    expect(principal).not.toContain('data-go="debate"');
  });

  it("la barra pinta 5 destinos de uso diario por rol, con etiquetas que se leen SUELTAS", () => {
    // El orden del NAV es de sidebar (agrupado); en la barra no hay cabeceras de grupo, así
    // que "Activos" (que solo se entendía bajo "Mis programas") no puede ser un link suelto.
    const links = (html: string) => html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
    const alumno = links(shell("dashboard"));
    expect([...alumno.matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]))
      .toEqual(["dashboard", "course", "events", "debate", "progress"]);
    expect(alumno).toContain("Cursos");        // etiqueta autónoma…
    expect(alumno).not.toContain("Activos");   // …en vez de la del sidebar
    // El coach ve su trabajo diario, no "Buscar coaches" (que es del alumno/padre).
    expect([...links(shell("teacher", "teacher")).matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]))
      .toEqual(["teacher", "coachwork", "manage", "my-listings", "participants"]);
  });

  it("si la ruta activa cayó en el excedente, sube a los links visibles (no se esconde dónde estás)", () => {
    // 'badges' es el último ítem del alumno: fuera de los 5 links de cabecera.
    const html = shell("badges");
    const links = html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
    expect(links).toContain('data-go="badges"');
    expect(links).toContain('class="tn-link active"');
  });
});

describe("N1 · Progreso es una sección del menú 'Más'", () => {
  it("agrupa trayectoria, niveles, asignaciones y logros", () => {
    const menu = menuMas(shell());
    const grupo = menu.slice(menu.indexOf("Progreso"));
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
  it("el nav ya no lista esos grupos como secciones sueltas", () => {
    const html = shell();
    const lista = html.slice(html.indexOf('class="tn-links"'), html.indexOf("</details>"));
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
      expect(shell(r), `${r} ilumina el chip`).toMatch(/class="tn-user active"/);
    }
    expect(shell("course")).not.toMatch(/class="tn-user active"/);
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
