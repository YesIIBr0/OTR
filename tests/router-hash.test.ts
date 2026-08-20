import { describe, it, expect } from "vitest";
import { ROUTES } from "../app/lib/screens";
import {
  routeToHash,
  parseHash,
  resolveHashRoute,
  defaultRouteForRole,
  isRouteAllowed,
  isInPageAnchor,
  routeNeedsContext,
  contextFallbackRoute,
  CONTEXT_PARENT,
  CONTEXT_PARAM,
  contextGlobalFor,
  contextParamIsValid,
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

// [post-revisión · Critical-1] En runtime hay que distinguir ANCLA IN-PAGE de RUTA: el propio
// producto usa anclas nativas (skip-link #content en shell.ts, índice de lección #s1/#s2/#s3 en
// scr-core.ts). Un hashchange de ancla NO es navegación; uno de ruta SIEMPRE repinta (aunque
// sea la ruta actual: ese es el refresco tras mutación de go('events') & co.).
describe("isInPageAnchor()", () => {
  it("reconoce las anclas nativas del propio producto", () => {
    expect(isInPageAnchor("#content")).toBe(true); // skip-link (shell.ts)
    expect(isInPageAnchor("#s1")).toBe(true);      // índice de lección (scr-core.ts)
    expect(isInPageAnchor("#s2")).toBe(true);
    expect(isInPageAnchor("#s3")).toBe(true);
  });

  it("una RUTA no es un ancla", () => {
    expect(isInPageAnchor("#events")).toBe(false);
    expect(isInPageAnchor("#admin-users")).toBe(false);
    expect(isInPageAnchor("#lesson/L-101")).toBe(false);
  });

  it("el hash vacío no es un ancla (no hay a dónde saltar)", () => {
    expect(isInPageAnchor("")).toBe(false);
    expect(isInPageAnchor("#")).toBe(false);
  });
});

// [post-revisión · Important-1] Pantallas cuyo render depende de una global fijada justo antes
// de navegar (window.__lesson/__listing/__cert/__room). Ese contexto no viaja en la URL: al
// volver con Atrás o recargar se pintaría el ítem de otra visita → se cae al padre.
describe("contexto de pantalla (CONTEXT_PARENT)", () => {
  it("marca las pantallas que dependen de una global", () => {
    for (const r of ["lesson", "assignment", "player", "quiz", "quiz-results", "listing", "certificate", "room"]) {
      expect(routeNeedsContext(r)).toBe(true);
    }
  });

  it("NO marca las pantallas que se bastan solas", () => {
    // course-builder recupera su id de sessionStorage y course-index/search caen a un
    // estado propio: marcarlas rompería una recuperación que HOY funciona.
    for (const r of ["dashboard", "course", "events", "listings", "badges", "course-builder", "course-index", "search", "profile"]) {
      expect(routeNeedsContext(r)).toBe(false);
    }
  });

  it("cada pantalla con contexto cae en el padre de SU sección", () => {
    expect(contextFallbackRoute("lesson", "student")).toBe("course");
    expect(contextFallbackRoute("assignment", "student")).toBe("course");
    expect(contextFallbackRoute("player", "student")).toBe("course");
    expect(contextFallbackRoute("quiz", "student")).toBe("course");
    expect(contextFallbackRoute("quiz-results", "student")).toBe("course");
    expect(contextFallbackRoute("listing", "student")).toBe("listings");
    expect(contextFallbackRoute("listing", "parent")).toBe("listings");
    expect(contextFallbackRoute("certificate", "student")).toBe("badges");
  });

  it("sin padre natural cae al home del rol", () => {
    // 'room' no tiene sección en el nav (nav:''), así que su fallback es el home.
    expect(contextFallbackRoute("room", "student")).toBe("dashboard");
    expect(contextFallbackRoute("room", "teacher")).toBe("teacher");
    expect(contextFallbackRoute("room", "admin")).toBe("admin");
  });

  it("todo padre declarado es una ruta REAL y no necesita contexto él mismo", () => {
    for (const [route, parent] of Object.entries(CONTEXT_PARENT)) {
      expect(ROUTES[route]).toBeTruthy();
      if (parent) {
        expect(ROUTES[parent]).toBeTruthy();
        expect(routeNeedsContext(parent)).toBe(false); // sin cadenas de fallback
      }
    }
  });
});

/* ===== SONDEO 2026-08-09 · R4 · el curso VIAJA en el hash =================================
   "F5 en una clase pierde la clase": #course-detail dependía solo de window.__course, así que
   recargar (o abrir el enlace en frío) caía al menú "Mis clases". Ahora el código del curso se
   serializa en el hash (#course-detail/PF-101) y CONTEXT_PARENT queda de red, no de norma.
   La regla que NO se relaja: un código ausente, desconocido o ajeno cae al padre — nunca se
   pinta otra clase. ==================================================================== */
describe("contexto en la URL (CONTEXT_PARAM)", () => {
  const MIOS = ["PF-101", "PF-FUND-2026"];

  it("'course-detail' declara la global que el hash rehidrata", () => {
    expect(CONTEXT_PARAM["course-detail"]).toBe("__course");
    expect(contextGlobalFor("course-detail")).toBe("__course");
  });

  it("las demás pantallas-con-contexto siguen SIN param (decisión explícita)", () => {
    // Comparten global entre rutas (lesson/assignment/player), necesitan dos (quiz), no tienen
    // id estable (quiz-results, room) o no hay lista contra la que validar (listing,
    // certificate). Ver el comentario de CONTEXT_PARAM en router.ts.
    for (const r of ["lesson", "assignment", "player", "quiz", "quiz-results", "listing", "certificate", "room"]) {
      expect(contextGlobalFor(r), `'${r}' se coló en CONTEXT_PARAM sin validador`).toBe("");
    }
  });

  it("toda ruta con param es una ruta REAL y conserva su red de CONTEXT_PARENT", () => {
    for (const route of Object.keys(CONTEXT_PARAM)) {
      expect(ROUTES[route]).toBeTruthy();
      expect(routeNeedsContext(route), `'${route}' sin fallback: un param inválido pintaría cualquier cosa`).toBe(true);
    }
  });

  it("el hash de la clase lleva su código, y parseHash lo devuelve entero", () => {
    expect(routeToHash("course-detail", "PF-101")).toBe("#course-detail/PF-101");
    expect(parseHash("#course-detail/PF-101")).toEqual({ route: "course-detail", param: "PF-101" });
    // un código con caracteres raros viaja codificado y vuelve intacto (no rompe la ruta)
    const raro = "PF/101 &2026";
    expect(parseHash(routeToHash("course-detail", raro))!.param).toBe(raro);
  });

  it("acepta el código SOLO si es uno de los cursos del alumno", () => {
    expect(contextParamIsValid("course-detail", "PF-101", MIOS)).toBe(true);
    expect(contextParamIsValid("course-detail", "PF-FUND-2026", MIOS)).toBe(true);
  });

  it("un código ausente, inventado o de un curso AJENO no vale: se cae al menú", () => {
    expect(contextParamIsValid("course-detail", "", MIOS)).toBe(false);
    expect(contextParamIsValid("course-detail", "NO-EXISTE", MIOS)).toBe(false);
    expect(contextParamIsValid("course-detail", "LD-999", MIOS)).toBe(false);   // curso de otro
    expect(contextParamIsValid("course-detail", "PF-101", [])).toBe(false);     // sin cursos
    // y el fallback sigue siendo el menú de clases, no un curso cualquiera
    expect(contextFallbackRoute("course-detail", "student")).toBe("course");
  });

  it("una ruta sin param declarado nunca acepta uno (no se cuela contexto por la URL)", () => {
    expect(contextParamIsValid("lesson", "L-101", ["L-101"])).toBe(false);
    expect(contextParamIsValid("dashboard", "x", ["x"])).toBe(false);
  });
});

/* ===== SONDEO 2026-08-09 · R4 · GUARD DE ROL por ruta ====================================
   El sondeo encontró que '#parent' y '#coachwork' escritas a mano METÍAN a la alumna en el
   Portal de Familia y en "Reservas e ingresos" del coach: iban sin `role`. Se pintaban vacías
   (su payload no trae esos datos), pero el guard estaba abierto. Esta tabla recorre ROUTES
   entera para que no se vuelva a colar ninguna: si mañana alguien añade la pantalla de un rol
   sin declararlo, este test la caza. ================================================== */
describe("R4 · guard de rol: cada rol alcanza LO SUYO y lo compartido, nada más", () => {
  const ROLES = ["student", "teacher", "parent", "admin"] as const;

  // Rutas con DUEÑO: su pantalla habla de la gente, la agenda o el dinero de OTRO rol. El resto
  // de ROUTES es compartido a propósito (dashboard, cursos, debate, marketplace, mensajes,
  // perfil, ajustes, eventos, sala, progreso…): pintan los datos DEL QUE MIRA, no los de nadie
  // más, y varias las comparten dos roles por diseño.
  const DUENO: Record<string, readonly string[]> = {
    teacher:          ["teacher"],
    participants:     ["teacher"],
    coachwork:        ["teacher"],              // [R4] antes: abierta a todos
    manage:           ["teacher", "admin"],
    "course-builder": ["teacher", "admin"],
    "my-listings":    ["teacher", "admin"],
    parent:           ["parent"],               // [R4] antes: abierta a todos
    placement:        ["student"],              // [R4] antes: abierta a todos
    // [ADM] El wizard recoge los datos personales del ALUMNO y de su tutor (firma y
    // consentimiento incluidos) y es la PUERTA del alumno nuevo: nace cerrada a 'student',
    // mismo criterio que 'placement'.
    admission:        ["student"],
    admin:            ["admin"],
    "admin-users":    ["admin"],
    "admin-metrics":  ["admin"],
    "admin-whatsapp": ["admin"],
    "admin-settings": ["admin"],
  };

  it("las tres que el sondeo encontró abiertas están cerradas", () => {
    expect(isRouteAllowed("parent", "student")).toBe(false);
    expect(isRouteAllowed("coachwork", "student")).toBe(false);
    expect(isRouteAllowed("placement", "teacher")).toBe(false);
    // y caen a su home, sin romperse
    expect(resolveHashRoute("#parent", "student")).toBe("dashboard");
    expect(resolveHashRoute("#coachwork", "student")).toBe("dashboard");
  });

  it("cada ruta con dueño la alcanzan SUS roles y ningún otro", () => {
    for (const [route, duenos] of Object.entries(DUENO)) {
      expect(ROUTES[route], `'${route}' ya no existe: actualiza la tabla`).toBeTruthy();
      for (const role of ROLES) {
        expect(isRouteAllowed(route, role), `'${route}' desde ${role}`).toBe(duenos.includes(role));
      }
    }
  });

  it("la tabla y ROUTES dicen lo MISMO: ninguna ruta declara un rol a espaldas de este test", () => {
    for (const [route, def] of Object.entries(ROUTES)) {
      const declarado = def.role ? (Array.isArray(def.role) ? def.role : [def.role]).slice().sort() : null;
      const esperado = DUENO[route] ? DUENO[route].slice().sort() : null;
      expect(declarado, `'${route}': su guard no coincide con la tabla de dueños`).toEqual(esperado);
    }
  });

  it("lo COMPARTIDO sigue abierto: cerrar de más también es romper", () => {
    for (const role of ROLES) {
      for (const r of ["profile", "settings", "messages", "explore", "marketplace", "events", "room"]) {
        expect(isRouteAllowed(r, role), `'${r}' se cerró para ${role}`).toBe(true);
      }
    }
    // 'listings' (buscar clases) lo usan alumno y padre; el coach gestiona las suyas en
    // 'my-listings'. Ninguna de las dos se restringe de más.
    for (const role of ["student", "parent", "teacher", "admin"] as const) expect(isRouteAllowed("listings", role)).toBe(true);
  });

  it("una ruta con dueño nunca es el home de un rol ni el padre al que cae otra pantalla", () => {
    // Si el fallback apuntara a una ruta prohibida, el usuario quedaría en bucle o en blanco.
    for (const role of ROLES) expect(isRouteAllowed(defaultRouteForRole(role), role)).toBe(true);
    for (const route of Object.keys(CONTEXT_PARENT))
      for (const role of ROLES)
        expect(isRouteAllowed(contextFallbackRoute(route, role), role), `${route} → ${role}`).toBe(true);
  });
});
