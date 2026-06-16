// OTR Debate Hub · /api/debates
//   POST  — registra una ronda, recalcula el rating Glicko-2 del usuario,
//           persiste el RatingUpdate, opcionalmente el ballot + rúbrica
//           (nudgeando las StudentSkill) y escribe el ActivityEvent.
//   GET   — historial del usuario (DebateRecord + su RatingUpdate), 50 más recientes.
//
// PRD §6: el rating SOLO se mueve aquí (ronda adjudicada). El oponente se modela
// con su rating real (si se conoce) o el default 1500/RD 350.
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";
import { ok, bad, readJson, clean, safeUrl, safeVideoUrl } from "../../lib/api";
import { logActivitySafe } from "../../lib/activity";
import { updateRating, tierFor } from "../../lib/glicko2";

// RD por defecto del oponente cuando solo conocemos su rating (rondas adjudicadas).
const DEFAULT_OPP_RD = 350;

// Resultado del jugador → score Glicko-2 (1 win / 0.5 draw / 0 loss).
function scoreFor(result: string): number {
  if (result === "WIN") return 1;
  if (result === "DRAW") return 0.5;
  return 0; // LOSS
}

const VALID_RESULTS = new Set(["WIN", "LOSS", "DRAW"]);
const VALID_SOURCES = new Set(["OTR", "EXTERNAL"]);
const VALID_CRITERIA = new Set(["Argumentation", "Rebuttal", "Delivery", "Evidence/Research", "Crossfire"]);

// Mapea cada criterio del ballot (0-10) a una o más StudentSkill (0-100) del usuario.
// Argumentation toca Estructura + Evidencia; Rebuttal→Refutación; Delivery→Delivery;
// Crossfire→Cross-ex; Evidence/Research→Evidencia. Confianza no tiene criterio directo.
const CRITERION_TO_SKILLS: Record<string, string[]> = {
  Argumentation: ["Estructura", "Evidencia"],
  Rebuttal: ["Refutación"],
  Delivery: ["Delivery"],
  Crossfire: ["Cross-ex"],
  "Evidence/Research": ["Evidencia"],
};

function clampSkill(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const body = await readJson<{
    format?: string;
    side?: string;
    opponent?: string;
    partner?: string;
    result?: string;
    source?: string;
    eventName?: string;
    roundLabel?: string;
    opponentRating?: unknown;
    adjudicated?: unknown;
    targetUserId?: string;
    ballot?: {
      judge?: string;
      comments?: string;
      recordingUrl?: string;
      scores?: Array<{ criterion?: string; score?: unknown; flagged?: unknown }>;
    };
  }>(req);

  const result = clean(body.result, 8).toUpperCase();
  if (!VALID_RESULTS.has(result)) return bad("result inválido (WIN | LOSS | DRAW)");

  const format = clean(body.format, 16) || "PF";
  const source = VALID_SOURCES.has(clean(body.source, 16).toUpperCase())
    ? clean(body.source, 16).toUpperCase()
    : "OTR";
  const sideRaw = clean(body.side, 8).toUpperCase();
  const side = sideRaw === "PRO" || sideRaw === "CON" ? sideRaw : null;
  const opponent = clean(body.opponent, 120) || null;
  const partner = clean(body.partner, 120) || null;
  const eventName = clean(body.eventName, 160) || null;
  const roundLabel = clean(body.roundLabel, 80) || null;

  // --- ANTI-GAMING (PRD §6.2): el rating SOLO se mueve en rondas ADJUDICADAS. ---
  // Una ronda se adjudica SOLO si la registra un coach/admin (TEACHER|ADMIN). El
  // flag body.adjudicated NO es de confianza: un STUDENT podría enviarlo para
  // inflar su rating contra un opponentRating falso, así que se IGNORA para
  // alumnos (solo isJudgeRole adjudica). Los auto-reportes de un STUDENT quedan en
  // el historial con adjudicated=false: SÍ se guarda el DebateRecord (y su
  // ballot/skill nudge) pero NO se crea RatingUpdate ni se mueve el rating.
  const isJudgeRole = user.role === "TEACHER" || user.role === "ADMIN";

  // [§6.5/§7.5] Adjudicación coach→alumno: un TEACHER/ADMIN puede adjudicar la ronda de
  // UN ALUMNO (body.targetUserId). El rating, el ballot (rúbrica) y los nudges de skill
  // se aplican al ALUMNO (subject), no al coach; el coach queda registrado en adjudicatedBy.
  // Authz de relación (T&S §7.4 — nadie escribe en el rating de un menor sin vínculo de
  // coaching): ADMIN puede a cualquier alumno; TEACHER solo a alumnos con reserva con él o
  // inscritos en un curso que imparte. Sin targetUserId → flujo original (auto-reporte propio).
  const targetUserId = clean(body.targetUserId, 64);
  let subject = user;
  if (targetUserId && targetUserId !== user.id) {
    if (!isJudgeRole) return bad("Solo un coach o admin puede adjudicar la ronda de otro alumno", 403);
    const target = await db.user.findUnique({ where: { id: targetUserId } });
    if (!target) return bad("Alumno no encontrado", 404);
    if (target.role !== "STUDENT") return bad("Solo se adjudican rondas de alumnos", 400);
    if (user.role === "TEACHER") {
      const booked = await db.booking.count({ where: { coachId: user.id, studentId: target.id } });
      const enrolled = booked > 0 ? 1 : await db.enrollment.count({ where: { userId: target.id, course: { teacher: { email: user.email } } } });
      if (booked === 0 && enrolled === 0) return bad("Solo puedes adjudicar rondas de tus alumnos (con reserva contigo o inscritos en tu curso)", 403);
    }
    subject = target;
  }
  // El rating SOLO se mueve en rondas adjudicadas. isJudgeRole es true tanto al auto-
  // registrar un coach como al adjudicar a un alumno → ambos adjudican; un alumno que
  // auto-reporta (isJudgeRole=false) queda en el historial SIN mover su rating.
  const adjudicated = isJudgeRole; // server-trusted: el rol decide, no el cliente

  // Rating del oponente: NUNCA confíes en un opponentRating arbitrario de un alumno.
  // Solo lo aceptamos en rondas adjudicadas por un coach (oponente real conocido).
  // Si no, anclamos al propio rating del usuario → resultado ~neutral en Glicko-2
  // (cualquier movimiento residual igualmente se descarta porque no se adjudica).
  let opponentRating = Number(body.opponentRating);
  if (!adjudicated || !Number.isFinite(opponentRating)) opponentRating = subject.debateRating;
  opponentRating = Math.max(100, Math.min(4000, opponentRating));

  // --- Estado de rating actual del DEBATIENTE (subject) — terna Glicko-2. ---
  const ratingBefore = subject.debateRating;
  const tierBefore = subject.debateTier;

  // --- Recalcular con un solo oponente adjudicado. ---
  const next = updateRating(
    { rating: subject.debateRating, rd: subject.debateRd, vol: subject.debateVol },
    [{ rating: opponentRating, rd: DEFAULT_OPP_RD, score: scoreFor(result) }],
  );
  // Si NO se adjudica, el rating no se mueve: after == before, tier intacto.
  const ratingAfter = adjudicated ? next.rating : ratingBefore;
  const tierAfter = adjudicated ? tierFor(ratingAfter) : tierBefore;
  const promoted = adjudicated && tierAfter !== tierBefore && ratingAfter > ratingBefore;

  // --- Crear el DebateRecord (marca quién adjudicó, si aplica). ---
  const record = await db.debateRecord.create({
    data: {
      userId: subject.id, format, side, opponent, partner, result, source, eventName, roundLabel,
      adjudicated,
      adjudicatedBy: adjudicated ? user.id : null,
    },
  });

  if (adjudicated) {
    // --- Actualizar la terna de rating + tier del usuario. ---
    await db.user.update({
      where: { id: subject.id },
      data: {
        debateRating: ratingAfter,
        debateRd: next.rd,
        debateVol: next.vol,
        debateTier: tierAfter,
      },
    });

    // --- Persistir el RatingUpdate (1:1 con el DebateRecord). ---
    await db.ratingUpdate.create({
      data: {
        debateId: record.id,
        ratingBefore,
        ratingAfter,
        rdAfter: next.rd,
        volAfter: next.vol,
        tierAfter,
      },
    });
  }

  // --- Ballot opcional: rúbrica por criterio + nudge de StudentSkill. ---
  // skillBumps acumula el objetivo (0-100) por skill; skillBumpLedger registra el
  // {skill, before, after} real tras el blend, para la atribución exacta (§8.2).
  const skillBumps: Record<string, number> = {};
  const skillBumpLedger: Array<{ skill: string; before: number; after: number }> = [];
  if (body.ballot && Array.isArray(body.ballot.scores) && body.ballot.scores.length) {
    const judge = clean(body.ballot.judge, 120) || (subject.id !== user.id ? (user.name || "Coach OTR") : null);
    const comments = clean(body.ballot.comments, 4000) || null;
    const recordingUrl = safeVideoUrl(body.ballot.recordingUrl, 400);

    // Filtrar a criterios válidos con score 0-10.
    const rows = body.ballot.scores
      .map((s) => ({
        criterion: clean(s?.criterion, 40),
        score: Math.max(0, Math.min(10, Math.round(Number(s?.score)))),
        flagged: Boolean(s?.flagged),
      }))
      .filter((s) => VALID_CRITERIA.has(s.criterion) && Number.isFinite(s.score));

    if (rows.length) {
      await db.ballot.create({
        data: {
          debateId: record.id,
          judge,
          comments,
          recordingUrl,
          scores: { create: rows.map((r) => ({ criterion: r.criterion, score: r.score, flagged: r.flagged })) },
        },
      });

      // Nudge: el criterio (0-10) marca un objetivo en 0-100 (score*10). Movemos
      // la skill ~30% hacia ese objetivo, para que suba/baje suavemente con cada ronda.
      for (const r of rows) {
        const target = r.score * 10; // 0-10 → 0-100
        for (const skill of CRITERION_TO_SKILLS[r.criterion] ?? []) {
          // Acumula el objetivo si varios criterios apuntan a la misma skill.
          skillBumps[skill] = skillBumps[skill] === undefined ? target : Math.max(skillBumps[skill], target);
        }
      }

      for (const [skill, target] of Object.entries(skillBumps)) {
        const existing = await db.studentSkill.findUnique({
          where: { userId_skill: { userId: subject.id, skill } },
        });
        const current = existing?.score ?? 0;
        const blended = clampSkill(current + (target - current) * 0.3);
        await db.studentSkill.upsert({
          where: { userId_skill: { userId: subject.id, skill } },
          update: { score: blended },
          create: { userId: subject.id, skill, score: blended },
        });
        // §8.2: atribución exacta — guarda el antes/después real del nudge.
        skillBumpLedger.push({ skill, before: current, after: blended });
      }
    }
  }

  // --- ActivityEvent (spine): victoria/derrota con delta de rating en meta. ---
  const delta = Math.round(ratingAfter - ratingBefore);
  const type = result === "WIN" ? "debate_win" : result === "LOSS" ? "debate_loss" : "debate_win";
  const verb = result === "WIN" ? "Ganó" : result === "LOSS" ? "Perdió" : "Empató";
  const vs = opponent ? ` vs ${opponent}` : "";
  const where = eventName ? ` · ${eventName}` : "";
  await logActivitySafe({
    userId: subject.id,
    type,
    title: `${verb} ronda ${format}${vs}${where}`,
    detail: roundLabel || null,
    source: "debate",
    refId: record.id,
    meta: {
      result,
      format,
      adjudicated,
      ratingBefore: Math.round(ratingBefore),
      ratingAfter: Math.round(ratingAfter),
      delta,
      tierBefore,
      tierAfter,
      promoted,
      // §8.2: atribución exacta del evento a las skills movidas (en vez de heurística
      // por texto). Vacío si no hubo ballot / nudge. Forma: [{skill, before, after}].
      skillBumps: skillBumpLedger,
    },
  });

  return ok({
    debateId: record.id,
    adjudicated,
    ratingBefore: Math.round(ratingBefore),
    ratingAfter: Math.round(ratingAfter),
    tierBefore,
    tierAfter,
    promoted,
  });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);

  const records = await db.debateRecord.findMany({
    where: { userId: user.id },
    orderBy: { recordedAt: "desc" },
    take: 50,
    include: { rating: true },
  });

  // Forma compacta para la UI: cada ronda con su rating after/delta.
  const debates = records.map((r) => ({
    id: r.id,
    format: r.format,
    side: r.side,
    opponent: r.opponent,
    partner: r.partner,
    result: r.result,
    source: r.source,
    eventName: r.eventName,
    roundLabel: r.roundLabel,
    recordedAt: r.recordedAt,
    ratingBefore: r.rating ? Math.round(r.rating.ratingBefore) : null,
    ratingAfter: r.rating ? Math.round(r.rating.ratingAfter) : null,
    tierAfter: r.rating?.tierAfter ?? null,
    delta: r.rating ? Math.round(r.rating.ratingAfter - r.rating.ratingBefore) : null,
  }));

  return ok({ debates });
}
