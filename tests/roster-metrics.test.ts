// [BUG-ROSTER-REAL] computeRosterMetrics (app/lib/queries.ts) reemplaza las columnas
// Enrollment.grade/attendance/engagement/trend/risk (@default sembrado, nunca recalculado)
// por analítica REAL derivada de Submission/QuizAttempt/Booking/LessonProgress/ActivityEvent.
// Es una función PURA (recibe agregaciones ya resueltas, no toca Prisma) — se testea directo,
// sin mockear la DB. Solo mockeamos app/lib/db porque queries.ts lo importa a nivel de módulo
// (import { db } from "./db") — computeRosterMetrics nunca lo usa.
import { describe, it, expect, vi } from "vitest";

vi.mock("../app/lib/db", () => ({ db: {} }));

import { computeRosterMetrics, type RosterMetricsInput } from "../app/lib/queries";

const NOW = new Date("2026-07-17T12:00:00Z").getTime();
const DAY = 86400000;

function baseInput(overrides: Partial<RosterMetricsInput> = {}): RosterMetricsInput {
  return {
    progressPct: 80,
    gradeFromSubmissions: null,
    gradeFromQuizzes: null,
    bookingCompleted: 0,
    bookingRelevant: 0,
    lastEventAt: null,
    recentLast7: 0,
    recentPrior7: 0,
    nowMs: NOW,
    lang: "es",
    ...overrides,
  };
}

describe("computeRosterMetrics — grade", () => {
  it("usa el promedio de Submission GRADED cuando existe", () => {
    const m = computeRosterMetrics(baseInput({ gradeFromSubmissions: 88, gradeFromQuizzes: 60 }));
    expect(m.grade).toBe(88);
  });

  it("cae a quiz attempts cuando no hay Submission GRADED", () => {
    const m = computeRosterMetrics(baseInput({ gradeFromSubmissions: null, gradeFromQuizzes: 72 }));
    expect(m.grade).toBe(72);
  });

  it("es null (no un 0 falso) cuando no hay ninguna señal de nota", () => {
    const m = computeRosterMetrics(baseInput({ gradeFromSubmissions: null, gradeFromQuizzes: null }));
    expect(m.grade).toBeNull();
  });
});

describe("computeRosterMetrics — attendance", () => {
  it("completed/relevant (CONFIRMED+COMPLETED) redondeado", () => {
    const m = computeRosterMetrics(baseInput({ bookingCompleted: 3, bookingRelevant: 4 }));
    expect(m.att).toBe(75);
  });

  it("es null cuando el alumno nunca tuvo un booking CONFIRMED/COMPLETED con este coach", () => {
    const m = computeRosterMetrics(baseInput({ bookingCompleted: 0, bookingRelevant: 0 }));
    expect(m.att).toBeNull();
  });
});

describe("computeRosterMetrics — engagement / trend / last", () => {
  it("sin ActivityEvent NUNCA → eng '—', trend 'flat', last '—' (honesto, no 'Medio' inventado)", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: null, recentLast7: 0, recentPrior7: 0 }));
    expect(m.eng).toBe("—");
    expect(m.trend).toBe("flat");
    expect(m.last).toBe("—");
  });

  it("con historial pero 0 eventos en 14 días → 'Bajo' (inactividad medida, no 'sin señal')", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: new Date(NOW - 30 * DAY), recentLast7: 0, recentPrior7: 0 }));
    expect(m.eng).toBe("Bajo");
  });

  it(">=6 eventos en 14 días → 'Alto'", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: new Date(NOW), recentLast7: 4, recentPrior7: 3 }));
    expect(m.eng).toBe("Alto");
  });

  it(">=2 y <6 eventos en 14 días → 'Medio'", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: new Date(NOW), recentLast7: 1, recentPrior7: 1 }));
    expect(m.eng).toBe("Medio");
  });

  it("trend 'up' cuando la última semana tuvo más actividad que la anterior", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: new Date(NOW), recentLast7: 5, recentPrior7: 1 }));
    expect(m.trend).toBe("up");
  });

  it("trend 'down' cuando la última semana tuvo menos actividad que la anterior", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: new Date(NOW), recentLast7: 1, recentPrior7: 5 }));
    expect(m.trend).toBe("down");
  });

  it("last usa el label relativo (whenLabel) sobre la fecha real más reciente", () => {
    const m = computeRosterMetrics(baseInput({ lastEventAt: new Date(NOW - DAY) }));
    expect(m.last).toContain("día");
  });
});

describe("computeRosterMetrics — risk (umbral: progreso <50% Y (nunca activo O 14+ días inactivo))", () => {
  it("progreso alto → nunca en riesgo aunque no haya actividad reciente", () => {
    const m = computeRosterMetrics(baseInput({ progressPct: 90, lastEventAt: null }));
    expect(m.risk).toBe(false);
  });

  it("progreso bajo + activo hace pocos días → NO en riesgo", () => {
    const m = computeRosterMetrics(baseInput({ progressPct: 20, lastEventAt: new Date(NOW - 2 * DAY) }));
    expect(m.risk).toBe(false);
  });

  it("progreso bajo + 14+ días sin actividad → en riesgo", () => {
    const m = computeRosterMetrics(baseInput({ progressPct: 20, lastEventAt: new Date(NOW - 15 * DAY) }));
    expect(m.risk).toBe(true);
  });

  it("progreso bajo + nunca tuvo actividad → en riesgo", () => {
    const m = computeRosterMetrics(baseInput({ progressPct: 0, lastEventAt: null }));
    expect(m.risk).toBe(true);
  });

  it("progreso justo en el umbral (50) NO cuenta como bajo", () => {
    const m = computeRosterMetrics(baseInput({ progressPct: 50, lastEventAt: null }));
    expect(m.risk).toBe(false);
  });
});

describe("computeRosterMetrics — prog", () => {
  it("redondea el progressPct recibido", () => {
    const m = computeRosterMetrics(baseInput({ progressPct: 66.666 }));
    expect(m.prog).toBe(67);
  });
});
