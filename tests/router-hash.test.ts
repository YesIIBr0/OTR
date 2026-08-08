import { describe, it, expect } from "vitest";
import { ROUTES } from "../app/lib/screens";
import {
  routeToHash,
  parseHash,
  resolveHashRoute,
  defaultRouteForRole,
  isRouteAllowed,
} from "../app/lib/router";

// [ROUTER-HASH] El SPA de /aula navegaba con window.go() puro: la URL NUNCA cambiaba, así
// que no había deep-link, ni Atrás/Adelante, ni F5 estable. El fix mete el hash como FUENTE
// DE VERDAD de la ruta; esta suite fija el contrato PURO ruta↔hash (sin DOM, sin window).

describe("routeToHash()", () => {
  it("serializa una ruta simple", () => {
    expect(routeToHash("dashboard")).toBe("#dashboard");
    expect(routeToHash("events")).toBe("#events");
  });

  it("respeta las llaves con guion (no las trocea)", () => {
    expect(routeToHash("admin-users")).toBe("#admin-users");
    expect(routeToHash("quiz-results")).toBe("#quiz-results");
    expect(routeToHash("my-listings")).toBe("#my-listings");
  });

  it("serializa la ruta con parámetro como #ruta/param", () => {
    expect(routeToHash("lesson", "L-101")).toBe("#lesson/L-101");
    expect(routeToHash("listing", "lst_7")).toBe("#listing/lst_7");
  });

  it("ignora un parámetro vacío", () => {
    expect(routeToHash("lesson", "")).toBe("#lesson");
    expect(routeToHash("lesson", undefined)).toBe("#lesson");
  });

  it("codifica un parámetro con caracteres reservados", () => {
    expect(routeToHash("lesson", "a b/c")).toBe("#lesson/a%20b%2Fc");
  });
});

describe("parseHash()", () => {
  it("lee una ruta válida con y sin '#'", () => {
    expect(parseHash("#events")).toEqual({ route: "events", param: "" });
    expect(parseHash("events")).toEqual({ route: "events", param: "" });
  });

  it("lee la ruta con parámetro y lo decodifica", () => {
    expect(parseHash("#lesson/L-101")).toEqual({ route: "lesson", param: "L-101" });
    expect(parseHash("#lesson/a%20b")).toEqual({ route: "lesson", param: "a b" });
  });

  it("devuelve null para un hash que NO es una ruta", () => {
    // #content es el ancla del skip-link del shell: no debe navegar a ningún lado.
    expect(parseHash("#content")).toBeNull();
    expect(parseHash("#no-existe")).toBeNull();
    expect(parseHash("#")).toBeNull();
    expect(parseHash("")).toBeNull();
    expect(parseHash("#Dashboard")).toBeNull(); // las llaves son minúsculas y estrictas
  });

  it("ida y vuelta para TODAS las rutas registradas", () => {
    for (const key of Object.keys(ROUTES)) {
      expect(parseHash(routeToHash(key))).toEqual({ route: key, param: "" });
    }
  });
});

describe("defaultRouteForRole()", () => {
  it("da el home de cada rol", () => {
    expect(defaultRouteForRole("student")).toBe("dashboard");
    expect(defaultRouteForRole("teacher")).toBe("teacher");
    expect(defaultRouteForRole("parent")).toBe("parent");
    expect(defaultRouteForRole("admin")).toBe("admin");
  });

  it("cae a dashboard con un rol desconocido", () => {
    expect(defaultRouteForRole("marciano")).toBe("dashboard");
  });

  it("cada home es una ruta REAL y permitida para su rol", () => {
    for (const role of ["student", "teacher", "parent", "admin"]) {
      const home = defaultRouteForRole(role);
      expect(ROUTES[home]).toBeTruthy();
      expect(isRouteAllowed(home, role)).toBe(true);
    }
  });
});

describe("isRouteAllowed()", () => {
  it("las rutas sin rol declarado son de todos", () => {
    expect(isRouteAllowed("dashboard", "student")).toBe(true);
    expect(isRouteAllowed("events", "parent")).toBe(true);
  });

  it("respeta el rol único", () => {
    expect(isRouteAllowed("teacher", "teacher")).toBe(true);
    expect(isRouteAllowed("teacher", "student")).toBe(false);
    expect(isRouteAllowed("admin-users", "admin")).toBe(true);
    expect(isRouteAllowed("admin-users", "teacher")).toBe(false);
  });

  it("respeta la lista de roles", () => {
    expect(isRouteAllowed("manage", "teacher")).toBe(true);
    expect(isRouteAllowed("manage", "admin")).toBe(true);
    expect(isRouteAllowed("manage", "student")).toBe(false);
  });

  it("una ruta inexistente no está permitida para nadie", () => {
    expect(isRouteAllowed("no-existe", "admin")).toBe(false);
  });
});

describe("resolveHashRoute()", () => {
  it("abre la ruta del hash cuando es válida para el rol (deep-link / F5)", () => {
    expect(resolveHashRoute("#course", "student")).toBe("course");
    expect(resolveHashRoute("#events", "student")).toBe("events");
    expect(resolveHashRoute("#participants", "teacher")).toBe("participants");
  });

  it("un hash desconocido cae al home del rol", () => {
    expect(resolveHashRoute("#no-existe", "student")).toBe("dashboard");
    expect(resolveHashRoute("#content", "teacher")).toBe("teacher");
    expect(resolveHashRoute("", "admin")).toBe("admin");
  });

  it("una ruta de otro rol cae al home del rol (sin pintar UI ajena)", () => {
    expect(resolveHashRoute("#teacher", "student")).toBe("dashboard");
    expect(resolveHashRoute("#admin-metrics", "student")).toBe("dashboard");
    expect(resolveHashRoute("#my-listings", "parent")).toBe("parent");
  });

  it("conserva la ruta cuando el hash trae parámetro", () => {
    expect(resolveHashRoute("#lesson/L-101", "student")).toBe("lesson");
  });
});
