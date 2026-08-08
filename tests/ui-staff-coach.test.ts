// [GOAL 2026-08 · F4 — bloque COACH] Contrato visible de los defectos del barrido de staff
// (docs/review/GOAL_2026-08_barrido-staff.md). Un bloque por defecto:
//
//   S1 · los botones SOLO-ICONO de las filas de alumno tienen nombre accesible (aria-label)
//   S3 · una sola moneda: el label del modal "Publicar clase" habla la misma que money()
//   S4 · la conversación se etiqueta con la CONTRAPARTE, nunca con uno mismo
//   S5 · el preview de la lista sale del ÚLTIMO MENSAJE REAL (no de un lastLabel inventado)
//
// Los builders son módulos "@ts-nocheck" que solo arman strings de HTML → se prueban en Node
// con un stub de window (mismo patrón que screens.test.ts / ui-cursos-clases.test.ts).
// conversationLabel() es PURA (no toca Prisma) → se prueba directa, como computeRosterMetrics.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.otrFormModal = () => {};

// queries.ts importa `db` a nivel de módulo; conversationLabel nunca lo usa.
vi.mock("../app/lib/db", () => ({ db: {} }));

import { DB } from "../app/lib/data";
import { S as STeacher } from "../app/lib/scr-teacher";
import { S as SCommunityRaw } from "../app/lib/scr-community";
import "../app/lib/scr-my-listings"; // registra el diccionario lst.*
import { conversationLabel } from "../app/lib/queries";
import { esc as escOnce } from "../app/lib/esc";
import { money } from "../app/lib/money";
import { t } from "../app/lib/i18n";

const Teacher: any = STeacher;
const SCommunity: any = SCommunityRaw;

const STUDENTS = [
  { id: "u-ig", n: "Isabella Guzmán", i: "IG", lvl: "OTR Competitor", xp: 2100, last: "hace 2 días", risk: false, grade: 88, att: 92, eng: "Alto", trend: "up" },
  { id: "u-df", n: "Diego Fermín", i: "DF", lvl: "OTR Initiate", xp: 820, last: "hace 20 días", risk: true, grade: null, att: 55, eng: "Bajo", trend: "down" },
];

function resetFixture() {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Saúl Méndez", initials: "SM", role: "teacher", level: "OTR Laureate" },
    teacher: { name: "Saúl Méndez", initials: "SM", headline: "Head Coach · Public Forum" },
    students: STUDENTS,
    teacherKpis: { avg: 90, attendance: 50, onTime: 66, atRisk: 1 },
    teacherCourses: [],
    pendingSubs: 0,
  });
}

/** Todos los botones de la tabla/lista que no tienen texto visible (solo icono). */
function iconOnlyButtons(html: string): string[] {
  const vacios: string[] = html.match(/<button[^>]*>(?:\s*<svg[\s\S]*?<\/svg>\s*)?<\/button>/g) ?? [];
  const soloSvg: string[] = html.match(/<button[^>]*>\s*<svg[\s\S]*?<\/svg>\s*<\/button>/g) ?? [];
  return [...vacios, ...soloSvg];
}

describe("S1 · los botones solo-icono de las filas de alumno se anuncian con nombre", () => {
  beforeEach(resetFixture);

  it("Participantes: el botón de mensaje lleva aria-label con el nombre del alumno", () => {
    const html = Teacher.participants.render();
    expect(html).toContain('aria-label="Enviar mensaje a Isabella Guzmán"');
    expect(html).toContain('aria-label="Enviar mensaje a Diego Fermín"');
  });

  it("Panel del profesor: el botón de la lista 'Requieren atención' también", () => {
    const html = Teacher.teacher.render();
    // Diego es el único en riesgo del fixture → es la fila que pinta el botón de mensaje.
    expect(html).toContain('aria-label="Enviar mensaje a Diego Fermín"');
  });

  it("ningún botón SOLO-ICONO de estas dos pantallas queda sin nombre accesible", () => {
    const html = Teacher.participants.render() + Teacher.teacher.render();
    const mudos = iconOnlyButtons(html).filter((b) => !/aria-label="[^"]+"/.test(b));
    expect(mudos).toEqual([]);
  });

  it("la clave existe en ES y EN (el aula es bilingüe nativa)", () => {
    expect(t("teacher.sendMessageTo", "es")).toContain("{name}");
    expect(t("teacher.sendMessageTo", "en")).toContain("{name}");
    expect(t("teacher.sendMessageTo", "en")).not.toBe(t("teacher.sendMessageTo", "es"));
  });
});

describe("S3 · una sola moneda entre el modal de publicar clase y el resto del Aula", () => {
  it("el label de la tarifa NO pide RD$ mientras las cards muestran $", () => {
    expect(money(4500)).toBe("$45");
    for (const lang of ["es", "en"]) {
      const label = t("lst.fieldPrice", lang);
      expect(label).not.toContain("RD$");
      expect(label).toContain("$");
    }
  });

  it("el símbolo del label es exactamente el que imprime money()", () => {
    const simbolo = money(100).replace(/[\d.,]/g, ""); // "$"
    expect(t("lst.fieldPrice", "es")).toContain(`(${simbolo})`);
    expect(t("lst.fieldPrice", "en")).toContain(`(${simbolo})`);
  });
});

/* --------------------------------------------------------------------------
   S4 / S5 — conversationLabel(): etiqueta y preview de un hilo.
   -------------------------------------------------------------------------- */
const SAUL = { name: "Saúl Méndez", initials: "SM" };
const ANALIA = { name: "Analía Reyes", initials: "AR" };
const ADMIN = { name: "Coordinación OTR", initials: "OT" };
const PEOPLE = new Map<string, { name: string; initials: string }>([
  ["u-saul", SAUL], ["u-ar", ANALIA], ["u-admin", ADMIN],
]);

const convo = (over: any = {}) => conversationLabel({
  storedName: "Coach Saúl Méndez",
  storedInitials: "SM",
  storedLastLabel: "Te dejé feedback en la entrega 👏",
  participantIds: ["u-ar", "u-saul"],
  meId: "u-saul",
  meName: "Saúl Méndez",
  counterparts: PEOPLE,
  lastMessageBody: "Hecho. Lo subo hoy mismo 💪",
  ...over,
});

describe("S4 · el hilo se etiqueta con la contraparte, no con uno mismo", () => {
  it("el COACH ve a su alumna, no su propio nombre", () => {
    const v = convo();
    expect(v.name).toBe("Analía Reyes");
    expect(v.initials).toBe("AR");
  });

  it("el prefijo de cortesía no despista ('Coach Saúl Méndez' ES Saúl Méndez)", () => {
    expect(convo({ storedName: "Saúl Méndez" }).name).toBe("Analía Reyes");
    expect(convo({ storedName: "coach saul mendez" }).name).toBe("Analía Reyes");
  });

  it("la ALUMNA sigue viendo a su coach (la etiqueta ya nombraba a la contraparte)", () => {
    const v = convo({ meId: "u-ar", meName: "Analía Reyes" });
    expect(v.name).toBe("Coach Saúl Méndez");
    expect(v.initials).toBe("SM");
  });

  it("un hilo ya bien etiquetado no se toca", () => {
    const v = convo({ storedName: "Diego Fermín", storedInitials: "DF", participantIds: ["u-df", "u-saul"], counterparts: new Map([["u-df", { name: "Diego Fermín", initials: "DF" }]]) });
    expect(v.name).toBe("Diego Fermín");
  });

  it("un canal de anuncios (la etiqueta no nombra a nadie) conserva su nombre", () => {
    const v = convo({
      storedName: "Equipo OTR (anuncios)", storedInitials: "OTR",
      participantIds: ["u-ar", "u-admin"], meId: "u-ar", meName: "Analía Reyes",
    });
    expect(v.name).toBe("Equipo OTR (anuncios)");
    expect(v.initials).toBe("OTR");
  });

  it("sin contraparte cargada (o sin sesión) degrada al valor guardado, no a vacío", () => {
    expect(convo({ counterparts: new Map() }).name).toBe("Coach Saúl Méndez");
    expect(convo({ meId: null, meName: null }).name).toBe("Coach Saúl Méndez");
  });
});

describe("S5 · el preview de la lista es el último mensaje real del hilo", () => {
  it("preview y detalle coinciden: gana el último mensaje, no el lastLabel", () => {
    expect(convo().last).toBe("Hecho. Lo subo hoy mismo 💪");
  });

  it("hilo sin mensajes todavía → cae al lastLabel guardado (no deja el preview vacío)", () => {
    expect(convo({ lastMessageBody: null }).last).toBe("Te dejé feedback en la entrega 👏");
    expect(convo({ lastMessageBody: "" }).last).toBe("Te dejé feedback en la entrega 👏");
  });

  it("el seed ya no deja el hilo de Diego Fermín (cv-5) sin mensajes", () => {
    const seed = readFileSync(join(process.cwd(), "prisma", "seed.ts"), "utf8");
    const msgsCv5 = (seed.match(/conversationId: "cv-5"[^}]*body:/g) || []).length;
    expect(msgsCv5).toBeGreaterThan(0);
  });
});

/* --------------------------------------------------------------------------
   K-14 / K-15 / K-16 / K-17 — auditoría de teclado y lector de pantalla.
   El modal Adjudicar se arma dentro de mount() (sobre un click real, con DOM),
   así que su contrato se fija sobre el FUENTE, igual que ui-cursos-clases.test.ts
   hace con la ruta borrada. La verificación viva va por browser_snapshot.
   -------------------------------------------------------------------------- */
const SRC_TEACHER = readFileSync(join(process.cwd(), "app", "lib", "scr-teacher.ts"), "utf8");

describe("K-14 · los 10 campos del modal Adjudicar tienen label programática", () => {
  it("fld() ata la etiqueta a su control con for=", () => {
    expect(SRC_TEACHER).toMatch(/<label class="label" for="\$\{forId\}">/);
  });

  it("los 5 campos de control único pasan su id a fld()", () => {
    for (const id of ["bl-result", "bl-format", "bl-opp", "bl-partner", "bl-comments"]) {
      expect(SRC_TEACHER).toContain(`, "${id}")`);
    }
  });

  it("los 5 criterios de la rúbrica son <label for> + input con id", () => {
    expect(SRC_TEACHER).toMatch(/<label class="adj-crit" for="\$\{critId\(k\)\}">/);
    expect(SRC_TEACHER).toMatch(/id="\$\{critId\(k\)\}"/);
  });

  it("la rúbrica es un grupo con nombre (no 5 spin buttons sueltos)", () => {
    expect(SRC_TEACHER).toContain('role="group" aria-labelledby="bl-rubric-lbl"');
    expect(SRC_TEACHER).toContain('<label class="label" id="bl-rubric-lbl">');
  });
});

describe("K-15/K-16 · el composer de Mensajes se anuncia", () => {
  beforeEach(() => {
    for (const k of Object.keys(DB)) delete (DB as any)[k];
    Object.assign(DB, {
      me: { name: "Saúl Méndez", initials: "SM", role: "teacher" },
      messages: [{
        id: "cv-1", ini: "AR", name: "Analía Reyes", last: "Hecho. Lo subo hoy mismo", when: "hace 1h",
        unread: 0, online: true, navy: false,
        messages: [{ me: true, body: "¿Cómo vas?", when: "10:02" }],
      }],
    });
  });

  it("K-15 · el botón de enviar (solo-icono) tiene aria-label", () => {
    const html = SCommunity.messages.render();
    expect(html).toMatch(/id="chat-send"[^>]*aria-label="[^"]+"/);
  });

  it("K-16 · el composer y el buscador no dependen del placeholder", () => {
    const html = SCommunity.messages.render();
    expect(html).toMatch(/id="chat-input"[^>]*aria-label="[^"]+"/);
    expect(html).toMatch(/<input aria-label="[^"]+" placeholder="/); // buscador de conversaciones
  });

  it("las 3 claves nuevas existen en ES y EN", () => {
    for (const k of ["comm.msg.sendAria", "comm.msg.composeAria", "comm.msg.searchAria"]) {
      expect(t(k, "es")).not.toBe(k);
      expect(t(k, "en")).not.toBe(k);
      expect(t(k, "en")).not.toBe(t(k, "es"));
    }
  });
});

describe("K-17 · los botones data-go=messages usan aria-label (cubierto por S1)", () => {
  beforeEach(resetFixture);
  it("ninguno se queda solo con title", () => {
    const html = Teacher.participants.render() + Teacher.teacher.render();
    const conMsg = html.match(/<button[^>]*data-go="messages"[^>]*>/g) || [];
    expect(conMsg.length).toBeGreaterThan(0);
    expect(conMsg.every((b) => /aria-label="[^"]+"/.test(b))).toBe(true);
  });
});

/* ==========================================================================
   FIX POST-REVISIÓN
   ========================================================================== */

describe("R1 · precedencia: la comparación laxa no puede anular el arreglo de S4", () => {
  const JR = { name: "Saúl Méndez Jr", initials: "SJ" };
  const CON_JR = new Map<string, { name: string; initials: string }>([
    ["u-saul", SAUL], ["u-jr", JR],
  ]);

  it("sonda del revisor: con un alumno 'Saúl Méndez Jr', el coach NO se ve a sí mismo", () => {
    const v = convo({
      storedName: "Saúl Méndez", storedInitials: "SM",
      participantIds: ["u-jr", "u-saul"], meId: "u-saul", meName: "Saúl Méndez",
      counterparts: CON_JR,
    });
    expect(v.name).toBe("Saúl Méndez Jr");
    expect(v.initials).toBe("SJ");
  });

  it("y al revés: si la etiqueta nombra exactamente al Jr y el Jr soy yo, veo al coach", () => {
    const v = convo({
      storedName: "Saúl Méndez Jr", storedInitials: "SJ",
      participantIds: ["u-jr", "u-saul"], meId: "u-jr", meName: "Saúl Méndez Jr",
      counterparts: CON_JR,
    });
    expect(v.name).toBe("Saúl Méndez");
  });

  it("una etiqueta que ya nombra EXACTAMENTE a la contraparte se respeta", () => {
    const v = convo({
      storedName: "Saúl Méndez Jr", storedInitials: "SJ",
      participantIds: ["u-jr", "u-saul"], meId: "u-saul", meName: "Saúl Méndez",
      counterparts: CON_JR,
    });
    expect(v.name).toBe("Saúl Méndez Jr");
  });

  it("el prefijo de cortesía (comparación laxa) sigue funcionando", () => {
    expect(convo().name).toBe("Analía Reyes"); // stored "Coach Saúl Méndez", yo Saúl
  });
});

describe("R2 · con 3+ participantes la etiqueta es estable", () => {
  it("elige el primero del orden que entrega la query, no uno al azar", () => {
    const gente = new Map<string, { name: string; initials: string }>([
      ["u-a", { name: "Ana Belén", initials: "AB" }],
      ["u-b", { name: "Bruno Cruz", initials: "BC" }],
      ["u-saul", SAUL],
    ]);
    const base = { storedName: "Saúl Méndez", storedInitials: "SM", meId: "u-saul", meName: "Saúl Méndez", counterparts: gente };
    const v1 = convo({ ...base, participantIds: ["u-a", "u-b", "u-saul"] });
    const v2 = convo({ ...base, participantIds: ["u-a", "u-b", "u-saul"] });
    expect(v1.name).toBe("Ana Belén");
    expect(v2.name).toBe(v1.name); // determinista entre cargas
  });

  it("la query del payload pide los participantes con orden explícito (userId asc)", () => {
    const q = readFileSync(join(process.cwd(), "app", "lib", "queries.ts"), "utf8");
    expect(q).toContain('participants: { select: { userId: true }, orderBy: { userId: "asc" } }');
  });
});

/* Decodifica las 5 entidades de esc() — sirve para afirmar sobre lo que LEE el usuario. */
const decode1 = (s: string) => s
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, "&");

describe("R3 · doble escape en Mensajes: el texto se escapa UNA vez", () => {
  const CRUDO = "hoy a las 5 & luego 'listo'";
  const UNA_VEZ = escOnce(CRUDO); // lo que entrega queries.ts en el payload

  beforeEach(() => {
    for (const k of Object.keys(DB)) delete (DB as any)[k];
    Object.assign(DB, {
      me: { name: "Saúl Méndez", initials: "SM", role: "teacher" },
      messages: [{
        id: "cv-1", ini: "AR", name: "Analía Reyes", last: UNA_VEZ, when: "ahora",
        unread: 0, online: true, navy: false,
        messages: [{ me: true, body: UNA_VEZ, when: "ahora" }],
      }],
    });
  });

  it("el preview de la lista se lee tal cual lo escribió el usuario", () => {
    const html = SCommunity.messages.render();
    const preview = html.match(/<div class="convo-last">([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(preview).toBe(UNA_VEZ);
    expect(decode1(preview)).toBe(CRUDO);
  });

  it("la burbuja del hilo también (y no aparece la entidad doble)", () => {
    const html = SCommunity.messages.render();
    const burbuja = html.match(/<div class="bubble">([\s\S]*?)<span class="b-time">/)?.[1] ?? "";
    expect(decode1(burbuja)).toBe(CRUDO);
    expect(html).not.toContain("&amp;amp;");
    expect(html).not.toContain("&amp;#39;");
  });

  it("un nombre con & tampoco se escapa dos veces en cabecera y lista", () => {
    (DB as any).messages[0].name = escOnce("Ana & Co");
    const html = SCommunity.messages.render();
    expect(html).toContain(escOnce("Ana & Co"));
    expect(html).not.toContain("&amp;amp;");
  });

  it("`when` SÍ se escapa aquí: queries.ts no lo escapa (es etiqueta nuestra)", () => {
    (DB as any).messages[0].messages[0].when = "<b>x</b>";
    const html = SCommunity.messages.render();
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("el eco optimista entra al caché ya escapado (no re-inyecta lo tecleado)", () => {
    const src = readFileSync(join(process.cwd(), "app", "lib", "scr-community.ts"), "utf8");
    expect(src).toContain("conv.messages.push({ me:true, body:esc(v)");
  });

  it("el GET de refresco escapa UNA vez, usa conversationLabel y ordena participantes", () => {
    const r = readFileSync(join(process.cwd(), "app", "api", "messages", "route.ts"), "utf8");
    expect(r).toContain('participants: { select: { userId: true }, orderBy: { userId: "asc" } }');
    expect(r).toContain("conversationLabel({");
    expect(r).toContain("body: esc(m.body)");
    expect(r).toContain("name: esc(label.name)");
  });
});
