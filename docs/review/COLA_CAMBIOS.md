# Cola de cambios — OTR Academy

Cómo funciona: tú mandas el cambio (texto o captura), yo lo anoto aquí con **mi lectura**,
lo implemento con test primero y lo marco. Si mi lectura no es la tuya, corrígeme y lo
cambio antes de tocar código. Lo que quede **bloqueado** es porque depende de un activo o
una decisión que no es mía.

Rama de trabajo: `cola-cambios` (sale de `main` = `873f793`).

---

## Pendiente

> C1–C4 hechos y verdes (1498 tests, tsc 0, lint 0). Sin desplegar todavía.

### C1 · Quitar el subtítulo del paso 1  ✅
Bajo el título "Formulario de Admisión" van dos líneas tachadas en tu captura:
el tag (*"Cuéntanos sobre ti y firma tu consentimiento."*) y la descripción
(*"Es obligatorio llenarlo ya que necesitamos tu consentimiento…"*).
**Lectura:** se van las dos, solo en el paso 1. Los pasos 2, 3 y 4 conservan las suyas.
⚠️ Diverge del artifact de Isaac, que sí las dibuja. Lo anoto por si lo pregunta.

### C2 · Dos rótulos  ✅
- `School` / `Institución educativa` → **`Institution` / `Institución`**
- `¿El estudiante tiene experiencia previa en debate?` → **`¿Tienes experiencia previa en debate?`**
  (`Do you have previous debate experience?`)
**Lectura:** el formulario le habla al alumno de tú; la tercera persona ("el estudiante")
desentonaba con el resto.

### C3 · Todo obligatorio, con asterisco rojo  ✅
Hoy solo el programa (sección 2) lleva `*`. Pasan a obligatorios: **Institución**,
**Curso / Nivel académico**, **experiencia previa** y **días**.
**Lectura:** "todos" = los cuatro que hoy son opcionales. No es solo pintar el asterisco:
hay que exigirlos en la validación, o el asterisco mentiría.

### C4 · Quitar la descripción de TODOS los pasos  ✅
Tachaste el párrafo descriptivo del paso 2 y dijiste "y todos".
**Lectura:** se va la línea `desc` en los 4 pasos. El `tag` (la negrita: *"Agenda tu sesión
1-a-1 con un coach."*) **se queda** en los pasos 2, 3 y 4 — ahí no lo tachaste. En el paso 1
sí lo tachaste, así que ese se va también. Corrígeme si querías el tag fuera en todos.

### C5 · Enlace del grupo de WhatsApp  ✅ (falta poner el valor en el VPS)
`https://chat.whatsapp.com/IVNDAPPg6bALEXCzyUyeWf`
**Hallazgo:** hoy `communityUrl` **no lo manda el servidor desde ningún sitio** — por eso el
paso 3 vive en su estado honesto. Hay que añadirlo a la respuesta de `/api/admission`.
**Propuesta:** variable de entorno `ADMISSION_COMMUNITY_URL` (es la convención del repo:
no hay tabla de ajustes y toda la config va por `process.env`). Requiere además escribir el
valor en `.env.production` del VPS — eso es un paso de servidor, te lo señalo aparte.

### C6 · Calendly para la llamada de descubrimiento  ❓ necesita decisión
Ver la nota de abajo: hay un problema de fondo que decide el enfoque.

### C7 · Pantalla final a sangre + saludo  ✅ (con emoji, por decisión de Wilser)
"Pantalla completa · arreglar" sobre la pantalla "You're in at OTR Academy": hoy es una
tarjeta oscura con greige arriba y abajo; la quiere **a sangre**, como la bienvenida.
Y el texto: **"👏 Welcome to OTR Academy!"**.
⚠️ **Choque con el kit:** el repo prohíbe emoji en cadenas y hay un test que lo vigila
(`tests/admision-wizard.test.ts:656`). El 👏 rompería la suite. Opciones: dejarlo sin
emoji, o pintar el aplauso como icono SVG. **Necesito que elijas.**

### C8 · "Lo mejor de la temporada" en bloques grandes  ✅
Las 4 tarjetas del dashboard pasan a bloques grandes que llenen el ancho.

---

## Bloqueado (no depende de mí)

- **3 fotos de programa** — en el repo solo hay `public/img/hero-speaking.jpg`. El hueco ya
  está montado; con las fotos es darle `background-image` a `.adm-prog-img`.
- **Revisión legal del clausulado** por abogado dominicano + razón social, RNC y domicilio
  (hoy dice "[razón social y RNC por confirmar]") + crear el buzón `privacidad@otr-academy.com`.
- **Las 5 decisiones de Isaac**: menores en el leaderboard, legalidad con menores,
  marketplace abierto, llaves de Stripe, Instagram real de OTR.

## Esperando decisión tuya

- **Selector de idioma dentro del portal de admisión** — Isaac está atrapado en inglés
  (cookie `otr_lang=en`) y desde el wizard no puede volver a español. Ahora que existe el
  menú de cuenta, son tres líneas dentro de él.
- **`document.title`** sigue diciendo "· OTR Aula" (la pestaña, no el lockup).
- **Menú de cuenta** (`<details>`) no se cierra al clickear fuera.

## Hecho

- ✅ Paridad del paso 1 con el mockup + salida del portal + login solo con escudo — PR #37 (`873f793`), desplegado.
- ✅ Perfil de Analia completo (status `COMPLETED`) para poder probar el sitio.
