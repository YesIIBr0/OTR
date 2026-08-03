// OTR · Middleware — backstop GLOBAL de rate limit para escrituras [GOAL G5].
//
// Por qué existe: los límites finos por ruta (login, uploads, mensajes, reportes…) protegen
// lo sensible, pero una auditoría encontró ~18 rutas de escritura sin ningún tope. Parchear
// cada una deja el mismo agujero abierto para la ruta que se escriba MAÑANA. Este middleware
// es la red de seguridad: un tope generoso por IP sobre CUALQUIER escritura de /api, que no
// estorba al uso legítimo pero corta un bucle automatizado.
//
// NO sustituye a los límites por ruta: son más estrictos y siguen mandando (este es el
// backstop, aquéllos la defensa dirigida). Defensa en profundidad.
//
// Exclusiones deliberadas:
//  · /api/stripe/webhook y /api/whatsapp/webhook — autenticados por FIRMA y con ráfagas
//    legítimas del proveedor; frenarlos perdería pagos o mensajes.
//  · /api/cron/* — protegidos por secreto y los llama nuestro propio cron.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const MAX_WRITES = 60; // por IP y minuto: un humano nunca se acerca; un bucle sí
const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const EXCLUDED = ["/api/stripe/webhook", "/api/whatsapp/webhook", "/api/cron/"];

// Contador en memoria por instancia (mismo enfoque que lib/rate-limit: sin Redis mientras
// el despliegue sea de un solo nodo; con varios, cada uno aplica su cuota — sigue acotando).
const hits = new Map<string, { n: number; reset: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.reset < now) {
    hits.set(ip, { n: 1, reset: now + WINDOW_MS });
    // Limpieza barata: si el mapa crece, purga lo vencido (evita fuga de memoria).
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    return false;
  }
  cur.n++;
  return cur.n > MAX_WRITES;
}

export function middleware(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();
  // new URL(req.url) en vez de req.nextUrl: idéntico resultado y el middleware queda
  // ejercitable con un Request estándar en los tests (sin depender del tipo propietario).
  const path = new URL(req.url).pathname;
  if (EXCLUDED.some((p) => path.startsWith(p))) return NextResponse.next();

  // IP: último hop de X-Forwarded-For (el que añade NUESTRO proxy — los anteriores los
  // puede falsificar el cliente), mismo criterio que app/lib/api.ts clientIp().
  const xff = req.headers.get("x-forwarded-for") || "";
  const ip = (xff.split(",").pop() || "").trim() || "desconocida";

  if (tooMany(ip)) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas solicitudes. Espera un momento e intenta de nuevo.", code: "rateLimited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(WINDOW_MS / 1000)) } },
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
