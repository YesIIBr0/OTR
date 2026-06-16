# DATA MODEL — OTR Academy (Fase 3)
**16 jun 2026 · CTO Protocol.** Fuente canónica: `prisma/schema.postgres.prisma` (48 modelos, **0 enums** — todo `String`, 32 `@relation`, 24 `onDelete:Cascade` + 1 `SetNull`, 44 `@@index`, 20 `@unique`, 9 `@@unique`). Este doc describe el ERD, los huecos de integridad y la **migración segura** propuesta. Toda inferencia va marcada `[SUPUESTO]`.

## 1. ERD por dominio (entidades · cardinalidades · dirección)

**Identidad y acceso**
- `User` 1—1 `CoachProfile` · `User` 1—N `Guardianship` (como parent y como student) · `User` 1—N `PasswordReset`, `Upload`, `ActivityEvent`, `Report`, `Notification`.

**Aprendizaje (LMS)**
- `Course` 1—N `Module` 1—N `Lesson` (Cascade ✓). `Lesson` 1—1 `Quiz` 1—N `QuizQuestion` 1—N `QuizOption` (Cascade ✓).
- `User` N—M `Course` vía `Enrollment` (join). `Lesson` 1—N `LessonProgress` (Cascade ✓, FK añadida esta sesión). `User`/`Course` → `Submission`, `QuizAttempt`, `Certificate`, `GradeCell`, `StudentSkill`, `Review`.
- `Course` 1—N `Review` (Cascade) — pero `Review.teacher` (User) **sin onDelete** ⚠️.

**Marketplace de coaching**
- `CoachProfile` 1—N `CoachAvailability`, `CoachPackage` (Cascade ✓).
- `Booking` —→ `User` (studentId, coachId, consentBy), `CoachPackage` (packageId) **todos String SUELTO, sin @relation** ⚠️. `Booking` 1—1 `EscrowTxn`, 1—1 `CoachSession` (Cascade desde Booking ✓, pero EscrowTxn no cascadea desde User ⚠️).

**Debate / gamificación**
- `User` 1—N `DebateRecord` 1—N `Ballot` 1—N `RubricScore`; `DebateRecord` 1—1 `RatingUpdate`. `Level`, `Competency`, `Badge` (catálogo). `Tournament` 1—N `TournamentRegistration`/`TournamentRound`. `Club` 1—N `ClubMembership`.

**Comunidad / mensajería** (parcialmente apagada)
- `ForumThread` 1—N `ForumPost` (apagado). `Conversation` N—M `User` vía `ConversationParticipant`; `Conversation` 1—N `ChatMessage`.
- `ConsultationBooking` — **[SUPUESTO] duplicado conceptual de `Booking`**; solo lo tocan endpoints 410 → candidato a eliminar (ver AUDIT SOBRA-1).

## 2. Huecos de integridad (verificados) — la deuda central del modelo
La integridad referencial es **parcial**: 32 relaciones sobre 48 modelos significa que muchos `userId`/ids se guardan como `String` sin FK. Al borrar/anonimizar un usuario, esto deja filas huérfanas:

| Modelo.campo | Hoy | Debería ser | Riesgo |
|---|---|---|---|
| `Booking.studentId` / `.coachId` | String suelto | `@relation`→User, `onDelete: Restrict` | escrow/reservas huérfanas; payouts a cuentas inexistentes |
| `Booking.consentBy` | String suelto | `@relation`→User, `onDelete: SetNull` | consentimiento sin tutor resoluble |
| `EscrowTxn` | cascade solo desde Booking | (cubierto al arreglar Booking) | dinero HELD sin dueño |
| `Review.teacherId` / `.studentId` | sin onDelete | `onDelete: Cascade` | reviews huérfanas inflan avgRating |
| `PasswordReset.userId` | String | `@relation`, `onDelete: Cascade` | tokens vivos tras borrado |
| `Upload.userId` | String | `@relation`, `onDelete: Cascade` | archivos sin dueño |
| `ActivityEvent.userId` | String | `@relation`, `onDelete: Cascade` | timeline con usuarios fantasma |
| `Report.reporterId` | String | `@relation`, `onDelete: Cascade/SetNull` | reportes huérfanos |
| `Guardianship.parentId`/`.studentId` | String | `@relation`, `onDelete: Restrict` | menor sin tutor (Trust & Safety) |

**Índices a derivar de queries reales (Fase 1):** falta `@@index([packageId])` en `Booking` (la query de "Mis reservas" filtra/junta por packageId). El resto de hotpaths (getAppData) ya usan índices existentes; el problema ahí es volumen/caché, no índices.

## 3. Migración segura propuesta (one-way — requiere aprobación)
**Estrategia:** una sola migración que (a) adopta el versionado `prisma migrate` y (b) añade las FK + índice. **Pre-requisito CRÍTICO:** las FK solo se pueden añadir si la integridad YA se cumple — si hay un `Booking.studentId` apuntando a un User inexistente, la migración FALLA. Por eso:

**Paso 0 — verificar huérfanos (read-only) antes de migrar:**
```sql
SELECT 'booking.student' k, count(*) FROM "Booking" b LEFT JOIN "User" u ON b."studentId"=u.id WHERE u.id IS NULL
UNION ALL SELECT 'booking.coach', count(*) FROM "Booking" b LEFT JOIN "User" u ON b."coachId"=u.id WHERE u.id IS NULL
UNION ALL SELECT 'review.teacher', count(*) FROM "Review" r LEFT JOIN "User" u ON r."teacherId"=u.id WHERE u.id IS NULL;
-- (repetir por cada FK). Si todos = 0 → seguro. Si >0 → limpiar/backfill primero.
```

**Forward (Prisma):** añadir en `schema.postgres.prisma` (y `.prisma`):
```prisma
model Booking {
  // ...
  student   User @relation("BookingStudent", fields: [studentId], references: [id], onDelete: Restrict)
  coach     User @relation("BookingCoach",   fields: [coachId],   references: [id], onDelete: Restrict)
  // consentBy → opcional: relación SetNull
  @@index([packageId])
}
model User {
  // back-relations nuevas:
  bookingsAsStudent Booking[] @relation("BookingStudent")
  bookingsAsCoach   Booking[] @relation("BookingCoach")
  uploads           Upload[]
  activity          ActivityEvent[]
  passwordResets    PasswordReset[]
  // ...
}
```
Luego `prisma migrate dev --name fk-integrity-and-versioning` (genera el SQL `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`).

**Adopción del versionado sobre BD viva (baseline):**
```
prisma migrate diff --from-empty --to-schema-datamodel schema.prisma --script > migrations/0_init/migration.sql
prisma migrate resolve --applied 0_init      # marca el estado actual como ya aplicado
prisma migrate dev --name fk-integrity       # la migración nueva real
```

**Rollback:** `prisma migrate diff` inverso → `ALTER TABLE "Booking" DROP CONSTRAINT "Booking_studentId_fkey"` (etc.). Como es additivo (solo añade constraints/índice), el rollback es limpio si no hubo borrados que las constraints ya bloquearan.

**Tradeoff:** `onDelete: Restrict` en Booking impide borrar un usuario con reservas/escrow vivo — es **deseable** (no perder dinero), pero obliga a una política de borrado (resolver escrow → luego borrar, o soft-delete). **Recomendación [SUPUESTO]:** soft-delete de usuarios para un LMS (conserva historial y cumple mejor con datos de menores), con `Restrict` como red.

## 4. Supuestos a confirmar
- `[SUPUESTO]` `ConsultationBooking` es descartable (duplica `Booking`) — confirmar que no hay leads históricos a conservar.
- `[SUPUESTO]` política de borrado de usuario = **soft-delete** (preferible) vs hard-delete con cascadas.
- `[SUPUESTO]` no se requiere multi-tenant / particionado a esta escala (3.000 usuarios caben sobrados en una instancia Postgres).

→ **Deliverable de Fase 3.** La migración NO está aplicada (es one-way; espera tu OK y el paso 0 de verificación de huérfanos).
