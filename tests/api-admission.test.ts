// [ADM] Integración de /api/admission — el flujo de admisión de 4 pasos.
// Lo que este archivo defiende, que es justo lo que no puede romperse nunca:
//   · GUARDS DE ROL: el alumno solo toca SU admisión; coach/admin SOLO leen; nadie más entra.
//   · ORDEN de los pasos: no se completa el 3 con el 2 pendiente (comprobado en SERVIDOR).
//   · VALIDACIÓN en servidor: el cliente puede mandar lo que quiera; aquí se decide.
//   · CONSENTIMIENTO: queda registrado con su TEXTO EXACTO, su versión, cuándo y quién —
//     es la prueba de que un tutor consintió el tratamiento de datos de un menor.
// Mockea Prisma + sesión (harness). Ejercita la LÓGICA real de los handlers sin DB.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeDb, jsonReq } from "./helpers/route-harness";

const box = vi.hoisted(() => ({ db: null as any, user: null as any }));
vi.mock("../app/lib/db", () => ({
  db: new Proxy({}, { get: (_t, p: string) => (p === "then" ? undefined : box.db.db[p]) }),
}));
vi.mock("../app/lib/auth", () => ({ setSession: vi.fn(), getSessionUser: () => box.user, clearSession: vi.fn() }));

import { GET, POST } from "../app/api/admission/route";
import { PATCH } from "../app/api/admission/step/route";
import { POST as POST_VIDEO } from "../app/api/admission/video/route";
import {
  CONSENT_KIND_DATA,
  CONSENT_KIND_GUARDIAN,
  CONSENT_TEXT_DATA,
  CONSENT_TEXT_GUARDIAN,
  CONSENT_VERSION,
  ageFromBirthDate,
  admissionPayload,
  cleanAdmissionForm,
  normalizePhone,
  parseBirthDate,
  previousStepsDone,
  safeDppVideoUrl,
} from "../app/api/admission/input";

box.db = makeDb();
const db = box.db;

const STUDENT = { id: "s1", role: "STUDENT", name: "Analía Reyes", email: "analia@x.com" };
const OTHER_STUDENT = { id: "s2", role: "STUDENT", name: "Otro Alumno", email: "otro@x.com" };
const COACH = { id: "t1", role: "TEACHER", name: "Saúl", email: "saul@x.com" };
const ADMIN = { id: "a1", role: "ADMIN", name: "Equipo OTR", email: "admin@x.com" };
const PARENT = { id: "p1", role: "PARENT", name: "Rosa", email: "rosa@x.com" };

// Un usuario NUEVO por test: el rate-limit vive en memoria del proceso y es por-usuario, así
// que reutilizar el mismo id a lo largo del archivo acabaría devolviendo 429 y enmascarando
// el resultado real de la ruta.
let seq = 0;
const freshStudent = () => ({ ...STUDENT, id: `s-${++seq}` });

/** Formulario válido de un alumno ADULTO de 30 (no dispara el bloque de tutor). */
const ADULT_FORM = {
  firstName: "Analía",
  lastName: "Reyes",
  birthDate: "1996-03-09",
  phone: "(809) 555-0123",
  school: "Liceo Espaillat",
  gradeLevel: "UNIVERSIDAD",
  program: "ORATORIA",
  priorExperience: true,
  preferredDays: "LUN_MIE",
  consent: true,
};

/** Formulario de un MENOR de 15 (exige tutor y además activa las reglas de menor). */
const MINOR_FORM = {
  ...ADULT_FORM,
  firstName: "Diego",
  lastName: "Fermín",
  birthDate: "2011-04-18",
  guardianName: "Rosa Fermín",
  guardianDocument: "402-1234567-8",
  guardianRelation: "PADRE_MADRE",
  guardianPhone: "809 555 0190",
  guardianSignature: "Rosa Fermín",
};

/** Fila de Admission con los pasos que se le pidan ya completos. */
function admissionRow(over: Record<string, unknown> = {}) {
  return {
    id: "adm-1", studentId: box.user?.id ?? "s1",
    formCompletedAt: null, callCompletedAt: null, communityCompletedAt: null, videoCompletedAt: null,
    status: "IN_PROGRESS", completedAt: null,
    birthDate: null, phone: null, school: null, gradeLevel: null,
    guardianName: null, guardianDocument: null, guardianRelation: null, guardianPhone: null,
    guardianEmail: null, guardianSignature: null, guardianSignedAt: null, guardianshipId: null,
    program: null, priorExperience: null, preferredDays: null,
    discoveryBookingId: null, dppVideoUrl: null,
    createdAt: new Date("2026-08-01"), updatedAt: new Date("2026-08-01"),
    ...over,
  };
}

const post = async (body: unknown) => {
  const res = await POST(jsonReq("/api/admission", body));
  return { status: res.status, json: await res.json() };
};
const patchStep = async (body: unknown) => {
  const res = await PATCH(jsonReq("/api/admission/step", body, "PATCH"));
  return { status: res.status, json: await res.json() };
};
const postVideo = async (body: unknown) => {
  const res = await POST_VIDEO(jsonReq("/api/admission/video", body));
  return { status: res.status, json: await res.json() };
};
const get = async (qs = "") => {
  const res = await GET(new Request(`http://test.local/api/admission${qs}`));
  return { status: res.status, json: await res.json() };
};

beforeEach(() => {
  db.reset();
  vi.clearAllMocks();
  box.user = freshStudent();
  db.fn("admission.findUnique").mockResolvedValue(null);
  db.fn("admission.upsert").mockImplementation(async ({ create }: any) => admissionRow({ ...create }));
  db.fn("admission.update").mockImplementation(async ({ data }: any) => admissionRow({ ...data }));
  db.fn("admissionConsent.findMany").mockResolvedValue([]);
  db.fn("admissionConsent.upsert").mockResolvedValue({ id: "c1" });
  db.fn("user.update").mockResolvedValue({ id: "s1" });
  db.fn("user.findUnique").mockResolvedValue(null);
  db.fn("guardianship.findFirst").mockResolvedValue(null);
  db.fn("guardianship.findUnique").mockResolvedValue(null);
  db.fn("guardianship.create").mockImplementation(async ({ data }: any) => ({ id: "g-new", ...data }));
  db.fn("consultationBooking.findFirst").mockResolvedValue(null);
  db.fn("activityEvent.create").mockResolvedValue({ id: "ae1" });
});

// ============================================================
describe("guards de rol — quién puede leer", () => {
  it("sin sesión → 401 y no toca la base", async () => {
    box.user = null;
    const { status } = await get();
    expect(status).toBe(401);
    expect(db.fn("admission.findUnique")).not.toHaveBeenCalled();
  });

  it("un estudiante que pide la admisión de OTRO → 403 (no un 404 silencioso)", async () => {
    const { status, json } = await get("?studentId=s2");
    expect(status).toBe(403);
    expect(json.error).toMatch(/tu propia admisión/i);
    expect(db.fn("admission.findUnique")).not.toHaveBeenCalled();
  });

  it("un estudiante pidiendo su PROPIO id explícito → 200", async () => {
    const { status } = await get(`?studentId=${box.user.id}`);
    expect(status).toBe(200);
    expect(db.fn("admission.findUnique").mock.calls[0][0].where).toEqual({ studentId: box.user.id });
  });

  it("PARENT → 403: la admisión trae cédula y firma del tutor, y el vínculo puede estar PENDING", async () => {
    box.user = PARENT;
    const { status } = await get("?studentId=s1");
    expect(status).toBe(403);
    expect(db.fn("admission.findUnique")).not.toHaveBeenCalled();
  });

  it("coach (TEACHER) lee la de un alumno suyo → 200", async () => {
    box.user = COACH;
    db.fn("user.findUnique").mockResolvedValue({ id: "s1", name: "Analía", email: "a@x.com", role: "STUDENT", ageBand: "adult" });
    const { status, json } = await get("?studentId=s1");
    expect(status).toBe(200);
    expect(json.student.id).toBe("s1");
  });

  it("staff sin studentId → 400 (no hay 'mi admisión' para un coach)", async () => {
    box.user = ADMIN;
    const { status } = await get();
    expect(status).toBe(400);
  });

  it("staff pidiendo un id que no es de un estudiante → 404", async () => {
    box.user = ADMIN;
    db.fn("user.findUnique").mockResolvedValue({ id: "t1", role: "TEACHER", name: "Saúl", email: "s@x.com" });
    const { status } = await get("?studentId=t1");
    expect(status).toBe(404);
  });
});

describe("guards de rol — coach y admin son SOLO LECTURA", () => {
  it("coach NO puede guardar el formulario → 403", async () => {
    box.user = COACH;
    const { status } = await post(ADULT_FORM);
    expect(status).toBe(403);
    expect(db.fn("admission.upsert")).not.toHaveBeenCalled();
  });

  it("admin NO puede marcar un paso → 403", async () => {
    box.user = ADMIN;
    const { status } = await patchStep({ step: 2 });
    expect(status).toBe(403);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("PARENT NO puede registrar el vídeo → 403", async () => {
    box.user = PARENT;
    const { status } = await postVideo({ url: "/uploads/x.mp4" });
    expect(status).toBe(403);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("las tres escrituras rechazan sin sesión con 401", async () => {
    box.user = null;
    expect((await post(ADULT_FORM)).status).toBe(401);
    expect((await patchStep({ step: 2 })).status).toBe(401);
    expect((await postVideo({ url: "/uploads/x.mp4" })).status).toBe(401);
    expect(db.fn("admission.upsert")).not.toHaveBeenCalled();
  });

  it("un estudiante SIEMPRE escribe sobre su propia fila: el where sale de la sesión, no del body", async () => {
    await post({ ...ADULT_FORM, studentId: OTHER_STUDENT.id, id: "adm-ajena" });
    const call = db.fn("admission.upsert").mock.calls[0][0];
    expect(call.where).toEqual({ studentId: box.user.id });
    expect(call.create.studentId).toBe(box.user.id);
  });
});

// ============================================================
describe("orden de los pasos (regla de servidor)", () => {
  beforeEach(() => {
    db.fn("admission.findUnique").mockResolvedValue(admissionRow({ formCompletedAt: new Date("2026-08-02") }));
  });

  it("no deja completar el paso 3 con el 2 pendiente", async () => {
    const { status, json } = await patchStep({ step: 3 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/Completa el paso 2/);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("no deja saltar directo al paso 4", async () => {
    const { status, json } = await patchStep({ step: 4 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/Completa el paso 3/);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("el paso 1 no se 'marca': se completa guardando el formulario", async () => {
    db.fn("admission.findUnique").mockResolvedValue(admissionRow());
    const { status, json } = await patchStep({ step: 1 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/guardando el formulario/i);
  });

  it("sin admisión todavía → 400 (no se marca nada sobre la nada)", async () => {
    db.fn("admission.findUnique").mockResolvedValue(null);
    const { status, json } = await patchStep({ step: 2 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/formulario/i);
  });

  it("paso inválido (0, 5, texto) → 400 sin tocar la base", async () => {
    for (const step of [0, 5, "abc", null]) {
      const { status } = await patchStep({ step });
      expect(status).toBe(400);
    }
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("re-marcar un paso ya hecho es idempotente y NO reescribe el timestamp", async () => {
    const when = new Date("2026-08-02");
    db.fn("admission.findUnique").mockResolvedValue(admissionRow({ formCompletedAt: when, callCompletedAt: when }));
    const { status, json } = await patchStep({ step: 2 });
    expect(status).toBe(200);
    expect(json.already).toBe(true);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });
});

describe("paso 2 — se deriva de una reserva REAL, no de la palabra del cliente", () => {
  beforeEach(() => {
    db.fn("admission.findUnique").mockResolvedValue(admissionRow({ formCompletedAt: new Date("2026-08-02") }));
  });

  it("sin ConsultationBooking del alumno → 400", async () => {
    const { status, json } = await patchStep({ step: 2 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/Agenda tu llamada/i);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("con reserva viva → marca el paso y GUARDA a cuál corresponde", async () => {
    db.fn("consultationBooking.findFirst").mockResolvedValue({ id: "cb-9", slotAt: new Date() });
    const { status } = await patchStep({ step: 2 });
    expect(status).toBe(200);
    const data = db.fn("admission.update").mock.calls[0][0].data;
    expect(data.discoveryBookingId).toBe("cb-9");
    expect(data.callCompletedAt).toBeInstanceOf(Date);
  });

  it("la reserva se busca SOLO entre las del alumno (userId o su correo) y nunca CANCELLED", async () => {
    db.fn("consultationBooking.findFirst").mockResolvedValue({ id: "cb-9" });
    await patchStep({ step: 2, bookingId: "cb-ajena" });
    const where = db.fn("consultationBooking.findFirst").mock.calls[0][0].where;
    expect(where.status).toEqual({ not: "CANCELLED" });
    expect(where.OR).toEqual([{ userId: box.user.id }, { email: box.user.email }]);
    // El id pedido se AÑADE al filtro de propiedad: uno ajeno no encaja y no devuelve fila.
    expect(where.id).toBe("cb-ajena");
  });
});

describe("paso 4 — no se completa sin vídeo, y cierra la admisión", () => {
  const three = {
    formCompletedAt: new Date("2026-08-01"),
    callCompletedAt: new Date("2026-08-02"),
    communityCompletedAt: new Date("2026-08-03"),
  };

  it("sin dppVideoUrl → 400", async () => {
    db.fn("admission.findUnique").mockResolvedValue(admissionRow(three));
    const { status, json } = await patchStep({ step: 4 });
    expect(status).toBe(400);
    expect(json.error).toMatch(/vídeo/i);
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("con vídeo → completa, marca status COMPLETED y sella completedAt", async () => {
    db.fn("admission.findUnique").mockResolvedValue(admissionRow({ ...three, dppVideoUrl: "/uploads/a.mp4" }));
    const { status } = await patchStep({ step: 4 });
    expect(status).toBe(200);
    const data = db.fn("admission.update").mock.calls[0][0].data;
    expect(data.videoCompletedAt).toBeInstanceOf(Date);
    expect(data.status).toBe("COMPLETED");
    expect(data.completedAt).toBeInstanceOf(Date);
  });

  it("un paso intermedio NO cierra la admisión", async () => {
    db.fn("admission.findUnique").mockResolvedValue(admissionRow({ formCompletedAt: new Date(), callCompletedAt: new Date() }));
    await patchStep({ step: 3 });
    const data = db.fn("admission.update").mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
    expect(data.completedAt).toBeUndefined();
  });
});

describe("vídeo DPP — solo lo subido a la plataforma", () => {
  beforeEach(() => db.fn("admission.findUnique").mockResolvedValue(admissionRow({ formCompletedAt: new Date() })));

  it("acepta /uploads/*.mp4|webm|mov", async () => {
    for (const url of ["/uploads/2026/dpp.mp4", "/uploads/dpp.webm", "/uploads/dpp.MOV"]) {
      db.fn("admission.update").mockClear();
      const { status } = await postVideo({ url });
      expect(status).toBe(200);
      expect(db.fn("admission.update").mock.calls[0][0].data.dppVideoUrl).toBe(url);
    }
  });

  it("rechaza javascript:, https externo y un /uploads que no es vídeo", async () => {
    for (const url of ["javascript:alert(1)", "https://evil.example/x.mp4", "/uploads/factura.pdf", ""]) {
      const { status } = await postVideo({ url });
      expect(status).toBe(400);
    }
    expect(db.fn("admission.update")).not.toHaveBeenCalled();
  });

  it("guardar el vídeo NO completa el paso 4 (la regla de orden vive en un solo sitio)", async () => {
    await postVideo({ url: "/uploads/dpp.mp4" });
    const data = db.fn("admission.update").mock.calls[0][0].data;
    expect(data.videoCompletedAt).toBeUndefined();
    expect(data.status).toBeUndefined();
  });
});

// ============================================================
describe("validación en SERVIDOR del formulario (paso 1)", () => {
  it("sin consentimiento explícito → 400 y no escribe nada", async () => {
    for (const consent of [undefined, false, "si", 1]) {
      const { status, json } = await post({ ...ADULT_FORM, consent });
      expect(status).toBe(400);
      expect(json.error).toMatch(/consentimiento/i);
    }
    expect(db.fn("admission.upsert")).not.toHaveBeenCalled();
  });

  it("menor de 21 sin datos de tutor → 400 (política de la academia)", async () => {
    const { status, json } = await post({ ...ADULT_FORM, birthDate: "2007-03-09" });
    expect(status).toBe(400);
    expect(json.error).toMatch(/tutor/i);
    expect(db.fn("admission.upsert")).not.toHaveBeenCalled();
  });

  it("exige cada campo del bloque de tutor por separado", async () => {
    const cases: Array<[string, unknown, RegExp]> = [
      ["guardianName", "", /nombre completo/i],
      ["guardianDocument", "12", /cédula|pasaporte/i],
      ["guardianRelation", "AMIGO", /relación/i],
      ["guardianPhone", "123", /tutor/i],
      ["guardianSignature", "", /firma/i],
      ["guardianEmail", "no-es-correo", /correo del tutor/i],
    ];
    for (const [field, value, re] of cases) {
      const { status, json } = await post({ ...MINOR_FORM, [field]: value });
      expect(status, field).toBe(400);
      expect(json.error, field).toMatch(re);
    }
  });

  it("nombre, apellido, fecha y teléfono son obligatorios", async () => {
    expect((await post({ ...ADULT_FORM, firstName: "A" })).json.error).toMatch(/nombre/i);
    expect((await post({ ...ADULT_FORM, lastName: "" })).json.error).toMatch(/apellido/i);
    expect((await post({ ...ADULT_FORM, birthDate: "09-03-1996" })).json.error).toMatch(/nacimiento/i);
    expect((await post({ ...ADULT_FORM, birthDate: "2026-02-31" })).json.error).toMatch(/nacimiento/i);
    expect((await post({ ...ADULT_FORM, phone: "555" })).json.error).toMatch(/teléfono/i);
    expect(db.fn("admission.upsert")).not.toHaveBeenCalled();
  });

  it("los desplegables son ALLOWLIST: un valor inventado cae a null, no se guarda", async () => {
    await post({ ...ADULT_FORM, gradeLevel: "DOCTORADO", program: "KARATE", preferredDays: "VIERNES" });
    const create = db.fn("admission.upsert").mock.calls[0][0].create;
    expect(create.gradeLevel).toBeNull();
    expect(create.program).toBeNull();
    expect(create.preferredDays).toBeNull();
  });

  it("bloquea mass-assignment: status y los *CompletedAt del body se ignoran", async () => {
    await post({ ...ADULT_FORM, status: "COMPLETED", completedAt: "2020-01-01", videoCompletedAt: "2020-01-01", dppVideoUrl: "/uploads/x.mp4" });
    const create = db.fn("admission.upsert").mock.calls[0][0].create;
    expect(create.status).toBeUndefined();
    expect(create.completedAt).toBeUndefined();
    expect(create.videoCompletedAt).toBeUndefined();
    expect(create.dppVideoUrl).toBeUndefined();
  });

  it("un formulario válido completa el paso 1 y normaliza el teléfono a E.164", async () => {
    const { status } = await post(ADULT_FORM);
    expect(status).toBe(200);
    const create = db.fn("admission.upsert").mock.calls[0][0].create;
    expect(create.formCompletedAt).toBeInstanceOf(Date);
    expect(create.phone).toBe("+18095550123");
  });

  it("re-guardar NO reescribe formCompletedAt (falsificaría cuándo se completó)", async () => {
    const when = new Date("2026-08-02T10:00:00Z");
    db.fn("admission.findUnique").mockResolvedValue(admissionRow({ formCompletedAt: when }));
    await post(ADULT_FORM);
    expect(db.fn("admission.upsert").mock.calls[0][0].update.formCompletedAt).toBe(when);
  });

  it("nombre y correo NO se duplican en Admission: el formulario actualiza User.name", async () => {
    await post(ADULT_FORM);
    const create = db.fn("admission.upsert").mock.calls[0][0].create;
    expect(create.firstName).toBeUndefined();
    expect(create.lastName).toBeUndefined();
    expect(create.email).toBeUndefined();
    expect(create.name).toBeUndefined();
    const userData = db.fn("user.update").mock.calls[0][0].data;
    expect(userData.name).toBe("Analía Reyes");
    expect(userData.initials).toBe("AR");
    expect(userData.email).toBeUndefined();
  });
});

describe("edad — <21 pide tutor, <18 es MENOR: son dos umbrales distintos", () => {
  it("19 años: se le pide tutor pero User.ageBand queda 'adult'", async () => {
    await post({ ...MINOR_FORM, birthDate: "2007-03-09" });
    const userData = db.fn("user.update").mock.calls[0][0].data;
    expect(userData.ageBand).toBe("adult");
    expect(userData.birthYear).toBe(2007);
    expect(db.fn("admission.upsert").mock.calls[0][0].create.guardianName).toBe("Rosa Fermín");
  });

  it("15 años: tutor exigido Y ageBand 'minor'", async () => {
    await post(MINOR_FORM);
    expect(db.fn("user.update").mock.calls[0][0].data.ageBand).toBe("minor");
  });

  it("30 años: ni tutor ni firma", async () => {
    const { status } = await post(ADULT_FORM);
    expect(status).toBe(200);
    const create = db.fn("admission.upsert").mock.calls[0][0].create;
    expect(create.guardianName).toBeNull();
    expect(create.guardianSignature).toBeNull();
    expect(create.guardianSignedAt).toBeNull();
  });
});

// ============================================================
describe("consentimiento — la prueba legal", () => {
  it("registra el TEXTO EXACTO, la versión, quién lo aceptó y en qué calidad", async () => {
    await post(ADULT_FORM);
    const calls = db.fn("admissionConsent.upsert").mock.calls;
    expect(calls).toHaveLength(1);
    const { where, update, create } = calls[0][0];
    expect(create.text).toBe(CONSENT_TEXT_DATA);
    expect(create.version).toBe(CONSENT_VERSION);
    expect(create.kind).toBe(CONSENT_KIND_DATA);
    expect(create.acceptedByRole).toBe("student");
    expect(create.acceptedByName).toBe("Analía Reyes");
    expect(create.acceptedByUserId).toBe(box.user.id);
    expect(create.studentId).toBe(box.user.id);
    // Insert-only: el update vacío garantiza que una prueba ya escrita jamás se modifica.
    expect(update).toEqual({});
    expect(where.admissionId_kind_version).toEqual({
      admissionId: "adm-1", kind: CONSENT_KIND_DATA, version: CONSENT_VERSION,
    });
  });

  it("la firma del tutor deja su PROPIA fila, con el nombre del FIRMANTE (no el del alumno)", async () => {
    await post(MINOR_FORM);
    const calls = db.fn("admissionConsent.upsert").mock.calls;
    expect(calls).toHaveLength(2);
    const guardian = calls.map((c: any) => c[0].create).find((c: any) => c.kind === CONSENT_KIND_GUARDIAN);
    expect(guardian.text).toBe(CONSENT_TEXT_GUARDIAN);
    expect(guardian.acceptedByName).toBe("Rosa Fermín");
    expect(guardian.acceptedByRole).toBe("guardian");
    // Quién ENVIÓ sigue registrado aparte: la sesión es la del alumno.
    expect(guardian.acceptedByUserId).toBe(box.user.id);
  });

  it("un alumno sin tutor NO genera fila de firma", async () => {
    await post(ADULT_FORM);
    const kinds = db.fn("admissionConsent.upsert").mock.calls.map((c: any) => c[0].create.kind);
    expect(kinds).toEqual([CONSENT_KIND_DATA]);
  });

  it("el texto y la versión van atados: cambiar el texto sin subir la versión es imposible", () => {
    // El @@unique([admissionId, kind, version]) + el update vacío hacen que, con la versión
    // intacta, un texto nuevo NUNCA se escriba. Este test fija el contrato de la constante.
    expect(CONSENT_VERSION).toMatch(/^\d{4}-\d{2}$/);
    expect(CONSENT_TEXT_DATA.length).toBeGreaterThan(40);
    expect(CONSENT_TEXT_GUARDIAN).toMatch(/tutor legal/i);
  });

  it("la lectura devuelve la evidencia entera (texto, versión, quién, cuándo)", () => {
    const payload = admissionPayload(admissionRow({ formCompletedAt: new Date("2026-08-01") }) as any, [
      { kind: CONSENT_KIND_GUARDIAN, version: CONSENT_VERSION, text: CONSENT_TEXT_GUARDIAN, acceptedByName: "Rosa Fermín", acceptedByRole: "guardian", createdAt: new Date("2026-08-01T15:00:00Z") },
    ]);
    expect(payload.consents[0]).toEqual({
      kind: CONSENT_KIND_GUARDIAN,
      version: CONSENT_VERSION,
      text: CONSENT_TEXT_GUARDIAN,
      acceptedByName: "Rosa Fermín",
      acceptedByRole: "guardian",
      acceptedAt: "2026-08-01T15:00:00.000Z",
    });
  });
});

// ============================================================
describe("enlace con Guardianship (no un sistema paralelo)", () => {
  it("MENOR con vínculo ya existente → la admisión apunta a ESE vínculo", async () => {
    db.fn("guardianship.findFirst").mockResolvedValue({ id: "g-rosa-df", status: "ACTIVE" });
    await post(MINOR_FORM);
    expect(db.fn("admission.upsert").mock.calls[0][0].create.guardianshipId).toBe("g-rosa-df");
    expect(db.fn("guardianship.create")).not.toHaveBeenCalled();
  });

  it("MENOR + correo de un PARENT existente → crea el vínculo PENDING, initiatedBy 'student'", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: "p1", role: "PARENT", email: "rosa@x.com" });
    await post({ ...MINOR_FORM, guardianEmail: "rosa@x.com" });
    const data = db.fn("guardianship.create").mock.calls[0][0].data;
    // La regla §11.3 intacta: el alumno DECLARA, el padre confirma. Nada se activa aquí.
    expect(data.status).toBe("PENDING");
    expect(data.initiatedBy).toBe("student");
    expect(data.consentLevel).toBe("standard");
    expect(db.fn("activityEvent.create")).toHaveBeenCalled();
  });

  it("MENOR + correo que NO es de un PARENT → sin vínculo (nunca huérfano)", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: "x", role: "STUDENT" });
    await post({ ...MINOR_FORM, guardianEmail: "otro@x.com" });
    expect(db.fn("guardianship.create")).not.toHaveBeenCalled();
    expect(db.fn("admission.upsert").mock.calls[0][0].create.guardianshipId).toBeNull();
  });

  it("ADULTO de 19 con datos de tutor → NUNCA se le cuelga una tutela", async () => {
    db.fn("user.findUnique").mockResolvedValue({ id: "p1", role: "PARENT", email: "rosa@x.com" });
    await post({ ...MINOR_FORM, birthDate: "2007-03-09", guardianEmail: "rosa@x.com" });
    expect(db.fn("guardianship.findFirst")).not.toHaveBeenCalled();
    expect(db.fn("guardianship.create")).not.toHaveBeenCalled();
    expect(db.fn("admission.upsert").mock.calls[0][0].create.guardianshipId).toBeNull();
  });
});

// ============================================================
describe("helpers puros de input.ts", () => {
  it("parseBirthDate acepta AAAA-MM-DD y rechaza fechas que no existen", () => {
    expect(parseBirthDate("2011-04-18")?.getDate()).toBe(18);
    expect(parseBirthDate("2011-04-18")?.getHours()).toBe(12); // mediodía local: RD es UTC-4
    expect(parseBirthDate("2026-02-31")).toBeNull();
    expect(parseBirthDate("18/04/2011")).toBeNull();
    expect(parseBirthDate("")).toBeNull();
  });

  it("ageFromBirthDate cuenta el cumpleaños, no solo el año", () => {
    const born = new Date(2007, 7, 20, 12); // 20/08/2007
    expect(ageFromBirthDate(born, new Date(2026, 7, 19))).toBe(18); // un día antes
    expect(ageFromBirthDate(born, new Date(2026, 7, 20))).toBe(19); // el mismo día
  });

  it("normalizePhone lleva el móvil dominicano a E.164 y rechaza basura", () => {
    expect(normalizePhone("(809) 555-0123")).toBe("+18095550123");
    expect(normalizePhone("829 555 0177")).toBe("+18295550177");
    expect(normalizePhone("1 849 555 0100")).toBe("+18495550100");
    expect(normalizePhone("+34 600 123 456")).toBe("+34600123456");
    expect(normalizePhone("555-0123")).toBeNull();
    expect(normalizePhone("no soy un teléfono")).toBeNull();
  });

  it("safeDppVideoUrl solo deja pasar vídeo subido a la plataforma", () => {
    expect(safeDppVideoUrl("/uploads/a.mp4")).toBe("/uploads/a.mp4");
    expect(safeDppVideoUrl("/uploads/a.mp4?v=2")).toBe("/uploads/a.mp4?v=2");
    expect(safeDppVideoUrl("https://youtube.com/watch?v=x")).toBeNull();
    expect(safeDppVideoUrl("/uploads/a.pdf")).toBeNull();
    expect(safeDppVideoUrl("javascript:alert(1)")).toBeNull();
  });

  it("previousStepsDone: el paso 1 nunca está bloqueado; el resto sí", () => {
    const empty = admissionRow() as any;
    expect(previousStepsDone(empty, 1)).toBe(true);
    expect(previousStepsDone(empty, 2)).toBe(false);
    expect(previousStepsDone(null, 1)).toBe(true);
    const two = admissionRow({ formCompletedAt: new Date(), callCompletedAt: new Date() }) as any;
    expect(previousStepsDone(two, 3)).toBe(true);
    expect(previousStepsDone(two, 4)).toBe(false);
  });

  it("cleanAdmissionForm no deja pasar el correo (la identidad no se cambia desde aquí)", () => {
    const out = cleanAdmissionForm({ ...ADULT_FORM, email: "otro@x.com" } as any);
    expect(out.error).toBeNull();
    expect(out.data).not.toHaveProperty("email");
  });

  it("admissionPayload sin admisión: 0 de 4, con el rail bloqueado y sin inventar fila", () => {
    const p = admissionPayload(null);
    expect(p.exists).toBe(false);
    expect(p.stepsDone).toBe(0);
    expect(p.percent).toBe(0);
    expect(p.steps.map((s) => s.locked)).toEqual([false, true, true, true]);
  });

  it("admissionPayload con 2 de 4: porcentaje, estados del rail y timestamps", () => {
    const p = admissionPayload(
      admissionRow({ formCompletedAt: new Date("2026-08-01"), callCompletedAt: new Date("2026-08-02") }) as any,
    );
    expect(p.stepsDone).toBe(2);
    expect(p.percent).toBe(50);
    expect(p.steps.map((s) => s.done)).toEqual([true, true, false, false]);
    expect(p.steps.map((s) => s.locked)).toEqual([false, false, false, true]);
    expect(p.steps[0].completedAt).toBe("2026-08-01T00:00:00.000Z");
  });

  it("admissionPayload escapa el texto libre UNA vez (contrato de escape del repo)", () => {
    const p = admissionPayload(
      admissionRow({ school: 'Colegio <img src=x onerror="alert(1)">', guardianName: "Rosa & Cía" }) as any,
    );
    expect(p.form!.school).not.toContain("<img");
    expect(p.form!.school).toContain("&lt;img");
    expect(p.guardian!.name).toBe("Rosa &amp; Cía");
  });
});
