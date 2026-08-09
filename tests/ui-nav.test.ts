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
import { readFileSync } from "node:fs";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};

import { DB } from "../app/lib/data";
import { renderShell, type Role } from "../app/lib/shell";
import { ROUTES } from "../app/lib/screens";
import { t } from "../app/lib/i18n";

Object.assign(DB, {
  me: { name: "Analía Reyes", initials: "AR", role: "student", level: "OTR Competitor" },
  messages: [], notifications: [],
});

/** Renderiza con la cookie de idioma puesta (getLang lee document.cookie). */
function withLang<T>(lang: string, fn: () => T): T {
  const prev = (globalThis as any).document;
  (globalThis as any).document = { cookie: `otr_lang=${lang}` };
  try { return fn(); } finally {
    if (prev === undefined) delete (globalThis as any).document;
    else (globalThis as any).document = prev;
  }
}

const shell = (activeNav = "course", role: Role = "student") =>
  renderShell(activeNav, ["Cursos"], "<div></div>", role);

/** Rutas que un `data-go` del sidebar declara (sin las del contenido de la página). */
function navRoutes(html: string): string[] {
  return [...html.matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]);
}

/** El bloque del menú "Más" (lleva TODOS los ítems del rol, agrupados).
    [RONDA 3] La barra tiene DOS <details class="tn-more"> —el desplegable de grupo
    "Progreso" y "Más"—, así que el corte se ancla al id del segundo en vez de a la primera
    aparición de `class="tn-menu"` / `</details>`, que ahora son las del desplegable. */
const menuMas = (html: string) => {
  const i = html.indexOf('id="tn-more"');
  return html.slice(i, html.indexOf("</details>", i));
};

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
    // [RONDA 3] 'progress' ya no es un link suelto: ocupa el 5º hueco como DESPLEGABLE
    // ("Progreso" → Rangos · Logros), que se comprueba en su propio bloque más abajo.
    const alumno = links(shell("dashboard"));
    expect([...alumno.matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]))
      .toEqual(["dashboard", "course", "events", "debate"]);
    expect(alumno).toContain("Cursos");        // etiqueta autónoma…
    expect(alumno).not.toContain("Activos");   // …en vez de la del sidebar
    // El coach ve su trabajo diario, no "Buscar coaches" (que es del alumno/padre).
    expect([...links(shell("teacher", "teacher")).matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]))
      .toEqual(["teacher", "coachwork", "manage", "my-listings", "participants"]);
  });

  it("si la ruta activa cayó en el excedente, la marca la lleva 'Más' — la barra NO crece", () => {
    // [SONDEO 2026-08-09 · R4] Este test decía lo contrario ("sube a los links visibles"): esa
    // era la inyección que Isaac reportó como defecto ("¿por qué se abre otra pestaña
    // arriba?"). Sigue sin esconderse dónde estás — pero el que se ilumina es el CONTENEDOR.
    const html = shell("explore");
    const links = html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
    expect(links, "'Buscar coaches' abrió una pestaña nueva en la barra").not.toContain('data-go="explore"');
    // el disparador de "Más" queda marcado (clase + aria-current), y dentro el ítem activo
    expect(html).toContain('<details class="tn-more active" id="tn-more">');
    expect(html).toMatch(/<summary aria-label="Más" aria-current="true"/);
    expect(menuMas(html)).toMatch(/class="tn-mi active"[^>]*data-go="explore" aria-current="page"/);
  });
});

/* ================= SONDEO 2026-08-09 · R4 · la barra no crece con NINGÚN destino =========
   Isaac lo reportó primero con "find New" (#catalog, cerrado en R3 cambiando su nav a
   'course' porque el catálogo SÍ es un sub-tab de Cursos). El sondeo encontró que seguía
   pasando con "Buscar coaches" (#explore) y "Buscar clases" (#listings). Con esas dos NO se
   podía repetir la receta de 'catalog': para el PADRE son secciones propias y legítimas —dos
   de sus cuatro links— y `nav` es por RUTA, no por rol, así que repuntarlas habría dejado la
   barra del padre sin nada activo. La respuesta va en el shell: el excedente marca su
   contenedor. ======================================================================== */
describe("R4 · entrar en un destino del excedente NO añade una pestaña a la barra", () => {
  const links = (html: string) => html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
  const dests = (html: string) => [...links(html).matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]);

  // La barra de cada rol: los mismos destinos SIEMPRE, se esté donde se esté.
  const BARRA: Record<Role, string[]> = {
    student: ["dashboard", "course", "events", "debate"],
    teacher: ["teacher", "coachwork", "manage", "my-listings", "participants"],
    parent:  ["parent", "explore", "listings", "membership"],
    admin:   ["admin", "admin-users", "admin-metrics", "manage", "events"],
  };

  it("los 4 roles: 'explore', 'listings' y 'catalog' dejan la barra EXACTAMENTE igual", () => {
    for (const role of ["student", "teacher", "parent", "admin"] as const) {
      const base = BARRA[role];
      for (const nav of [ROUTES.explore.nav, ROUTES.listings.nav, ROUTES.catalog.nav]) {
        expect(dests(shell(nav, role)), `rol ${role} en '${nav}': la barra cambió`).toEqual(base);
      }
    }
  });

  it("el PADRE sí las tiene como sección propia: se marcan ELLAS, no 'Más'", () => {
    // Prueba de que 'explore'/'listings' NO podían resolverse repuntando su `nav`.
    for (const nav of ["explore", "listings"]) {
      const html = shell(nav, "parent");
      expect(links(html)).toMatch(new RegExp(`class="tn-link active"[^>]*data-go="${nav}"`));
      expect(html).not.toContain('<details class="tn-more active"');
    }
  });

  it("el ALUMNO las alcanza desde 'Más', que queda iluminado (no se esconde dónde estás)", () => {
    for (const nav of ["explore", "listings"]) {
      const html = shell(nav, "student");
      expect(html, `alumno en '${nav}': 'Más' sin marcar`).toContain('<details class="tn-more active" id="tn-more">');
      expect(menuMas(html)).toMatch(new RegExp(`class="tn-mi active"[^>]*data-go="${nav}" aria-current="page"`));
    }
  });

  it("lo que ya tiene marca FIJA no ilumina además 'Más' (ni Mensajes ni el chip)", () => {
    // 'messages' la marca el icono de la derecha; 'profile' lo marca el chip de usuario.
    for (const [nav, role] of [["messages", "student"], ["profile", "teacher"]] as const) {
      expect(shell(nav, role), `'${nav}' duplicó la marca en 'Más'`).not.toContain('<details class="tn-more active"');
    }
    expect(shell("messages", "student")).toMatch(/class="tn-icon active" id="tn-messages"/);
    expect(shell("profile", "teacher")).toContain('class="tn-user active"');
  });

  it("el CSS le da al 'Más' activo el mismo lenguaje que al link activo, sin tocar 'Progreso'", () => {
    const css = readFileSync(new URL("../app/styles/app.css", import.meta.url), "utf8");
    expect(css).toContain("#tn-more.active > summary{background:var(--bg-sunken);color:var(--otr-black);font-weight:700}");
    // por ID: el desplegable de grupo comparte la clase .tn-more y conserva SU marca
    expect(css).toContain(".tn-more.tn-nav.active > summary{font-weight:700;color:var(--otr-black)}");
  });
});

/* ================= RONDA 3 · reorganización de la barra (feedback de Isaac) =========
   1 · "agrega al menú arriba «progress» y que sea un dropdown que dentro tenga «Levels
        - reemplazando por → Ranks» y también tenga «Achievements». borra esos dos"
   2 · "Reemplaza el icono de notificaciones y haz eso Messages"
   3 · del menú "Más": fuera "Journey"/"Trayectoria" y "Assignments"/"Asignaciones"
   4 · BUG "en «find New» ¿por qué se abre otra pestaña arriba? Debería ser en el mismo" */

/** El desplegable de grupo de la barra (el PRIMER <details class="tn-more">, sin id). */
const dropProgreso = (html: string) => {
  const i = html.indexOf('<details class="tn-more tn-nav');
  return i < 0 ? "" : html.slice(i, html.indexOf("</details>", i));
};

describe("R3-1 · 'Progreso' es un DESPLEGABLE de la barra con Rangos + Logros", () => {
  it("el disparador existe, se llama Progreso/Progress y es un <details> como 'Más'", () => {
    const es = dropProgreso(shell());
    expect(es, "falta el desplegable de grupo en la barra").not.toBe("");
    expect(es).toContain('<summary aria-label="Progreso">');
    expect(es).toContain('<span class="tn-lbl">Progreso</span>');
    // Comparte la clase .tn-more a propósito: el Escape de Aula.tsx selecciona por ella.
    expect(es).toContain('class="tn-more tn-nav');
  });

  it("dentro están SUS DOS destinos y solo esos: Rangos y Logros", () => {
    const d = dropProgreso(shell());
    expect(d).toContain('data-go="progress"');
    expect(d).toContain('data-go="badges"');
    expect(d).toContain("Rangos");
    expect(d).toContain("Logros");
    expect([...d.matchAll(/data-go="([^"]+)"/g)].map((m) => m[1])).toEqual(["progress", "badges"]);
  });

  it("«Levels» pasó a «Ranks»: misma ruta 'progress', nombre nuevo en ES y EN", () => {
    expect(t("nav.progress", "es")).toBe("Rangos");
    expect(t("nav.progress", "en")).toBe("Ranks");
    const en = withLang("en", () => dropProgreso(shell()));
    expect(en).toContain('<span class="tn-lbl">Progress</span>');
    expect(en).toContain("Ranks");
    expect(en).toContain("Achievements");
  });

  it("estando en una de sus pantallas el disparador se marca activo (y el enlace, aria-current)", () => {
    for (const r of ["progress", "badges"]) {
      const d = dropProgreso(shell(r));
      expect(d, `${r} ilumina el disparador`).toContain('class="tn-more tn-nav active"');
      expect(d).toContain('aria-current="true"');
      expect(d).toMatch(new RegExp(`class="tn-mi active"[^>]*data-go="${r}" aria-current="page"`));
    }
    expect(dropProgreso(shell("dashboard"))).not.toContain("tn-nav active");
  });

  it("'Niveles/Levels' ya NO es un link suelto de la barra", () => {
    const links = (html: string) => html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
    expect(links(shell("dashboard"))).not.toContain('data-go="progress"');
    expect(links(shell("dashboard"))).not.toContain("Niveles");
  });
});

describe("R3-2 · el tile de la derecha es MENSAJES, no la campana", () => {
  it("es un enlace a #messages con nombre accesible bilingüe", () => {
    const html = shell();
    expect(html).toContain('id="tn-messages"');
    expect(html).toMatch(/<a class="tn-icon[^"]*" id="tn-messages" href="#messages" data-go="messages" aria-label="Mensajes"/);
    expect(withLang("en", () => shell())).toContain('aria-label="Messages"');
    // ya no hay un <button id="bell"> en el bloque derecho
    expect(html.slice(html.indexOf('class="tn-right"'))).not.toContain('id="bell"');
  });

  it("el contador es el de MENSAJES sin leer, con el dato real (y calla si no hay)", () => {
    expect(shell()).not.toContain("bell-count");               // DB.messages = []
    (DB as any).messages = [{ unread: 3 }, { unread: 2 }, { unread: 0 }];
    expect(shell()).toContain('<span class="bell-count">5</span>');
    (DB as any).messages = [];
  });

  it("estando en Mensajes el activo lo marca el ICONO, y la ruta no se inyecta como link", () => {
    const html = shell("messages");
    expect(html).toMatch(/class="tn-icon active" id="tn-messages"[^>]*aria-current="page"/);
    const links = html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
    expect(links, "'Mensajes' duplicado: icono + link").not.toContain('data-go="messages"');
  });

  it("las notificaciones NO quedan huérfanas: su disparador se muda al menú 'Más'", () => {
    (DB as any).notifications = [{ unread: true }, { unread: true }, { unread: false }];
    const menu = menuMas(shell());
    // mismo id → mismo handler de Aula.tsx; es un <button> porque abre un panel, no navega
    expect(menu).toMatch(/<button type="button" class="tn-mi" id="bell"/);
    expect(menu).toContain("Notificaciones");
    expect(menu).toContain('<span class="tn-count">2</span>');
    (DB as any).notifications = [];
  });
});

describe("R3-3 · 'Journey' y 'Assignments' salen del nav", () => {
  it("ni en la barra, ni en 'Más', ni en el desplegable, en ningún rol", () => {
    for (const role of ["student", "teacher", "parent", "admin"] as const) {
      const html = shell("dashboard", role);
      const barra = html.slice(html.indexOf('class="tn-links"'), html.indexOf('class="tn-right"'));
      expect(barra, `rol ${role}: sigue 'lifetime'`).not.toContain('data-go="lifetime"');
      expect(barra, `rol ${role}: sigue 'grades'`).not.toContain('data-go="grades"');
    }
  });

  it("el grupo 'Progreso' de 'Más' queda con Rangos y Logros (respaldo móvil)", () => {
    const menu = menuMas(shell());
    const grupo = menu.slice(menu.indexOf("Progreso"));
    expect(grupo).toContain('data-go="progress"');
    expect(grupo).toContain('data-go="badges"');
    expect(grupo).toContain("Rangos");
    expect(grupo).toContain("Logros");
    expect(grupo).not.toContain("Trayectoria");
    expect(grupo).not.toContain("Asignaciones");
  });

  it("el tabbar móvil tampoco deja 'Trayectoria' suelta (sería el mapa partido en dos)", () => {
    const tb = shell("dashboard").slice(shell("dashboard").indexOf('class="tabbar'));
    expect(tb).not.toContain('data-go="lifetime"');
    expect(tb).toContain('data-go="progress"');
  });

  it("'Más' conserva el resto: Cursos, Buscar nuevos, Buscar clases, coaches y Mensajes", () => {
    const menu = menuMas(shell());
    for (const r of ["dashboard", "events", "course", "catalog", "explore", "listings", "debate", "messages"]) {
      expect(menu, `"${r}" sigue en Más`).toContain(`data-go="${r}"`);
    }
  });
});

describe("R3-4 · el catálogo es un SUB-TAB de Cursos: no añade entrada al nav", () => {
  it("la ruta 'catalog' ilumina 'Cursos' (nav:'course'), no un destino propio", () => {
    expect(ROUTES.catalog.nav).toBe("course");
  });

  it("estando en el catálogo la barra pinta los MISMOS 4 links, con Cursos activo", () => {
    const links = (html: string) => html.slice(html.indexOf('class="tn-links"'), html.indexOf("<details"));
    const enCatalogo = links(shell(ROUTES.catalog.nav));
    expect([...enCatalogo.matchAll(/data-go="([^"]+)"/g)].map((m) => m[1]))
      .toEqual(["dashboard", "course", "events", "debate"]);
    expect(enCatalogo).not.toContain("Buscar nuevos");
    expect(enCatalogo).toMatch(/class="tn-link active"[^>]*data-go="course"/);
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
