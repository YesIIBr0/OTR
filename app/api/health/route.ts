import { NextResponse } from "next/server";
import { db } from "../../lib/db";

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
  return NextResponse.json({ ok: dbOk, db: dbOk, uptime: process.uptime() }, { status: dbOk ? 200 : 503 });
}
