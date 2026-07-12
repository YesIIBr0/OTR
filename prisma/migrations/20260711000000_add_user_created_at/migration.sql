-- [ADMIN-METRICS] User.createdAt: soporta registrationsByWeek en GET /api/admin/metrics.
-- Filas existentes se backfillean con CURRENT_TIMESTAMP en el momento de aplicar la migración
-- (no hay fecha real de alta anterior a esta columna).
-- AlterTable
ALTER TABLE "User" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
