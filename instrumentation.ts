// Observabilidad mínima sin dependencias nuevas: Next 15 llama a onRequestError()
// en cada error no capturado (Server Components, Route Handlers, Server Actions).
// Logueamos UNA línea JSON a stdout — en el VPS eso llega a `docker logs`, que es
// nuestra caja negra hasta que haya presupuesto/tiempo para un servicio real (Sentry, etc.).

export async function register() {
  // Requerido por Next aunque no necesitemos inicializar nada (no hay APM que registrar aún).
}

export async function onRequestError(
  // Next tipa esto como `unknown` (ver InstrumentationOnRequestError): no siempre es un Error.
  err: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routeType?: string },
) {
  const error = err instanceof Error ? err : undefined;
  const line = {
    ts: new Date().toISOString(),
    level: "error",
    msg: error?.message,
    // Solo las primeras 6 líneas del stack: suficiente para ubicar el archivo/función
    // sin inundar los logs (docker logs no trunca, y estos errores pueden ser frecuentes).
    stack: (error?.stack || "").split("\n").slice(0, 6).join(" | "),
    path: request?.path,
    method: request?.method,
    routerKind: context?.routerKind,
    routeType: context?.routeType,
  };
  console.error(JSON.stringify(line));

  // TODO(sentry): si SENTRY_DSN está seteado, este es el punto para enchufar
  // @sentry/nextjs → Sentry.captureRequestError(err, request, context).
  // NO se instala el paquete aquí a propósito: sin DSN configurado sería peso muerto
  // (bundle + inicialización) en todos los ambientes que no usan Sentry.
  if (process.env.SENTRY_DSN) {
    // TODO: import { captureRequestError } from "@sentry/nextjs" y llamarlo aquí.
  }
}
