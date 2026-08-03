// OTR · Micro-caché en memoria con TTL [GOAL G3] — para datos GLOBALES, nunca por usuario.
//
// Problema medido con usuarios concurrentes en staging: cada carga de /api/app-data
// recalcula desde cero incluso lo que es IDÉNTICO para todo el mundo (catálogo de cursos
// publicados, niveles, eventos, torneos próximos, tabla de clasificación). Con 10 alumnos
// entrando a la vez, esa misma consulta se ejecutaba 10 veces.
//
// REGLAS DE USO (importantes):
//  · SOLO para datos globales, sin PII y sin variar por rol. Nada por usuario — un fallo
//    aquí serviría los datos de una persona a otra. Por eso la clave NO acepta userId.
//  · TTL corto (segundos): la app sigue sintiéndose viva; una lección nueva aparece en
//    ≤TTL. Nunca cachear estado que el usuario acaba de escribir.
//  · La caché vive en el PROCESO. Con el nodo único actual es un acierto directo; con
//    varios nodos cada uno tendría la suya (misma semántica, solo menos aciertos) — y esa
//    es exactamente la razón de mantener el TTL bajo.
//  · Deduplica también las peticiones EN VUELO: si 10 requests concurrentes piden la misma
//    clave con la caché fría, se ejecuta UNA query y las 10 esperan esa promesa (evita la
//    estampida que ocurriría justo al expirar).

interface Entry<T> {
  value?: T;
  expires: number;
  inflight?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

/**
 * Devuelve el valor cacheado de `key` o ejecuta `fn` (una sola vez, aunque llamen N
 * peticiones a la vez) y lo cachea `ttlMs`. Si `fn` lanza, NO se cachea el error.
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now && hit.value !== undefined) return hit.value;
  // Petición ya en vuelo para esta clave → todas esperan la misma promesa (anti-estampida).
  if (hit?.inflight) return hit.inflight;

  const inflight = fn()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      store.delete(key); // un fallo no se cachea: el siguiente reintenta de verdad
      throw err;
    });
  store.set(key, { expires: now + ttlMs, inflight });
  return inflight;
}

/** Invalida una clave (o todas). Úsalo tras una escritura que deba verse YA. */
export function invalidate(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}

/** Diagnóstico: nº de claves vivas (para el panel admin o tests). */
export function cacheSize(): number {
  return store.size;
}
