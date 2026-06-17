/* OTR Aula · i18n keys — scr-admin-users.ts (prefix "au")
   Diccionario por-pantalla para "Gestión de usuarios" (Admin). Default-safe:
   solo datos. es = texto original exacto reemplazado en la pantalla; en =
   traducción profesional natural. Consumido por el helper t() de ./i18n. */
export const dict = {
  es: {
    // page head
    "au.eyebrow": "Administración",
    "au.title": "Gestión de usuarios",
    "au.subtitle": "Cambia roles, verifica coaches y suspende cuentas — sin tocar la base de datos",

    // KPIs
    "au.kpiUsers": "Usuarios",
    "au.kpiCoaches": "Coaches",
    "au.kpiAdmins": "Admins",
    "au.kpiSuspended": "Suspendidos",

    // search
    "au.searchPlaceholder": "Buscar por nombre o correo…",
    "au.searchBtn": "Buscar",

    // role filter chips
    "au.filterAll": "Todos",
    "au.filterStudents": "Estudiantes",
    "au.filterCoaches": "Coaches",
    "au.filterFamilies": "Familias",
    "au.filterAdmins": "Admins",

    // role select options
    "au.roleStudent": "Estudiante",
    "au.roleParent": "Familia",
    "au.roleTeacher": "Profesor / Coach",
    "au.roleAdmin": "Administrador",

    // user card
    "au.roleLabel": "Rol",
    "au.verifiedBadge": "Verificado",
    "au.suspendedBadge": "Suspendido",
    "au.verifyCoach": "Verificar coach",
    "au.unverify": "Quitar verificación",
    "au.suspend": "Suspender",
    "au.reactivate": "Reactivar",

    // loading / empty states
    "au.loadingTitle": "Cargando usuarios…",
    "au.loadingBody": "Estamos recuperando la lista de cuentas.",
    "au.loadingBtn": "Cargando…",
    "au.emptyTitle": "Sin usuarios",
    "au.emptyBody": "Cuando se registren usuarios, aparecerán aquí.",
    "au.emptySearchTitle": "Sin resultados",
    "au.emptySearchBody": "Ningún usuario coincide con tu búsqueda.",

    // toasts
    "au.errLoad": "No se pudo cargar la lista de usuarios",
    "au.errUpdate": "No se pudo actualizar el usuario",
    "au.toastRoleUpdated": "Rol actualizado",
    "au.toastVerified": "Coach verificado",
    "au.toastUnverified": "Verificación retirada",
    "au.toastSuspended": "Usuario suspendido",
    "au.toastReactivated": "Usuario reactivado",
  },
  en: {
    // page head
    "au.eyebrow": "Administration",
    "au.title": "User management",
    "au.subtitle": "Change roles, verify coaches and suspend accounts — without touching the database",

    // KPIs
    "au.kpiUsers": "Users",
    "au.kpiCoaches": "Coaches",
    "au.kpiAdmins": "Admins",
    "au.kpiSuspended": "Suspended",

    // search
    "au.searchPlaceholder": "Search by name or email…",
    "au.searchBtn": "Search",

    // role filter chips
    "au.filterAll": "All",
    "au.filterStudents": "Students",
    "au.filterCoaches": "Coaches",
    "au.filterFamilies": "Families",
    "au.filterAdmins": "Admins",

    // role select options
    "au.roleStudent": "Student",
    "au.roleParent": "Family",
    "au.roleTeacher": "Teacher / Coach",
    "au.roleAdmin": "Administrator",

    // user card
    "au.roleLabel": "Role",
    "au.verifiedBadge": "Verified",
    "au.suspendedBadge": "Suspended",
    "au.verifyCoach": "Verify coach",
    "au.unverify": "Remove verification",
    "au.suspend": "Suspend",
    "au.reactivate": "Reactivate",

    // loading / empty states
    "au.loadingTitle": "Loading users…",
    "au.loadingBody": "We're fetching the list of accounts.",
    "au.loadingBtn": "Loading…",
    "au.emptyTitle": "No users",
    "au.emptyBody": "Once users sign up, they'll appear here.",
    "au.emptySearchTitle": "No results",
    "au.emptySearchBody": "No user matches your search.",

    // toasts
    "au.errLoad": "Couldn't load the user list",
    "au.errUpdate": "Couldn't update the user",
    "au.toastRoleUpdated": "Role updated",
    "au.toastVerified": "Coach verified",
    "au.toastUnverified": "Verification removed",
    "au.toastSuspended": "User suspended",
    "au.toastReactivated": "User reactivated",
  },
};
