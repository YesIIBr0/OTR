# Marketplace Abierto OTR — análisis de brecha · Julio 2026

**La visión de Isaac (transcrita 2026-07-18):** cualquier persona puede crear su perfil y
publicar **listings** de lo que enseña — no solo debate: inglés, matemáticas, AI, "el
diablo". Un profesor que da inglés Y matemáticas publica **dos listings separados**, cada
uno con su **precio por hora**. El estudiante entra a un **buscador por materia**, ve
todos los profesores con sus tarifas, reserva y paga — **sin que OTR sea intermediario
manual de nada, pero todo bajo nuestra plataforma**.

Eso es un marketplace tipo Superprof/Preply con OTR como plataforma de confianza.
La buena noticia: **~60 % de la maquinaria ya existe y está probada** (reserva, escrow,
reviews verificadas, mensajería con filtro de contacto, safety gate de menores,
moderación con auditoría). Lo que falta es concreto y se lista abajo.

---

## 1 · Lo que YA existe y se REUTILIZA tal cual

| Pieza | Dónde vive | Estado |
|---|---|---|
| Flujo de reserva con slots + aprobación parental para menores | `POST /api/bookings` + Safety Gate (Guardianship ACTIVE, consentimiento por reserva o umbral) | Probado con tests |
| Escrow HELD→RELEASED/REFUNDED con take rate 18 % y payout calculado | `Booking`+`EscrowTxn`, `bookings/[id]` complete | Simulado; el webhook ya es robusto (dedupe R1) — solo faltan llaves Stripe |
| Reviews SOLO con reserva verificada (anti-fake) | `/api/reviews` gate verified-booking | Probado |
| Mensajería con **filtro de datos de contacto para menores** (anti-desintermediación) | `filterContactInfo` en `lib/safety` + messages | Existe — pieza CLAVE del negocio abierto |
| Verificación de profesor por admin + rastro de auditoría | `coachVerified` + `AuditLog` (coach.verify) | Existe |
| Moderación con contexto + reports + suspensión anti-lockout | Consola admin F2 | Existe |
| Sala de sesión + grabación adjuntable | `scr-room` (video real pendiente de proveedor) | Placeholder honesto |
| Perfil de coach con paquetes y disponibilidad | `CoachProfile` + `CoachPackage` + availability | Existe — **pero es 1:1 y debate-céntrico** |
| Buscador con filtros (idioma, especialidad, precio, orden, texto) | `scr-marketplace` (`window.__mkF`) | Existe — filtra COACHES, no materias |

## 2 · Lo que FALTA (el delta técnico, en orden de construcción)

### 2.1 Modelo `Listing` (el corazón del cambio) — ~2-3 días
Hoy: `CoachProfile` 1:1 con el usuario + paquetes de sesiones. La visión exige **N listings
por profesor**, cada uno con materia y precio/hora propios:

```prisma
model Listing {
  id           String  @id @default(cuid())
  teacherId    String
  category     String   // taxonomía curada: ingles | matematicas | ai | debate | ...
  title        String   // "Inglés conversacional para secundaria"
  description  String
  priceCentsHour Int    // el profesor pone SU tarifa
  language     String   @default("es")
  modality     String   @default("online")
  status       String   @default("PENDING") // PENDING | ACTIVE | PAUSED | REJECTED
  // + índices por [category, status], [teacherId]
}
```
Dual-schema + migración. `Booking` gana `listingId?` (de qué materia es la sesión) y el
precio nace de `priceCentsHour × duración` en vez del paquete (los paquetes de debate
siguen funcionando — conviven).

### 2.2 Registro ABIERTO de profesores + vetting — ~2 días de código, 1 DECISIÓN grande
Hoy el registro bloquea el rol teacher a propósito («por invitación del equipo OTR», PRD
Fase 1). Abrirlo es 1 línea de código y un flujo:
**registro → completa perfil → crea listing → queda PENDING → admin revisa y aprueba →
ACTIVE**. La cola de aprobación es una pestaña más de la consola admin (patrón `__mod`
ya establecido) y `coachVerified`+AuditLog ya existen.
⚠️ **La decisión que NO es de código:** qué exige OTR antes de aprobar a un extraño que
dará clases a MENORES (ver §3.2). El vetting es el activo de marca del marketplace — "en
OTR los profesores están verificados" es lo que Superprof no tiene en RD.

### 2.3 Buscador por materia — ~3-4 días
La pantalla de entrada que describe Isaac: buscador/categorías → resultados (profesor,
listing, tarifa/hora, rating, "verificado") → detalle → reservar. Reutiliza el detalle de
coach y el flujo de reserva actuales; lo nuevo es la home de descubrimiento por materia y
que los filtros operen sobre `Listing` (categoría + texto) en servidor (`/api/listings`
GET paginado), no sobre la lista de coaches en cliente.

### 2.4 "Mis listings" del profesor (CRUD) — ~2 días
Pantalla para el profesor: crear/editar/pausar sus listings (dos materias = dos cards),
con el patrón de allowlist + validación de `lib/tournaments` (F6.2) como plantilla.
Cambios de estado auditados.

### 2.5 Cola de aprobación admin — ~1 día
Pestaña "Listings" en la consola: PENDING → aprobar/rechazar con razón, audit() incluido.

### 2.6 Pagos sin intermediación manual — **BLOQUEADO por llaves [user]** (~4-5 días al llegar)
Exactamente la F7 del Plan Maestro: Stripe (cobro al reservar) + **Stripe Connect
Express** (payout automático al profesor al completarse la sesión — la lógica RELEASED
con take rate ya existe; se le conecta la transferencia). El dedupe del webhook ya quedó
hecho (R1). **Sin esto, "que no seamos intermediarios" no es posible** — hoy el dinero es
simulado. Decisión asociada: ¿mismo 18 % para todas las materias?

### Total estimado: ~10-12 días de código sin llaves + 4-5 con llaves (pagos)

## 3 · Decisiones de NEGOCIO que necesito antes de construir (Isaac + Wilser)

1. **Taxonomía de materias**: ¿lista curada por OTR (recomendado para el buscador y el SEO
   interno: Inglés, Matemáticas, AI, Física, Música, Debate…) o texto libre? Recomiendo
   curada + "Otra (propuesta)" que el admin promueve a categoría.
2. **Vetting de profesores externos** (LA decisión, por los menores): ¿qué se exige?
   Mínimo recomendado: identidad verificada + entrevista/video corto + aprobación manual
   del admin ANTES de publicar + primera sesión con menores siempre con grabación
   activada. ¿Antecedentes penales (en RD: certificado de no antecedentes)?
3. **Take rate**: ¿18 % parejo, o distinto para listings externos vs coaches OTR?
4. **Precio/hora**: ¿libre, o con piso (evita carreras al fondo) y techo?
5. **Alcance del profesor externo**: ¿solo sesiones 1:1 del marketplace, o acceso a todo
   el LMS (crear cursos, tareas)? Recomiendo empezar marketplace-only (menos superficie
   de riesgo/soporte) y abrir el LMS a los mejor evaluados después.
6. **Legal [user]**: contrato de plataforma (profesor = independiente, OTR = intermediario
   tecnológico), términos del marketplace y tratamiento de menores con externos — revisión
   de abogado ANTES de abrir el registro (misma revisión de ToS que pide el Tribunal 3.2).
7. **¿Marketplace "aparte"?** Isaac dice "que exista el marketplace aparte": recomiendo
   MISMA plataforma y misma cuenta (el moat es la comunidad y la confianza), con el
   buscador de materias como pantalla de entrada propia — no un producto separado que
   parta la base de usuarios en dos.

## 4 · Riesgos propios del marketplace abierto

- **Desintermediación** (se conocen y pagan por fuera): mitigada por `filterContactInfo`
  en el chat (ya existe), el valor del escrow (protección de pago), reviews solo-verificadas
  y la política de expulsión. Nunca se elimina al 100 % — se compite con valor.
- **Calidad/incidentes con menores**: el vetting (§3.2) + grabación por defecto + reports
  ya operativos. Un solo incidente malo mata la marca — por eso el vetting no es opcional.
- **Frío de arranque** (marketplace vacío): sembrar con los coaches actuales de OTR +
  reclutar 10-15 profesores del círculo de Isaac ANTES de abrir el buscador al público.

## 5 · Encaje con el plan vigente

Esto es una fase nueva del Plan Maestro — **F-MKT (Marketplace Abierto)** — que se puede
construir SIN llaves salvo §2.6. Orden recomendado: decisiones §3 → modelo+CRUD+buscador
(§2.1-2.5, ~10-12 días) → sembrar oferta → F7/pagos al llegar llaves → abrir registro
público. El piloto de debate (Tribunal, Killer Action #3) NO debe esperar a esto: valida
la disposición a pagar con lo que ya existe.

---
*Nota aparte de la misma conversación: Isaac pidió un Excel de "top 20 empresas por
industria" para el tema del API de contratación — es investigación de mercado de OTRO
proyecto, no de esta plataforma. Puedo generarlo (búsqueda web + Excel) cuando lo pidan
explícitamente.*
