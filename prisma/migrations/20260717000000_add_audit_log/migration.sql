-- [F2.1] AuditLog: rastro inmutable de acciones administrativas (COPPA / Ley 172-13 RD).
-- Sin relación FK a User: guarda actorId + actorName (snapshot) e ids del objetivo, para que
-- el rastro SOBREVIVA al borrado del actor o del objetivo. + Report.resolvedBy (antes no existía).
-- AlterTable
ALTER TABLE "Report" ADD COLUMN "resolvedBy" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");
