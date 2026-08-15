# Plan — Flujo de admisión de 4 pasos (artifact de Isaac, "OTR Academy sign up flow")

Fuente de verdad: artifact `1e19da45-9eb4-4283-8ef4-ee9ac1e5dfba`, extraído y guardado en `scratchpad/art2-app.js` (60 kB con markup, datos y lógica). Planificado con Fable; ejecución con agentes Opus 5 en worktrees aislados.

## Qué es

Un **wizard de admisión** para el estudiante recién registrado: pantalla de bienvenida → 4 pasos secuenciales (se desbloquean en orden) → pantalla final "Estás dentro de OTR Academy". Con rail de progreso ("N de 4 · %", estados Completado / En progreso / Pendiente / Bloqueado), botones Atrás / Marcar como completado / Siguiente, y cabecera con "Soporte 24/7".

Los 4 pasos, tal como los define el mockup:

| # | Paso | Qué pide | Estado en el mockup |
|---|---|---|---|
| 1 | **Formulario de Admisión** | Datos del estudiante (nombre, apellido, nacimiento, WhatsApp con bandera RD, correo, institución, nivel), datos del **tutor si es menor de 21** (nombre, cédula/pasaporte, relación, teléfono, **firma**), programa al que se inscribe, experiencia previa, días preferidos y **consentimiento de datos** | Apunta a Typeform, pero el mockup dibuja el formulario nativo completo |
| 2 | **Llamada de Descubrimiento** | Agendar 20 min 1-a-1 con un coach (calendario + slots) | `scheduler: true`, enlace "pendiente por añadir" |
| 3 | **Comunidad (WhatsApp)** | Unirse al grupo de clases y canal de anuncios | Enlace "pendiente por añadir" |
| 4 | **Documentar tu Punto de Partida (DPP)** | Vídeo de **30 s** (grabar o subir) con rúbrica de 4 puntos: preséntate, por qué quieres entrenar, horizontal y con luz, una sola toma | `recorder: true` |

## Lo que YA existe en el repo (reutilizar, no reinventar)

Esto es lo que hace que el plan sea corto:

- **Paso 2 ya está construido**: modelo `ConsultationBooking` (name, email, phone, goal, level, format, `slotAt`, 30 min, status) + `/api/consultations` + `/api/consultations/availability` + página pública `/consulta` con su `booking-flow.tsx`. El paso 2 se **cablea a esto**, no a un enlace externo.
- **Menores y tutor**: modelo `Guardianship` (parent↔student, `status` PENDING/ACTIVE, `consentLevel`, `initiatedBy`, COPPA-aware) + `/api/guardianship`. Los datos del tutor del formulario alimentan esto.
- **Subida de archivos**: `/api/uploads` (ya usado por highlights y entregas) para el vídeo del paso 4.
- **Enrutado del alumno nuevo**: `queries.ts` expone `me.needsPlacement` y `Aula.tsx:1412` ya arranca al estudiante nuevo en una pantalla especial. **Ese es el punto de enganche del wizard.**
- **Grabador de vídeo**: ya existe (`.rec-btn`, dropzone) en la pantalla de entregas.
- **Kit visual actual**: negro/blanco + verde, sin naranja intenso, tras las rondas de Isaac.

## Decisiones (2 necesitan tu OK)

1. **Formulario nativo, no Typeform.** El mockup lo dibuja entero y los datos —sobre todo el **consentimiento del tutor**— tienen que vivir en la plataforma, no en un tercero: el coach los necesita y son la base legal para operar con menores. *Decidido salvo que digas lo contrario.*
2. **El paso 2 usa el sistema de reservas que ya existe**, en vez del "enlace pendiente" del mockup. Mejor producto y no depende de que Isaac mande nada. *Decidido.*
3. ⚠️ **Onboarding vs placement.** Hoy el alumno nuevo entra directo al *placement* (auto-evaluación de 6 sliders, 3 min). Con el wizard hay dos "primeras pantallas". Propongo: **admisión primero** (es lo formal/legal) y el placement después, al entrar al Aula. La alternativa es meter el placement como 5º paso. **Necesito tu decisión.**
4. ⚠️ **"Menor de 21" del formulario vs "menor de 18" del sistema.** El formulario pide tutor si el estudiante tiene menos de 21; el sistema define menor (<18) para las reglas de privacidad. Propongo: **pedir datos de tutor si <21** (como quiere el formulario) pero **mantener las protecciones de privacidad atadas a <18**, que es lo que exige la ley. **Confírmame que es correcto.**

## Fases

### F0 · Modelo y API (base de todo lo demás)
`prisma/schema.prisma` + `schema.postgres.prisma` + migración aditiva · `app/api/admission/**`
- Modelo `Admission` (1 por estudiante): estado de los 4 pasos, `completedAt` por paso, y los campos del formulario (datos del estudiante, del tutor, programa, experiencia, días, consentimiento con fecha y texto aceptado, URL del vídeo DPP).
- API: `GET` progreso · `POST` guardar formulario (paso 1) · `PATCH` marcar paso · `POST` vídeo (vía `/api/uploads`). Guards de rol: el estudiante solo el suyo; coach/admin lectura.
- Guardianship: si hay datos de tutor, crear/enlazar el vínculo con el consentimiento correspondiente.

### F1 · Wizard (la pantalla)
`app/lib/scr-admission.ts` (nuevo) + `screens.ts` + `screens.css` (sección propia) + i18n ES/EN
- Bienvenida, rail de 4 pasos con sus estados, contenido por paso, Atrás/Completar/Siguiente, pantalla final. Fiel al mockup pero con el kit actual (negro/blanco + verde, sin naranja intenso), responsive 375, AA, sin emoji.

### F2 · Paso 1 — formulario de admisión
Todos los campos del mockup, validación real, teléfono RD, **el bloque de tutor aparece solo si corresponde por edad**, consentimiento explícito con registro de fecha. Guarda en `Admission` y dispara el `Guardianship` cuando hay tutor.

### F3 · Pasos 2, 3 y 4
- **2**: embebe el flujo de reserva existente (o su equivalente dentro del wizard) → crea `ConsultationBooking` y marca el paso al confirmar.
- **3**: enlace de WhatsApp **configurable** (no hardcodeado); mientras Isaac no lo dé, estado honesto ("pendiente de configurar"), nunca un enlace roto.
- **4**: rúbrica de 4 puntos + grabar/subir vídeo (≤30 s) reusando `/api/uploads`, con vista previa y validación de tipo/tamaño.

### F4 · Enganche y visibilidad
- El estudiante sin admisión completa entra al wizard (punto de enganche: el mismo sitio donde hoy se decide `needsPlacement`).
- **Coach y admin ven el progreso de admisión** de sus alumnos (en el panel del coach y en la consola de admin): quién va por qué paso, quién tiene el consentimiento firmado, quién subió el vídeo.

### F5 · Gate, QA y despliegue
tsc + suite completa + `TZ=UTC` + eslint 0 errores + `next build`; clicks reales de los 4 pasos de punta a punta (alumno nuevo real, no mock); sondeo de los 4 roles; PR → merge → deploy → verificación en producción.

## Lo que hace falta de Isaac (no bloquea empezar)

- **Enlace del grupo de WhatsApp** (paso 3).
- **Qué coaches** atienden las llamadas de descubrimiento y su disponibilidad real (el sistema ya la soporta).
- El texto legal exacto del **consentimiento** (hoy el mockup trae una frase; conviene que la valide quien corresponda, porque es la base para tratar datos de menores).
- Confirmar la **lista de programas** del desplegable del paso 1.

## Riesgo principal

El paso 1 recoge **datos personales de menores y de sus tutores**, incluida una firma. Eso hay que construirlo con cuidado: consentimiento explícito y con registro, mínimos datos necesarios, y sin exponerlos a otros roles. El repo ya tiene el andamiaje COPPA (`Guardianship`), así que el camino es enlazar con él, no inventar otro.

---

## Ejecutado (2026-08-15) — PR #34

Las 6 fases completas, repartidas en 6 agentes paralelos (A0 modelo+API, A1 wizard, A2 enganche+staff,
A3 vídeo en uploads, A4 privacidad+GDPR, A5 tope de subida) e integradas en `feat/admision`.

**Decisiones que estaban abiertas, resueltas así:**

3. **Onboarding vs placement** → la admisión va PRIMERO (es lo formal y legal) y el placement
   después, al entrar al Aula. No se metió como 5º paso: son cosas distintas y mezclarlas
   alargaba la puerta de entrada.
4. **<21 pide tutor, <18 es menor** → confirmado tal cual se propuso. Los datos de tutor se piden
   por debajo de 21, como quiere el formulario, pero la TUTELA (`Guardianship`) y las protecciones
   de privacidad solo se aplican por debajo de 18: colgarle un vínculo de tutela a un adulto de 19
   daría a un tercero acceso a sus datos sin su consentimiento aparte.

**Cuatro defectos encontrados al integrar** (los tres primeros solo aparecieron con clicks, con la
suite en verde): la fecha de nacimiento se corría un día según la zona del servidor; el día del
cumpleaños 21 seguía pidiéndose tutor en zonas al este; el vídeo se subía con un `kind` que el
servidor no validaba —45 s entraban prometiendo 30—; y el clausulado del consentimiento estaba
escrito dos veces, con lo que se enseñaba y lo que se registraba pudiendo divergir. Los cuatro
cerrados con fuente única (`app/lib/consent.ts`, `app/lib/dpp-video.ts`) y tests que lo vigilan.

**Sigue pendiente de Isaac** (no bloquea): validación legal del texto del consentimiento, enlace del
grupo de WhatsApp, lista definitiva de programas y qué coaches atienden las llamadas.
