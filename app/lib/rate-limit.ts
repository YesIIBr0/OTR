// Rate limiter en memoria (ventana fija). Suficiente para un proceso Node persistente
// (Hostinger VPS / Node app). Para múltiples instancias, migrar a Redis con la misma API.
type Hit = { count: number; reset: number };
const buckets = new Map<string, Hit>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) sweep(now); // evita crecimiento ilimitado
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  if (b.count > limit) return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

function sweep(now: number) {
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}
