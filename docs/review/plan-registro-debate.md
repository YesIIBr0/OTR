# Plan de implementación: Registro de debate como SOLICITUD + Drawer

**Estado:** Pendiente reconciliación Andy+Jean  
**Esfuerzo:** ~2 semanas (dev + QA)  
**Riesgos:** migración de esquema Prisma en prod sin fallar; validación de compañero PF con Tabroom

---

## 1. Cambios de modelo (Prisma)

**Archivos:** `prisma/schema.prisma` + `prisma/schema.postgres.prisma` (IDÉNTICOS)

### Nuevos campos en `DebateRecord`

```prisma
model DebateRecord {
  // ... existentes ...
  status        String   @default("pending")  // pending | approved | rejected
  schoolName    String?  // escuela rival (normalizada)
  teamName      String?  // equipo rival (normalizada)
  tournamentId  String?  // FK a Tournament (tabla existente)
  tournamentCode String? // código del torneo (requerido si tournament)
  sourceId      String?  // FK a tabla de fuentes canónicas (ver §2)
  coachId       String?  // coach que aprueba (FK a User)
  rejectionReason String? // si status=rejected
  createdAt     DateTime @default(now())
  approvedAt    DateTime?
  rejectedAt    DateTime?
  
  coach         User?    @relation("DebateRecordCoach", fields: [coachId], references: [id])
}
```

**Relaciones nuevas en `User`:**
```prisma
model User {
  // ... existentes ...
  debateRequests DebateRecord[] @relation("DebateRecordCoach")
}
```

### Tabla de fuentes (nueva o reutilizar existente)

```prisma
model TournamentSource {
  id       String  @id @default(cuid())
  name     String  // Tabroom | NSDA | OTR | Custom
  icon     String?
  canEdit  Boolean @default(false)  // solo admin crea
  createdAt DateTime @default(now())
}
```

**Esfuerzo:** S (1 migración, ~15 min en prod)

---

## 2. Validación y lógica de negocio

### Reglas por formato (en código de validación y UI)

| Formato | Compañero | Campos requeridos | Tabroom |
|---------|-----------|---|---|
| **PF** | ✓ Obligatorio (email Tabroom) | evento, código torneo | integración futura |
| **LD/Policy** | ✗ No aplica | evento, código torneo | integración futura |
| **Parli/Worlds** | ✓ Obligatorio | evento, código torneo | integración futura |

### Flujo de aprobación

1. Alumno envía → `POST /api/debates` con `status: "pending"` + `coachId` (asignado o elegible)
2. Cola visible en coach panel (`app/lib/scr-teacher.ts`)
3. Coach aprueba: `PATCH /api/debates/[id]` → `status: "approved"`, copia ratings/XP, log de actividad
4. Coach rechaza: `PATCH /api/debates/[id]` → `status: "rejected"`, `rejectionReason`
5. Solo rondas `approved` cuentan para rating y XP

**Validación compartida:** `app/lib/debate-validation.ts` (reutilizable UI + API)

**Esfuerzo:** M (300 líneas de código)

---

## 3. API

### Cambios

**POST `/api/debates`** (alumno envía solicitud)
- Input: `{ format, side, opponent, partner, result, eventName, tournamentCode, schoolName, teamName, sourceId, coachId? }`
- Output: `{ debateId, status: "pending", message: "Solicitud enviada" }`
- Validación:
  - Formato → compañero obligatorio (PF/Policy) + email Tabroom real
  - Evento + código torneo obligatorios
  - Escuela/equipo: si están en la lista canónica, usar ID; si no, crear entrada normalizada
- **No crea RatingUpdate aún**; solo DebateRecord + ActivityEvent "debate_requested"

**PATCH `/api/debates/[id]`** (coach aprueba/rechaza) — NUEVO

```typescript
// Solo coach/admin con authz de relación
interface ApprovalBody {
  action: "approve" | "reject"
  rejectionReason?: string
}
```

- Aprobación:
  - Crea/actualiza RatingUpdate (recalcula glicko-2 del alumno + compañero si aplica)
  - Nudge de skills via ballot (opcional)
  - ActivityEvent "debate_approved"
  - Email notificación al alumno
- Rechazo:
  - ActivityEvent "debate_rejected" + razón
  - Email notificación
  - DebateRecord queda en BD (auditoría)

**GET `/api/debates?status=pending`** — lista de solicitudes para coach

**Esfuerzo:** M (400 líneas repartidas entre POST enhancement + 2 nuevos endpoints)

---

## 4. UI: Drawer lateral + Modal

### Cambios en `app/lib/scr-debate.ts`

**Drawer lateral** (reemplaza modal actual)
- Triggeado por botón "Registrar debate" → `openRecordDebateDrawer()`
- CSS: `.drawer-scrim` + `.drawer` (sin scrollbar interno; contenedor scrollable)
- Cierre: clic fuera, botón X, o envío exitoso

**Campos estandarizados:**
1. **Resultado:** WIN | LOSS (botones segmentados)
2. **Formato:** select (PF | LD | Policy | Parli | Worlds)
3. **Lado:** select (Pro | Con)
4. **Rival:**
   - Nombre (texto libre)
   - Escuela (autocomplete sobre lista canónica de escuelas)
   - Equipo (autocomplete sobre equipos ya registrados)
5. **Compañero:** 
   - Condicional por formato (solo PF/Policy/Parli/Worlds)
   - Email Tabroom (requerido; lookup contra Tabroom si integración activa)
   - Helper: "Tu compañero debe tener email Tabroom registrado"
6. **Evento:** select + autocomplete (lista de torneos recientes OTR)
7. **Código torneo:** input (requerido; ej: "GFBOR2026")
8. **Fuente:** select (OTR | Tabroom | NSDA | Custom) — con hint "¿dónde fue?"
9. **Compañero OTR (opcional):** select de emails de otros alumnos (si coach lo llena)
10. **Comentarios juez:** textarea (opcional)

**Validación en cliente:**
- Formato + compañero: campos interdependientes (show/hide)
- Evento + código torneo: siempre requeridos
- Mensajes i18n ES+EN debajo de cada campo

**Esfuerzo:** L (drawer CSS ~100 líneas; form controller ~200 líneas)

---

## 5. Panel de coach (`app/lib/scr-teacher.ts`)

**Nueva pestaña o sección:** "Cola de debates"

- Lista de solicitudes `status=pending` ordenadas por fecha
- Por alumno:
  - Avatar + nombre
  - "Formato · Lado · Rival · Escuela"
  - "Enviado hace X días"
  - Botones: Aprobar | Rechazar (abre mini-modal con razón)
- Filtros: "Mis alumnos" | "Todos" (si ADMIN)
- Contadores: "3 pendientes · 12 aprobadas este mes"

**Transiciones:**
- Aprobación: toast + quita de lista + log audit
- Rechazo: toast + quita de lista + razón guardada

**Esfuerzo:** M (150 líneas HTML + 100 de lógica)

---

## 6. Internacionalización (i18n)

**Archivos:** `app/lib/i18n-keys/*.ts`

**Claves nuevas ES+EN:**

```typescript
// debate.ts
debate.drawerTitle = "Registrar solicitud de debate"
debate.fieldSchool = "Escuela rival"
debate.fieldTeam = "Equipo rival"
debate.fieldTournamentCode = "Código del torneo"
debate.fieldSource = "Fuente"
debate.fieldTabroomEmail = "Email Tabroom (compañero)"
debate.phTabroomEmail = "user@tabroom.com"
debate.helperPartnerRequired = "Compañero requerido para este formato"
debate.resultPending = "Pendiente de aprobación"
debate.resultApproved = "Aprobado"
debate.resultRejected = "Rechazado"
debate.requestSent = "Solicitud enviada a tu coach"
debate.requestApproved = "Debate aprobado por {coachName}"
debate.requestRejected = "Solicitud rechazada: {reason}"

// teacher.ts (coach)
teacher.debateQueue = "Cola de debates"
teacher.debateQueueEmpty = "Sin solicitudes pendientes"
teacher.debatesPending = "{count} pendientes"
teacher.approveDebate = "Aprobar"
teacher.rejectDebate = "Rechazar"
teacher.rejectReason = "Razón del rechazo (opcional)"
teacher.sentNotification = "Notificación enviada"
```

**Esfuerzo:** S (30 claves, 20 min)

---

## 7. Notificaciones

- Alumno → "Tu solicitud de debate fue aprobada por {coach}" (email + toast en Aula)
- Coach → "Nueva solicitud: {alumno} quiere registrar un debate" (email)

**Reutilizar:** `app/lib/activity.ts` + `emails/` templates (ya existen)

**Esfuerzo:** S (2 templates HTML)

---

## 8. Fases de implementación

### Fase 1: Modelo + Validación (Semana 1, días 1-2)

- [ ] Editar `schema.prisma` + `schema.postgres.prisma`
- [ ] Crear migración: `prisma migrate dev --name add_debate_request_workflow`
- [ ] Backup de DB prod (DBA run `backup.sql` manualmente antes de push)
- [ ] Crear `app/lib/debate-validation.ts` (validar por formato, campos requeridos)
- [ ] Tests unitarios: `debate-validation.test.ts`

**Responsable:** Backend  
**Esfuerzo:** S

---

### Fase 2: API (Semana 1, días 3-4)

- [ ] Modify `POST /api/debates` → crear DebateRecord con `status: pending`
- [ ] Nueva `PATCH /api/debates/[id]` → aprobación/rechazo + RatingUpdate
- [ ] Nueva `GET /api/debates?status=pending` → coach queries
- [ ] Tests: `debates.test.ts` (todos los flujos)
- [ ] Autenticación: validar authz de relación coach-alumno

**Responsable:** Backend  
**Esfuerzo:** M

---

### Fase 3: UI Drawer + Validación (Semana 1-2, días 5-6)

- [ ] Crear `.drawer-scrim` + `.drawer` CSS en `screens.css`
- [ ] Refactor `openRecordDebate()` → `openRecordDebateDrawer()` en `scr-debate.ts`
- [ ] Componentes de campo: autocomplete reutilizable para escuela/evento/equipo
- [ ] Lógica de visibilidad condicional (compañero por formato)
- [ ] Client-side validation UI (helpers bajo campos)
- [ ] Fetch de listas canónicas: escuelas, torneos (new endpoint `/api/tournaments` o `/api/sources`)

**Responsable:** Frontend  
**Esfuerzo:** L

---

### Fase 4: Coach Panel (Semana 2, días 7-8)

- [ ] Nueva pestaña en `scr-teacher.ts` → "Cola de debates"
- [ ] Listar solicitudes `status=pending` con filtro de coach
- [ ] Botones Aprobar/Rechazar + mini-modal de razón
- [ ] Transiciones visuales (fade-out al aprobar)
- [ ] Tests: e2e flujo completo alumno→coach

**Responsable:** Frontend  
**Esfuerzo:** M

---

### Fase 5: i18n + Notificaciones (Semana 2, día 9)

- [ ] Claves de traducción (ES+EN)
- [ ] Email templates: `debate-approved.hbs` + `debate-rejected.hbs`
- [ ] Toast notifications en Aula
- [ ] ActivityEvent logging

**Responsable:** Fullstack  
**Esfuerzo:** S

---

### Fase 6: QA + Deploy (Semana 2, día 10)

- [ ] Testing manual flujo E2E: alumno solicita → coach aprueba → rating se mueve
- [ ] Validaciones: compañero PF, evento+código requeridos, escuela normalizada
- [ ] Rollout Docker + Postgres `prisma db push` (sin seed)
- [ ] Monitoreo: errores en logs, alertas de rechazo

**Responsable:** QA + DevOps  
**Esfuerzo:** M

---

## 9. Riesgos y decisiones abiertas

| Riesgo | Mitiga | Decisión |
|--------|--------|----------|
| **Compañero PF con Tabroom:** ¿buscar en Tabroom API o entrada manual?  | Integración futura (Fase 2) | MVP: email manual + hint "Debes tener email Tabroom" |
| **Migración Prisma en prod sin fallar** | Backup preemptivo; rollback plan | DBA corre backup.sql, push a staging 24h antes de prod |
| **Aprueba coach asignado o cualquiera?** | Scope claro | Coach asignado (relación booking/enrollment); admin aprueba todos |
| **Lista canónica de escuelas:** ¿admin-gestionada o autocomplete?  | Admin panel futura | MVP: hardcoded + regex de normalización; input custom guarda como nuevo |
| **Tabroom integración:** ¿cuándo?  | Fase 2 (H2 2026) | Solo mención en comentarios del código; no bloquea MVP |

---

## 10. Archivos clave a crear/modificar

```
CREAR:
  app/lib/debate-validation.ts         (validación compartida)
  app/styles/drawer.css                (estilos drawer)
  emails/debate-approved.hbs           (template email)
  emails/debate-rejected.hbs           (template email)
  __tests__/debate-validation.test.ts
  __tests__/api/debates.test.ts
  __tests__/e2e/debate-request-flow.test.ts

MODIFICAR:
  prisma/schema.prisma                 (campos DebateRecord, TournamentSource)
  prisma/schema.postgres.prisma        (IDÉNTICO)
  app/api/debates/route.ts             (POST + PATCH)
  app/lib/scr-debate.ts                (drawer, validación UI)
  app/lib/scr-teacher.ts               (cola de debates)
  app/lib/i18n-keys/es.ts              (claves nuevas)
  app/lib/i18n-keys/en.ts              (claves nuevas)
  app/styles/screens.css               (drawer CSS)
  app/lib/activity.ts                  (logging debate_requested/approved/rejected)
```

---

## 11. Criterios de aceptación

- [ ] Alumno envía solicitud → no crea RatingUpdate, queda `status=pending`
- [ ] Coach aprueba → crea RatingUpdate, rating se mueve, alumno recibe email
- [ ] Coach rechaza → DebateRecord persiste, alumno recibe razón, no hay cambio de rating
- [ ] Compañero PF: campo obligatorio, valida email Tabroom si integración activa
- [ ] Evento + código torneo: siempre obligatorios
- [ ] Drawer: sin scrollbar interno, cierre por X o fuera del área
- [ ] i18n: claves ES+EN funcionales en UI
- [ ] E2E: alumno → solicita → coach → aprueba → rating refleja en BD + UI

---

## 12. Hitos de entrega

- **Sprint 1 (Semana 1):** Fases 1-2 (modelo + API) → integración en dev
- **Sprint 2 (Semana 2):** Fases 3-5 (UI + i18n) → QA E2E
- **Prod (Viernes Semana 2):** Deploy Docker + migración Postgres → rollout

---

**Nota:** Esta lista NO incluye la integración con Tabroom (señalada como futura). Tampoco incluye cambios en OTR Degrees (tabla Level ya migrada en SQL aparte) ni membresía/precios (documento en espera).
