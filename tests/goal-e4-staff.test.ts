// [GOAL-E4 · barrido familia+admin] Contratos que la revisión pidió blindar.
//
//   1 · admin-users — el nombre accesible de las acciones DESTRUCTIVAS nombra a la persona,
//       interpola sin que `String.replace` se coma los patrones `$…`, y SOBREVIVE al ciclo
//       armar → fallo de API → reposo (Important-1: el label en reposo se captura una sola vez).
//   2 · listings — el estado vacío culpa a la materia SOLO cuando hay materia o búsqueda.
//   3 · manage (admin) — la tarjeta de curso ofrece reasignar dueño y el handler hace el PATCH
//       con `teacherId`, refresca el modelo local y repinta (Important-2).
//
// Los builders son módulos "@ts-nocheck" que arman strings de HTML y enganchan handlers sobre
// un `root`; el repo corre en Node SIN DOM (ver vitest.config.ts), así que aquí se usa el mismo
// stub de window que screens.test.ts + un `root`/`button` mínimos hechos a mano.
import { describe, it, expect, beforeEach } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrFormModal = () => {};

import { DB } from "../app/lib/data";
import { S as SAdminUsers } from "../app/lib/scr-admin-users";
import { S as SListings } from "../app/lib/scr-listings";
import { S as SExtra } from "../app/lib/scr-extra";
import { t } from "../app/lib/i18n";

const AdminUsers: any = SAdminUsers;
const Listings: any = SListings;
const Extra: any = SExtra;

/* ---------------- DOM mínimo: lo justo que tocan los handlers ---------------- */
type Listener = () => void | Promise<void>;

class FakeEl {
  attrs: Record<string, string> = {};
  dataset: Record<string, string> = {};
  textContent = "";
  disabled = false;
  isConnected = true;
  listeners: Listener[] = [];
  constructor(attrs: Record<string, string> = {}, text = "") {
    this.attrs = { ...attrs };
    this.textContent = text;
  }
  getAttribute(k: string) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  setAttribute(k: string, v: string) { this.attrs[k] = String(v); }
  removeAttribute(k: string) { delete this.attrs[k]; }
  addEventListener(_type: string, fn: Listener) { this.listeners.push(fn); }
  async click() { for (const fn of this.listeners) await fn(); }
}

/** `root` que solo conoce el selector que le pasamos; todo lo demás vuelve vacío.
 *  addEventListener/contains existen porque los `mount` del repo delegan clicks en la raíz. */
function fakeRoot(map: Record<string, FakeEl[]>) {
  return {
    querySelector: (sel: string) => (map[sel] && map[sel][0]) || null,
    querySelectorAll: (sel: string) => map[sel] || [],
    addEventListener: () => {},
    contains: () => false,
  } as any;
}

beforeEach(() => {
  win.__adminUsers = { loaded: true, loading: false, users: [], total: 0, q: "", role: "", counts: null };
  win.__listings = { loaded: true, loading: false, error: false, items: [], total: 0, category: "", q: "" };
  win.toast = () => {};
  win.go = () => {};
});

describe("[E4] admin-users · nombre accesible de las acciones destructivas", () => {
  it("nombra a la persona en Suspender y en Borrar datos, y no repite el mismo label", () => {
    win.__adminUsers.users = [
      { id: "u-1", name: "Rosa Fermín", email: "rosa@otr.do", role: "PARENT" },
      { id: "u-2", name: "Carla Jiménez", email: "carla@otr.do", role: "TEACHER" },
    ];
    win.__adminUsers.total = 2;
    const html = AdminUsers.adminUsers.render({ role: "admin" });

    expect(html).toContain(`aria-label="Suspender a Rosa Fermín"`);
    expect(html).toContain(`aria-label="Borrar datos de Rosa Fermín"`);
    expect(html).toContain(`aria-label="Suspender a Carla Jiménez"`);
    // El texto VISIBLE sigue siendo corto (la fila ya nombra a la cuenta).
    expect(html).toContain(`>\n        ${t("au.suspend")}\n      </button>`);
  });

  it("interpola nombres con `&` sin que replace se coma el patrón $& (minor 4)", () => {
    // esc() convierte "AC&DC" en "AC&amp;DC"; con String.replace, el "$&" de la plantilla NO
    // existe pero el "&" del REEMPLAZO sí es especial → salía "Suspender a AC{name}amp;DC".
    win.__adminUsers.users = [{ id: "u-3", name: "AC$&DC", email: "acdc@otr.do", role: "STUDENT" }];
    win.__adminUsers.total = 1;
    const html = AdminUsers.adminUsers.render({ role: "admin" });

    expect(html).toContain(`aria-label="Suspender a AC$&amp;DC"`);
    expect(html).not.toContain("{name}");
  });

  it("el estado armado conserva el nombre tras un fallo de la API (Important-1)", async () => {
    const REST = "Borrar datos de Rosa Fermín";
    const btn = new FakeEl({ "data-user-erase": "u-1", "aria-label": REST }, t("au.erase"));
    const root = fakeRoot({ "[data-user-erase]": [btn] });
    win.api = async () => { throw new Error("boom"); };

    AdminUsers.adminUsers.mount(root, { role: "admin" });

    // 1er click: ARMA — el label acompaña al texto visible (si no, el lector anunciaría
    // "Borrar datos de Rosa Fermín" justo cuando la pantalla pide la confirmación).
    await btn.click();
    expect(btn.getAttribute("data-armed")).toBe("1");
    expect(btn.textContent).toBe(t("au.eraseArm"));
    expect(btn.getAttribute("aria-label")).toBe(t("au.eraseArm"));

    // 2º click: ejecuta y la API FALLA → vuelve a reposo. El label tiene que volver a nombrar
    // a la persona; antes se quedaba en "¿Seguro? Es irreversible…" (leído del DOM ya mutado).
    await btn.click();
    expect(btn.textContent).toBe(t("au.erase"));
    expect(btn.getAttribute("aria-label")).toBe(REST);
    expect(btn.disabled).toBe(false);

    // Y el ciclo se puede repetir sin degradarse.
    await btn.click();
    expect(btn.getAttribute("aria-label")).toBe(t("au.eraseArm"));
    await btn.click();
    expect(btn.getAttribute("aria-label")).toBe(REST);
  });
});

describe("[E4] listings · a quién culpa el estado vacío", () => {
  it('con "Todas" y sin búsqueda, copy genérico (no culpa a ninguna materia)', () => {
    win.__listings.category = "";
    win.__listings.q = "";
    const html = Listings.listings.render();
    expect(html).toContain(t("lst.emptyTitleAll"));
    expect(html).not.toContain(t("lst.emptyTitle"));
  });

  it("con una materia concreta, vuelve el copy de filtro", () => {
    win.__listings.category = "debate";
    const html = Listings.listings.render();
    expect(html).toContain(t("lst.emptyTitle"));
    expect(html).not.toContain(t("lst.emptyTitleAll"));
  });

  it("con búsqueda y sin materia, también es un filtro: copy de filtro", () => {
    win.__listings.q = "inglés";
    const html = Listings.listings.render();
    expect(html).toContain(t("lst.emptyTitle"));
  });
});

describe("[E4] manage (admin) · listado con dueño y reasignación", () => {
  beforeEach(() => {
    DB.adminCourses = [
      { id: "c-1", code: "PF-101", name: "Public Forum I", color: "#171717", published: true, format: "PF", modality: "online", ownerId: "u-saul", ownerName: "Saúl Méndez", moduleCount: 3, lessonCount: 10 },
    ];
  });

  it("pinta el catálogo con eyebrow de administración, el dueño y el control de reasignar", () => {
    const html = Extra.manage.render({ role: "admin" });
    expect(html).toContain(t("extra.eyebrowAdmin"));
    expect(html).toContain("Saúl Méndez");
    expect(html).toContain('data-reassign-course="c-1"');
    expect(html).toContain('data-owner-id="u-saul"');
    // Sigue siendo vista de lectura: nada de construir/eliminar sobre cursos ajenos.
    expect(html).not.toContain("data-go-builder");
    expect(html).not.toContain("data-del=");
  });

  it("reasignar hace PATCH con teacherId, refresca el modelo local y repinta", async () => {
    const calls: any[] = [];
    // [DEUDA-H] La lista se compone de DOS páginas (TEACHER+COACH y ADMIN) y se filtra por rol
    // real contra OWNER_ROLES, así que el doble devuelve `role` como lo hace la API de verdad.
    win.api = async (url: string, body: any, method: string) => {
      calls.push({ url, body, method });
      if (url === "/api/admin/users?role=TEACHER") return { users: [{ id: "u-saul", name: "Saúl Méndez", role: "TEACHER" }, { id: "u-carla", name: "Carla Jiménez", role: "TEACHER" }] };
      if (url === "/api/admin/users?role=ADMIN") return { users: [] };
      return { ok: true };
    };
    let repainted = "";
    win.go = (r: string) => { repainted = r; };
    // El modal se sustituye por un doble que elige al SEGUNDO coach y ejecuta el submit.
    let modalTitle = "";
    let options: any[] = [];
    win.otrFormModal = async (title: string, fields: any[], onSubmit: (v: any) => Promise<void>) => {
      modalTitle = title;
      options = fields[0].options;
      await onSubmit({ teacherId: "u-carla" });
    };

    const btn = new FakeEl({ "data-reassign-course": "c-1", "data-owner-id": "u-saul", "data-course-name": "Public Forum I" });
    Extra.manage.mount(fakeRoot({ "[data-reassign-course]": [btn] }));
    await btn.click();

    expect(modalTitle).toContain("Public Forum I");
    expect(options.map((o) => o.value)).toEqual(["u-saul", "u-carla"]);
    // GET de las dos páginas de dueños elegibles primero, PATCH del curso después.
    expect(calls.slice(0, 2).map((c) => c.url).sort()).toEqual(["/api/admin/users?role=ADMIN", "/api/admin/users?role=TEACHER"]);
    expect(calls[2]).toMatchObject({ url: "/api/courses/c-1", body: { teacherId: "u-carla" }, method: "PATCH" });
    // Modelo local al día + repintado de la misma ruta.
    expect(DB.adminCourses[0].ownerName).toBe("Carla Jiménez");
    expect(DB.adminCourses[0].ownerId).toBe("u-carla");
    expect(repainted).toBe("manage");
  });

  it("si el dueño elegido es el actual, no llama al PATCH", async () => {
    const calls: any[] = [];
    win.api = async (url: string, body: any, method: string) => {
      calls.push({ url, body, method });
      return { users: url === "/api/admin/users?role=ADMIN" ? [] : [{ id: "u-saul", name: "Saúl Méndez", role: "TEACHER" }] };
    };
    win.otrFormModal = async (_t: string, _f: any[], onSubmit: (v: any) => Promise<void>) => { await onSubmit({ teacherId: "u-saul" }); };

    const btn = new FakeEl({ "data-reassign-course": "c-1", "data-owner-id": "u-saul", "data-course-name": "Public Forum I" });
    Extra.manage.mount(fakeRoot({ "[data-reassign-course]": [btn] }));
    await btn.click();

    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(0);
  });
});
