import { NextResponse } from "next/server";
import { getSessionUser } from "../../lib/auth";
import { getAppData } from "../../lib/queries";

// Datos del usuario actual para el refresh suave del cliente (sin recargar la página).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const data = await getAppData(user.email);
  return NextResponse.json(data);
}
