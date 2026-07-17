-- [F3.4] Índices compuestos para queries calientes: reemplazan los simples [studentId]/[userId].
-- Booking(studentId, slotAt): myBookings (order slotAt desc), childBookings (order slotAt asc) y
--   parent-report (rango slotAt) ordenaban/filtraban por slotAt en memoria (schema tenía solo [studentId]).
-- Submission(userId, createdAt): mySubs y GET /submissions del alumno ordenaban createdAt desc en memoria.
-- Se dropean los simples [studentId]/[userId] porque el prefijo de cada compuesto cubre los filtros que
-- sólo usan esa columna (count/findFirst/groupBy sin orden distinto) — ninguna query los necesita aparte.

-- DropIndex
DROP INDEX "Submission_userId_idx";

-- DropIndex
DROP INDEX "Booking_studentId_idx";

-- CreateIndex
CREATE INDEX "Submission_userId_createdAt_idx" ON "Submission"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_studentId_slotAt_idx" ON "Booking"("studentId", "slotAt");
