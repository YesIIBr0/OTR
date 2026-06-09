import { db } from "../../../lib/db";
import { setSession } from "../../../lib/auth";
import { hashPassword } from "../../../lib/auth-crypto";
import { ok, bad, readJson, clean } from "../../../lib/api";
import { rateLimit } from "../../../lib/rate-limit";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = rateLimit(`register:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) return bad(`Demasiadas solicitudes. Intenta en ${rl.retryAfter}s.`, 429);

  const data = await readJson<{ name?: string; email?: string; password?: string }>(req);
  const name = clean(data.name, 80);
  const email = clean(data.email, 160);
  const password = String(data.password ?? "");

  if (name.length < 2) return bad("Nombre inválido", 400);
  if (!EMAIL_RE.test(email)) return bad("Correo inválido", 400);
  if (password.length < 6) return bad("La contraseña debe tener al menos 6 caracteres", 400);

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return bad("Ese correo ya está registrado", 409);

  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const user = await db.user.create({
    data: {
      name, email,
      role: "STUDENT", // el registro público SIEMPRE crea estudiantes; los profesores se crean por admin/seed
      passwordHash: hashPassword(password),
      initials, level: "Novato", xp: 0, streak: 0,
    },
  });
  await setSession(user.id);
  return ok();
}
