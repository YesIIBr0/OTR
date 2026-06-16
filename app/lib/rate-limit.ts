// Rate limiter en memoria (ventana fija). Suficiente para un proceso Node persistente
// (Hostinger VPS / Node app). Para múltiples instancias, migrar a Redis con la misma API.
type Hit = { count: number; reset: number };
const buckets = new Map<string, Hit>();
const SOFT_CAP = 5000;   // a partir de aquí, barrido de expirados
const HARD_CAP = 50000;  // tope DURO de memoria: protege el único proceso ante floods con IP spoofeada (OPS-04)

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > SOFT_CAP) sweep(now);
    // Si tras barrer los expirados aún supera el tope duro (flood sostenido con claves nuevas),
    // desaloja las más antiguas para acotar el uso de memoria del proceso.
    if (buckets.size > HARD_CAP) evictOldest(buckets.size - HARD_CAP);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

function sweep(now: number) {
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}

// Map preserva el orden de inserción → borrar las primeras N claves desaloja las más antiguas.
function evictOldest(n: number) {
  let i = 0;
  for (const k of buckets.keys()) { if (i++ >= n) break; buckets.delete(k); }
}
