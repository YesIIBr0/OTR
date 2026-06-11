import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "../../lib/auth";
import { getAppData } from "../../lib/queries";

// Datos del usuario actual para el refresh suave del cliente (sin recargar la página).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  // PRD §17.3: el idioma activo (cookie otr_lang) decide la variante de contenido
  // que sirve getAppData. Se lee server-side; en cliente no hay acceso a la DB.
  const lang = (await cookies()).get("otr_lang")?.value === "en" ? "en" : "es";
  const data = await getAppData(user.email, lang);
  // Payload PRIVADO por usuario: nunca debe cachearse en proxies/CDN compartidos.
  // Vary: Cookie evita servir los datos de un alumno a otro si un caché intermedio
  // ignorara no-store. (La compresión la añade Nginx con gzip_vary on.)
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store, must-revalidate",
      "Vary": "Cookie",
    },
  });
}
