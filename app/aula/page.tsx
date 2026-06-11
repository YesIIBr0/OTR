// /aula — El LMS protegido. Sin sesión → pantalla de Auth; con sesión → la app con sus datos.
import { cookies } from "next/headers";
import { getSessionUser } from "../lib/auth";
import { getAppData } from "../lib/queries";
import Aula from "../components/Aula";
import Auth from "../components/Auth";

export const dynamic = "force-dynamic";

export default async function AulaPage() {
  const user = await getSessionUser();
  if (!user) return <Auth />;
  // PRD §17.3: i18n estructural. El idioma activo vive en la cookie otr_lang
  // (la pone el toggle ES/EN del topbar). En server lo leemos con next/headers
  // y se lo pasamos a getAppData, que sirve la variante EN del contenido cuando existe.
  const lang = (await cookies()).get("otr_lang")?.value === "en" ? "en" : "es";
  const data = await getAppData(user.email, lang);
  const safeUser = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, initials: user.initials, level: user.level, streak: user.streak,
  };
  return <Aula data={data} user={safeUser} />;
}
