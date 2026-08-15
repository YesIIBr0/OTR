/* [ADM] VISIBILIDAD DE STAFF — lo que el coach y el admin ven (y lo que NO) del flujo de
   admisión de 4 pasos. Plan: docs/superpowers/plans/2026-08-10-onboarding-admision.md (§F4).

   El reparto es deliberado y asimétrico, porque los datos son de MENORES:
     · COACH → PROGRESO. Quién no ha terminado de entrar y qué paso le toca. Nada más:
       ni consentimiento, ni tutor, ni documento.
     · ADMIN → progreso + CONSENTIMIENTO como booleano, que es la base para operar
       legalmente. Tampoco el expediente: ni firma, ni cédula, ni teléfono del tutor.

   Los builders son módulos "@ts-nocheck" que solo arman strings → se prueban en Node con un
   stub de window, igual que screens.test.ts / ui-staff-coach.test.ts. */
import { describe, it, expect, beforeEach, vi } from "vitest";

/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({ users: [], total: 0 });
win.go = () => {};
win.toast = () => {};

vi.mock("../app/lib/db", () => ({ db: {} }));

import { DB } from "../app/lib/data";
import { S as STeacher } from "../app/lib/scr-teacher";
import { S as SAdminUsers } from "../app/lib/scr-admin-users";
import { t } from "../app/lib/i18n";

const Teacher: any = STeacher;
const AdminUsers: any = SAdminUsers;

/* Rastros del expediente que NUNCA pueden aparecer en una pantalla de staff. Si alguno se
   cuela en el payload y alguien lo pinta, este test lo caza en la pantalla, que es donde
   el daño sería visible. */
const EXPEDIENTE = [
  "Rosa Marte Tutora", "001-1234567-8", "+1 809 555 0101", "rosa.tutora@example.com",
  "Colegio Santo Domingo", "/uploads/dpp-menor.mp4",
];

/* ============================ COACH ============================ */

const STUDENTS = [
  // terminó la admisión
  { id: "u-ig", n: "Isabella Guzmán", i: "IG", lvl: "OTR Competitor", xp: 2100, last: "hace 2 días", risk: false, grade: 88, att: 92, eng: "Alto", trend: "up",
    adm: { done: 4, total: 4, step: 4, complete: true } },
  // va por el paso 2 (la llamada de descubrimiento)
  { id: "u-df", n: "Diego Fermín", i: "DF", lvl: "OTR Initiate", xp: 820, last: "hace 20 días", risk: true, grade: null, att: 55, eng: "Bajo", trend: "down",
    adm: { done: 1, total: 4, step: 2, complete: false } },
  // ni ha empezado
  { id: "u-nn", n: "Noel Núñez", i: "NN", lvl: "OTR Initiate", xp: 0, last: "hoy", risk: false, grade: null, att: null, eng: "—", trend: "flat",
    adm: { done: 0, total: 4, step: 1, complete: false } },
];

function coachFixture(students: any[] = STUDENTS) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Saúl Méndez", initials: "SM", role: "teacher", level: "OTR Laureate" },
    teacher: { name: "Saúl Méndez", initials: "SM", headline: "Head Coach · Public Forum" },
    students,
    teacherKpis: { avg: 90, attendance: 50, onTime: 66, atRisk: 1 },
    teacherCourses: [],
    pendingSubs: 0,
  });
  win.__teacherTab = "grupo";
}

describe("ADM · el COACH ve el progreso de admisión de SUS alumnos", () => {
  beforeEach(() => coachFixture());

  it("el roster gana la columna Admisión", () => {
    const html = Teacher.teacher.render({ role: "teacher" });
    expect(html).toContain(t("teacher.thAdmission"));
  });

  it("la admisión terminada se marca como completa; la de a medias dice POR QUÉ PASO va", () => {
    const html = Teacher.teacher.render({ role: "teacher" });
    expect(html).toContain(t("teacher.admComplete"));      // Isabella
    expect(html).toContain("1/4");                          // Diego: 1 de 4
    expect(html).toContain(t("teacher.admStepCall"));       // …y le toca la llamada
    expect(html).toContain("0/4");                          // Noel: sin empezar
    expect(html).toContain(t("teacher.admStepForm"));
  });

  it("el rail lista a los de a medias, del menos avanzado al más", () => {
    const html = Teacher.teacher.render({ role: "teacher" });
    expect(html).toContain(t("teacher.admPendingTitle"));
    const posNoel = html.indexOf("Noel Núñez");
    const posDiego = html.indexOf("Diego Fermín", html.indexOf(t("teacher.admPendingTitle")));
    expect(posNoel).toBeGreaterThan(-1);
    expect(posDiego).toBeGreaterThan(-1);
    expect(posNoel).toBeLessThan(posDiego); // 0 de 4 antes que 1 de 4
    // Isabella terminó: no aparece en la lista de pendientes
    const railTail = html.slice(html.indexOf(t("teacher.admPendingTitle")));
    expect(railTail.slice(0, railTail.indexOf(t("teacher.pendingGradingTitle")))).not.toContain("Isabella");
  });

  it("con TODO el grupo adentro, la lista se queda vacía y lo dice", () => {
    coachFixture(STUDENTS.map((s) => ({ ...s, adm: { done: 4, total: 4, step: 4, complete: true } })));
    const html = Teacher.teacher.render({ role: "teacher" });
    expect(html).toContain(t("teacher.admAllInTitle"));
  });

  it("SIN el subsistema (adm null) la columna y la card ni existen: no se pintan ceros que mientan", () => {
    coachFixture(STUDENTS.map((s) => ({ ...s, adm: null })));
    const html = Teacher.teacher.render({ role: "teacher" });
    expect(html).not.toContain(t("teacher.thAdmission"));
    expect(html).not.toContain(t("teacher.admPendingTitle"));
    // …y el resto del panel sigue en pie
    expect(html).toContain(t("teacher.needAttention"));
  });

  it("el coach NO ve el expediente: ni tutor, ni cédula, ni teléfono, ni el vídeo", () => {
    const html = Teacher.teacher.render({ role: "teacher" });
    for (const secreto of EXPEDIENTE) expect(html).not.toContain(secreto);
    // ni el estado del consentimiento, que es de la consola del admin
    expect(html).not.toContain(t("au.admConsentGuardian"));
  });
});

/* ============================ ADMIN ============================ */

function adminFixture(adminAdmissions: any) {
  for (const k of Object.keys(DB)) delete (DB as any)[k];
  Object.assign(DB, {
    me: { name: "Admin OTR", initials: "AO", role: "admin" },
    adminAdmissions,
  });
  win.__adminUsers = {
    loaded: true, loading: false, q: "", role: "", total: 1, counts: null,
    users: [{ id: "u-menor", name: "Nueva Alumna", email: "nueva@otr.do", role: "STUDENT", ageBand: "minor", suspended: false, coachVerified: false }],
  };
  win.__admIndex = null;
  win.__admIndexSrc = null;
}

const FILA_MENOR_SIN_FIRMA = {
  id: "u-menor", n: "Nueva Alumna", i: "NA", minor: true,
  done: 1, total: 4, step: 2, complete: false,
  consentData: true, consentGuardian: false, consentPending: true,
};
const FILA_COMPLETA = {
  id: "u-ok", n: "Alumna Lista", i: "AL", minor: false,
  done: 4, total: 4, step: 4, complete: true,
  consentData: true, consentGuardian: true, consentPending: false,
};

describe("ADM · el ADMIN ve el estado de consentimiento de la plataforma", () => {
  it("destaca el caso crítico: MENOR con formulario enviado y SIN firma del tutor", () => {
    adminFixture({ rows: [FILA_MENOR_SIN_FIRMA], total: 1, complete: 0, inProgress: 1, consentSigned: 1, consentPending: 1 });
    const html = AdminUsers.adminUsers.render({ role: "admin" });
    expect(html).toContain(t("au.admTitle"));
    expect(html).toContain(t("au.admKpiConsentPending"));
    expect(html).toContain(t("au.admPendingTitle"));
    expect(html).toContain(t("au.admConsentGuardianMissing"));
    expect(html).toContain("Nueva Alumna");
  });

  it("el consentimiento firmado se marca como hecho y no entra en la lista de perseguidos", () => {
    adminFixture({ rows: [FILA_COMPLETA], total: 1, complete: 1, inProgress: 0, consentSigned: 1, consentPending: 0 });
    const html = AdminUsers.adminUsers.render({ role: "admin" });
    expect(html).toContain(t("au.admConsentGuardian"));
    expect(html).not.toContain(t("au.admConsentGuardianMissing"));
    expect(html).toContain(t("au.admAllDoneTitle")); // no queda nada a medias
  });

  it("la ficha del usuario en la lista se anota con SU estado de admisión", () => {
    adminFixture({ rows: [FILA_MENOR_SIN_FIRMA], total: 1, complete: 0, inProgress: 1, consentSigned: 1, consentPending: 1 });
    const html = AdminUsers.adminUsers.render({ role: "admin" });
    // "1 de 4" sale tanto en la sección como en el chip de la ficha del usuario
    expect(html.split(t("au.admStepOf").split("{done}").join("1").split("{total}").join("4")).length - 1).toBeGreaterThanOrEqual(2);
  });

  it("el admin NO recibe ni pinta el expediente del menor ni el texto del consentimiento", () => {
    adminFixture({ rows: [FILA_MENOR_SIN_FIRMA, FILA_COMPLETA], total: 2, complete: 1, inProgress: 1, consentSigned: 2, consentPending: 1 });
    const html = AdminUsers.adminUsers.render({ role: "admin" });
    for (const secreto of EXPEDIENTE) expect(html).not.toContain(secreto);
  });

  it("SIN adminAdmissions la pantalla queda EXACTAMENTE como antes (nada roto, nada vacío)", () => {
    adminFixture(undefined);
    const html = AdminUsers.adminUsers.render({ role: "admin" });
    expect(html).not.toContain(t("au.admTitle"));
    expect(html).toContain(t("au.title"));      // la gestión de usuarios sigue ahí
    expect(html).toContain("Nueva Alumna");
  });
});
