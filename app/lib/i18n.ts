// @ts-nocheck
/* OTR Aula · i18n scaffold (Fase 1)
   Helper LIGERO — NO traduce todas las pantallas (eso es otra ola).
   Solo cubre el CHROME de navegación: labels del nav (sidebar/tabbar),
   grupos del sidebar y los textos del topbar (búsqueda, crear, etc.).

   Uso:
     import { t, getLang, setLang } from "./i18n";
     t("nav.dashboard")            -> usa el idioma actual (cookie otr_lang)
     t("nav.dashboard", "en")      -> fuerza idioma
     getLang()                     -> 'es' | 'en'  (default 'es')
     setLang('en')                 -> escribe cookie otr_lang y recarga

   Default y fallback: 'es'. Si una llave no existe en el idioma activo,
   cae a 'es'; si tampoco existe, devuelve la propia llave (nunca rompe). */

const DICT = {
  es: {
    // grupos del sidebar
    "group.main": "Principal",
    "group.learn": "Aprender",
    "group.progress": "Centro de progreso",
    "group.marketplace": "Marketplace",
    "group.workspace": "Espacio de coach",
    "group.system": "Sistema",

    // items de navegación (sidebar + tabbar)
    "nav.dashboard": "Inicio",
    "nav.debate": "Debate Hub",
    "nav.learn": "Aprender",
    "nav.catalog": "Cursos",
    "nav.course": "Mi aprendizaje",
    "nav.progress": "Niveles",
    "nav.badges": "Logros",
    "nav.grades": "Mis calificaciones",
    "nav.lifetime": "Mi trayectoria",
    "nav.membership": "Membresía",
    "nav.mybookings": "Mis reservas",
    "nav.admin": "Moderación",
    "nav.certifications": "Certificaciones",
    "nav.marketplace": "Marketplace",
    "nav.explore": "Coaches",
    "nav.messages": "Mensajes",
    "nav.parent": "Portal de familia",
    "nav.settings": "Ajustes",
    "nav.profile": "Perfil",
    "nav.workspace": "Panel de coach",
    "nav.coachwork": "Reservas e ingresos",
    "nav.gradebook": "Calificador",
    "nav.participants": "Participantes",
    "nav.manage": "Gestionar",
    "nav.designsystem": "Design System",
    "nav.arsenal": "Arsenal",
    "nav.logout": "Salir",

    // topbar / chrome
    "top.search": "Buscar cursos, tareas, personas…",
    "top.create": "+ Crear",
    "top.notifications": "Notificaciones",
    "top.menu": "Menú",
    "top.lang": "Idioma",

    // roles (footer del sidebar)
    "role.student": "Estudiante",
    "role.teacher": "Profesor",
    "role.coach": "Coach",
    "role.parent": "Familia",
    "role.admin": "Administración",

    // placeholder "En construcción"
    "soon.eyebrow": "Próximamente",
    "soon.title": "En construcción",
    "soon.body": "Esta sección llega en esta fase. Estamos afinando los últimos detalles.",
  },
  en: {
    // sidebar groups
    "group.main": "Main",
    "group.learn": "Learn",
    "group.progress": "Progress Center",
    "group.marketplace": "Marketplace",
    "group.workspace": "Coach Workspace",
    "group.system": "System",

    // navigation items (sidebar + tabbar)
    "nav.dashboard": "Dashboard",
    "nav.debate": "Debate Hub",
    "nav.learn": "Learn",
    "nav.catalog": "Courses",
    "nav.course": "My Learning",
    "nav.progress": "Levels",
    "nav.badges": "Achievements",
    "nav.grades": "My Grades",
    "nav.lifetime": "My Journey",
    "nav.membership": "Membership",
    "nav.mybookings": "My Bookings",
    "nav.admin": "Moderation",
    "nav.certifications": "Certifications",
    "nav.marketplace": "Marketplace",
    "nav.explore": "Coaches",
    "nav.messages": "Messages",
    "nav.parent": "Parent Portal",
    "nav.settings": "Settings",
    "nav.profile": "Profile",
    "nav.workspace": "Coach Dashboard",
    "nav.coachwork": "Bookings & Earnings",
    "nav.gradebook": "Gradebook",
    "nav.participants": "Participants",
    "nav.manage": "Manage",
    "nav.designsystem": "Design System",
    "nav.arsenal": "Arsenal",
    "nav.logout": "Sign out",

    // topbar / chrome
    "top.search": "Search courses, assignments, people…",
    "top.create": "+ Create",
    "top.notifications": "Notifications",
    "top.menu": "Menu",
    "top.lang": "Language",

    // roles (sidebar footer)
    "role.student": "Student",
    "role.teacher": "Teacher",
    "role.coach": "Coach",
    "role.parent": "Parent",
    "role.admin": "Admin",

    // "Coming soon" placeholder
    "soon.eyebrow": "Coming soon",
    "soon.title": "Under construction",
    "soon.body": "This section is arriving in this phase. We're polishing the final details.",
  },
};

export const LANGS = ["es", "en"];
const DEFAULT_LANG = "es";
const COOKIE = "otr_lang";

/* Lee el idioma activo desde la cookie 'otr_lang'. Default 'es'.
   Seguro en SSR: si no hay document, devuelve el default. */
export function getLang() {
  try {
    if (typeof document === "undefined") return DEFAULT_LANG;
    const m = document.cookie.match(/(?:^|;\s*)otr_lang=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : "";
    return LANGS.includes(v) ? v : DEFAULT_LANG;
  } catch (e) {
    return DEFAULT_LANG;
  }
}

/* Escribe la cookie 'otr_lang' (1 año) y recarga para repintar todo el chrome.
   Mantiene el patrón del landing (toggle ES/EN) — recarga simple y honesta. */
export function setLang(lang) {
  const l = LANGS.includes(lang) ? lang : DEFAULT_LANG;
  try {
    document.cookie = `${COOKIE}=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  } catch (e) {}
  try { location.reload(); } catch (e) {}
}

/* t(key, lang?) — traduce una llave. Fallback en cascada:
   idioma activo -> 'es' -> la propia llave (nunca devuelve undefined). */
export function t(key, lang) {
  const l = lang && LANGS.includes(lang) ? lang : getLang();
  const table = DICT[l] || DICT[DEFAULT_LANG];
  if (table && key in table) return table[key];
  const base = DICT[DEFAULT_LANG];
  if (base && key in base) return base[key];
  return key;
}

/* Exponemos setLang en window para que el toggle ES/EN del topbar (renderizado
   como string vía innerHTML en shell.ts) lo invoque por onclick — sin tener que
   tocar la delegación de clics de Aula.tsx. Patrón idéntico a window.go/api/toast. */
if (typeof window !== "undefined") {
  (window as any).otrSetLang = setLang;
  (window as any).otrGetLang = getLang;
}

export const I18N = DICT;
