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
    partnerUserId?: string;
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

  // [RATING-1 §6.2] PF/Policy/Parli/Worlds son 2v2: el coach puede nombrar al COMPAÑERO
  // real (body.partnerUserId) para que SU rating también se mueva con el resultado de
  // equipo. Misma authz de relación que el subject (el coach solo adjudica a sus alumnos);
  // solo aplica en formatos de equipo y cuando adjudica un coach/admin (isJudgeRole).
  const TEAM_FORMATS = new Set(["PF", "POLICY", "PARLI", "WORLDS"]);
  const isTeamFormat = TEAM_FORMATS.has(format.toUpperCase());
  const partnerUserId = clean(body.partnerUserId, 64);
  let partnerUser: Awaited<ReturnType<typeof db.user.findUnique>> = null;
  if (partnerUserId && partnerUserId !== subject.id && isTeamFormat && isJudgeRole) {
    const p = await db.user.findUnique({ where: { id: partnerUserId } });
    if (!p) return bad("Compañero no encontrado", 404);
    if (p.role !== "STUDENT") return bad("El compañero de equipo debe ser un alumno", 400);
    if (user.role === "TEACHER") {
      const booked = await db.booking.count({ where: { coachId: user.id, studentId: p.id } });
      const enrolled = booked > 0 ? 1 : await db.enrollment.count({ where: { userId: p.id, course: { teacher: { email: user.email } } } });
      if (booked === 0 && enrolled === 0) return bad("Solo puedes adjudicar al compañero si también es tu alumno (con reserva contigo o inscrito en tu curso)", 403);
    }
    partnerUser = p;
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
      userId: subject.id, format, side, opponent,
      // [RATING-1] si se nombró un compañero REAL, su nombre y su User.id quedan en el record.
      partner: partnerUser ? partnerUser.name : partner,
      partnerUserId: partnerUser ? partnerUser.id : null,
      result, source, eventName, roundLabel,
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

  // [RATING-1 §6.2] El COMPAÑERO de equipo comparte el resultado: su rating se mueve con
  // su PROPIA terna Glicko-2 vs el mismo oponente. Tiene su DebateRecord + RatingUpdate
  // propios (su historial), con partnerUserId apuntando de vuelta al subject. NO hereda
  // la rúbrica ni los nudges de skill del subject (eso es individual de cada orador).
  if (partnerUser && adjudicated) {
    // El oponente del COMPAÑERO se ancla a SU PROPIO rating cuando no se conoce el rating
    // real del rival (ningún cliente lo envía hoy): así obtiene el mismo baseline neutral
    // (E≈0.5) que el subject. Anclarlo al rating del subject distorsionaría su movimiento
    // según la brecha entre ambos (un WIN apenas movería a un compañero mucho mejor, etc.).
    let partnerOpp = Number(body.opponentRating);
    if (!Number.isFinite(partnerOpp)) partnerOpp = partnerUser.debateRating;
    partnerOpp = Math.max(100, Math.min(4000, partnerOpp));
    const pNext = updateRating(
      { rating: partnerUser.debateRating, rd: partnerUser.debateRd, vol: partnerUser.debateVol },
      [{ rating: partnerOpp, rd: DEFAULT_OPP_RD, score: scoreFor(result) }],
    );
    const pTierAfter = tierFor(pNext.rating);
    // Atómico: record + update de rating + RatingUpdate del compañero, todos o ninguno
    // (sin dejar un DebateRecord sin su RatingUpdate ante un fallo a mitad de la secuencia).
    const pRecord = await db.$transaction(async (tx) => {
      const rec = await tx.debateRecord.create({
        data: {
          userId: partnerUser.id, format, side, opponent,
          partner: subject.name, partnerUserId: subject.id,
          result, source, eventName, roundLabel,
          adjudicated: true, adjudicatedBy: user.id,
        },
      });
      await tx.user.update({
        where: { id: partnerUser.id },
        data: { debateRating: pNext.rating, debateRd: pNext.rd, debateVol: pNext.vol, debateTier: pTierAfter },
      });
      await tx.ratingUpdate.create({
        data: {
          debateId: rec.id,
          ratingBefore: partnerUser.debateRating,
          ratingAfter: pNext.rating,
          rdAfter: pNext.rd,
          volAfter: pNext.vol,
          tierAfter: pTierAfter,
        },
      });
      return rec;
    });
    await logActivitySafe({
      userId: partnerUser.id,
      type: result === "LOSS" ? "debate_loss" : "debate_win",
      title: `${result === "WIN" ? "Ganó" : result === "LOSS" ? "Perdió" : "Empató"} ronda ${format}${opponent ? ` vs ${opponent}` : ""}${eventName ? ` · ${eventName}` : ""}`,
      detail: `En equipo con ${subject.name}`,
      source: "debate",
      refId: pRecord.id,
      meta: {
        result, format, adjudicated: true,
        ratingBefore: Math.round(partnerUser.debateRating),
        ratingAfter: Math.round(pNext.rating),
        delta: Math.round(pNext.rating - partnerUser.debateRating),
        tierBefore: partnerUser.debateTier,
        tierAfter: pTierAfter,
        promoted: pTierAfter !== partnerUser.debateTier && pNext.rating > partnerUser.debateRating,
        partnerOf: subject.id,
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

      // [RATING-2 §6.2] Speaker Rating del subject: SEPARADO del rating de victoria/derrota.
      // Cada ronda JUZGADA aporta un puntaje de oratoria = media de la rúbrica (0-10) ×10
      // → 0-100, acumulado como promedio móvil. (El resultado W/L mide quién ganó; el
      // speaker rating mide qué tan bien hablaste, como los "speaker points" reales.)
      if (adjudicated) {
        const roundSpeaker = (rows.reduce((s, r) => s + r.score, 0) / rows.length) * 10; // 0-100
        // Read-modify-write del promedio móvil en una transacción: lee el estado actual del
        // DB (no del objeto de sesión, que puede no traerlo) y escribe atómicamente, para que
        // dos ballots concurrentes del mismo alumno no pisen el promedio ni pierdan una ronda.
        await db.$transaction(async (tx) => {
          const cur = await tx.user.findUnique({
            where: { id: subject.id },
            select: { speakerAvg: true, speakerRounds: true },
          });
          const prevAvg = cur?.speakerAvg ?? 0;
          const prevN = cur?.speakerRounds ?? 0;
          await tx.user.update({
            where: { id: subject.id },
            data: { speakerAvg: (prevAvg * prevN + roundSpeaker) / (prevN + 1), speakerRounds: prevN + 1 },
          });
        });
      }

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
