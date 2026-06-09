// OTR LMS · helpers de API — respuestas consistentes + parseo de body sin tirar 500.
import { NextResponse } from "next/server";

export function ok(data: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: true, ...data });
}

export function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Lee JSON del request sin lanzar: body malformado → objeto vacío. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return ((await req.json()) ?? {}) as T;
  } catch {
    return {} as T;
  }
}

/** Recorta y limita una string de entrada. */
export function clean(v: unknown, max = 2000): string {
  return String(v ?? "").trim().slice(0, max);
}
