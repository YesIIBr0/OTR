// Server Component: si no hay sesión → pantalla de Auth; si la hay → la app con sus datos.
import { getSessionUser } from "./lib/auth";
import { getAppData } from "./lib/queries";
import Aula from "./components/Aula";
import Auth from "./components/Auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) return <Auth />;
  const data = await getAppData(user.email);
  const safeUser = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, initials: user.initials, level: user.level, streak: user.streak,
  };
  return <Aula data={data} user={safeUser} />;
}
