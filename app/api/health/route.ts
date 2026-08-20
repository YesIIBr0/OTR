import { NextResponse } from "next/server";
import { db } from "../../lib/db";
import { mailHealth } from "../../lib/mail";

// Healthcheck para monitoreo externo (UptimeRobot, etc.) — SIN auth a propósito:
// un servicio de uptime no puede depender de sesión/cookies, y no expone nada sensible.
export async function GET() {
  let dbOk = true;
  try {
    await db.$queryRawUnsafe("SELECT 1");
  } catch {
    dbOk = false;
  }
  // 503 si la DB falla: así UptimeRobot lo marca "down" de verdad, no solo lo loguea.
  /* [20/08] El correo se REPORTA pero no tumba el health: sin SMTP la plataforma sigue
     sirviendo clases, así que un 503 sería mentir sobre la gravedad. Lo que no puede pasar
     es que el hueco quede invisible — con `mail.configured:false` se ve desde fuera. */
  return NextResponse.json({ ok: dbOk, db: dbOk, mail: mailHealth(), uptime: process.uptime() }, { status: dbOk ? 200 : 503 });
}
