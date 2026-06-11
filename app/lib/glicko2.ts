// OTR Debate Hub · Motor de rating Glicko-2 (implementación estándar, sin librerías).
//
// PRD §6: el rating del debatiente es Glicko-2 (NO Elo). Cada usuario tiene una
// terna { rating, rd, vol } que se actualiza SOLO en rondas adjudicadas. El RD
// (rating deviation) pondera cuánto se mueve el rating: menos certeza → más salto.
//
// Glicko-2 trabaja internamente en una escala "mu/phi" centrada en 1500 con un
// factor de conversión 173.7178. τ (tau) acota cuánto puede cambiar la volatilidad
// entre periodos; usamos τ=0.5 (valor recomendado por Glickman).
//
// Referencia: Glickman, "Example of the Glicko-2 system" (2013).

// Factor de conversión entre la escala Glicko (centrada en 1500) y la escala interna.
const SCALE = 173.7178;
// Centro de la escala de rating.
const CENTER = 1500;
// τ — restringe el cambio de volatilidad entre periodos. Más bajo = cambios más suaves.
const TAU = 0.5;
// Tolerancia de convergencia del algoritmo iterativo (paso 5).
const EPSILON = 0.000001;

export interface Rating {
  rating: number; // escala de display (≈1500)
  rd: number;     // rating deviation (escala de display)
  vol: number;    // volatilidad (σ)
}

export interface OpponentResult {
  rating: number; // rating del oponente (display)
  rd: number;     // RD del oponente (display)
  score: number;  // 1 = victoria, 0.5 = empate, 0 = derrota (del jugador)
}

// ---------------------------------------------------------------------------
//  Tier ladder (PRD §6) — bandas de rating de display.
//  Novato → Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster.
//  Promoción = momento de celebración: comparar tierBefore vs tierAfter detecta el salto.
// ---------------------------------------------------------------------------
export function tierFor(rating: number): string {
  const r = Number(rating) || 0;
  if (r < 1300) return "Novato";
  if (r < 1450) return "Bronze";
  if (r < 1600) return "Silver";
  if (r < 1750) return "Gold";
  if (r < 1900) return "Platinum";
  if (r < 2050) return "Diamond";
  if (r < 2200) return "Master";
  return "Grandmaster";
}

// g(phi): factor que reduce el impacto de un oponente con RD alto (más incierto).
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

// E(mu, mu_j, phi_j): resultado esperado del jugador contra el oponente j.
function expectedScore(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * updateRating — aplica un periodo de calificación Glicko-2.
 *
 * @param player    terna actual { rating, rd, vol } del jugador (escala display).
 * @param opponents lista de oponentes adjudicados con su { rating, rd, score }.
 *                  score: 1 victoria / 0.5 empate / 0 derrota (del jugador).
 * @returns         nueva terna { rating, rd, vol } (escala display).
 *
 * Si no hay oponentes, el rating no se mueve y solo aumenta el RD (incertidumbre
 * por inactividad), tal como define el sistema.
 */
export function updateRating(player: Rating, opponents: OpponentResult[]): Rating {
  // --- Paso 2: convertir el jugador a la escala interna (mu, phi). ---
  const mu = (player.rating - CENTER) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.vol;

  // Sin partidas adjudicadas: solo crece el RD (phi' = sqrt(phi^2 + sigma^2)),
  // el rating y la volatilidad se conservan.
  if (!opponents || opponents.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return { rating: player.rating, rd: phiStar * SCALE, vol: sigma };
  }

  // Convertir cada oponente a la escala interna y precomputar g(phi_j) y E.
  const opps = opponents.map((o) => {
    const muJ = (o.rating - CENTER) / SCALE;
    const phiJ = o.rd / SCALE;
    return { muJ, gJ: g(phiJ), e: expectedScore(mu, muJ, phiJ), score: o.score };
  });

  // --- Paso 3: varianza estimada (v) basada solo en los resultados del juego. ---
  let vInv = 0;
  for (const o of opps) {
    vInv += o.gJ * o.gJ * o.e * (1 - o.e);
  }
  const v = 1 / vInv;

  // --- Paso 4: delta — mejora estimada del rating según los resultados. ---
  let deltaSum = 0;
  for (const o of opps) {
    deltaSum += o.gJ * (o.score - o.e);
  }
  const delta = v * deltaSum;

  // --- Paso 5: nueva volatilidad σ' por iteración (Illinois / regula falsi). ---
  const a = Math.log(sigma * sigma);
  const phi2 = phi * phi;
  const delta2 = delta * delta;

  // f(x): función cuya raíz da la nueva volatilidad (ln σ'^2).
  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta2 - phi2 - v - ex);
    const den = 2 * (phi2 + v + ex) * (phi2 + v + ex);
    return num / den - (x - a) / (TAU * TAU);
  };

  // 5.2: fijar el intervalo inicial [A, B].
  let A = a;
  let B: number;
  if (delta2 > phi2 + v) {
    B = Math.log(delta2 - phi2 - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  // 5.3–5.4: iterar hasta convergencia.
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }
  const sigmaPrime = Math.exp(A / 2);

  // --- Paso 6: pre-rating period value (phi*). ---
  const phiStar = Math.sqrt(phi2 + sigmaPrime * sigmaPrime);

  // --- Paso 7: nuevo phi' y mu'. ---
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = mu + phiPrime * phiPrime * deltaSum;

  // --- Paso 8: convertir de vuelta a la escala de display. ---
  return {
    rating: muPrime * SCALE + CENTER,
    rd: phiPrime * SCALE,
    vol: sigmaPrime,
  };
}
