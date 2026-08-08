-- [GOAL E1] Los 8 índices faltantes del diagnóstico de performance
-- (docs/review/GOAL_2026-08_perf.md §3.2). Cada uno se justifica con el where/orderBy
-- REAL de app/lib/queries.ts, no con lectura especulativa del schema. Ninguno reemplaza
-- ni dropea un índice existente: los simples que quedan como prefijo (ChatMessage
-- [conversationId], Notification [userId], Module [courseId], Lesson [moduleId],
-- Tournament [status], QuizAttempt [userId]) se DEJAN a propósito — este esfuerzo solo
-- añade, la limpieza de redundancias es una decisión aparte.
-- Los nombres son los que genera Prisma para cada @@index (verificado con
-- `prisma migrate diff --from-empty --to-schema-datamodel`), así el cliente y la DB
-- no divergen.

-- CreateIndex
-- queries.ts:350 — catálogo publicado: where {published:true} + orderBy position, en CADA
-- carga de CADA rol. Course solo tenía [teacherId] ⇒ hoy es scan + sort.
CREATE INDEX "Course_published_position_idx" ON "Course"("published", "position");

-- CreateIndex
-- queries.ts:690 — ranking de XP del mes: groupBy userId where createdAt BETWEEN … El índice
-- existente [userId, createdAt] NO sirve: el where filtra por createdAt SIN userId, y createdAt
-- es la 2ª columna. Es la tabla que más crece del sistema.
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");

-- CreateIndex
-- queries.ts:347 — take-per-parent: los 60 mensajes más recientes por conversación
-- (orderBy position desc). Con solo [conversationId] se leen TODOS los mensajes del hilo y se
-- ordenan en memoria: el coste crece con el historial, no con la ventana.
CREATE INDEX "ChatMessage_conversationId_position_idx" ON "ChatMessage"("conversationId", "position");

-- CreateIndex
-- queries.ts:324-327 — feed de notificaciones: where OR([{userId},{userId:null}]) +
-- orderBy [unread desc, position asc] take 50. Con solo [userId] el ORDER BY siempre es sort.
CREATE INDEX "Notification_userId_unread_position_idx" ON "Notification"("userId", "unread", "position");

-- CreateIndex
-- queries.ts:514 — historial de exámenes: where userId + orderBy createdAt desc take 200.
-- Ni [userId] ni [userId, lessonTitle] cubren el orden. Mismo caso que Submission (c91b98e).
CREATE INDEX "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");

-- CreateIndex
-- queries.ts:593 — torneos: where status IN ('UPCOMING','LIVE') + orderBy startsAt asc take 20.
-- Con solo [status] filtra bien pero ordena en memoria.
CREATE INDEX "Tournament_status_startsAt_idx" ON "Tournament"("status", "startsAt");

-- CreateIndex
-- queries.ts:534 — módulos de los cursos inscritos: where courseId IN (…) +
-- orderBy [courseId asc, position asc]. El orden calca el índice exactamente.
CREATE INDEX "Module_courseId_position_idx" ON "Module"("courseId", "position");

-- CreateIndex
-- queries.ts:534 (include lessons orderBy position) y :355 — mismo patrón que Module.
CREATE INDEX "Lesson_moduleId_position_idx" ON "Lesson"("moduleId", "position");
