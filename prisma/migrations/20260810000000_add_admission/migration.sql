-- [ADM] Admisión de 4 pasos del alumno nuevo (mockup de Isaac; plan
-- docs/superpowers/plans/2026-08-10-onboarding-admision.md).
--   1 Formulario · 2 Llamada de descubrimiento · 3 Comunidad WhatsApp · 4 Vídeo DPP 30 s
--
-- ADITIVA: solo CREA dos tablas nuevas. No altera ni una columna existente, así que un
-- deploy anterior (que no las lee) sigue funcionando igual y el rollback es un DROP.
--
-- Admission guarda los campos del formulario en COLUMNAS TIPADAS (nada de JSON blob) y un
-- timestamp POR PASO — el "cuándo" es el dato auditable, un booleano no lo es. El nombre y
-- el correo NO se duplican: viven en User.
--
-- AdmissionConsent es la EVIDENCIA legal del consentimiento (texto exacto + versión + fecha
-- + quién). Sin FK a User ni a Admission, igual que ConsentRecord/AuditLog en este esquema:
-- la prueba tiene que sobrevivir al borrado o la anonimización del actor.

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "formCompletedAt" TIMESTAMP(3),
    "callCompletedAt" TIMESTAMP(3),
    "communityCompletedAt" TIMESTAMP(3),
    "videoCompletedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "completedAt" TIMESTAMP(3),
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "school" TEXT,
    "gradeLevel" TEXT,
    "guardianName" TEXT,
    "guardianDocument" TEXT,
    "guardianRelation" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "guardianSignature" TEXT,
    "guardianSignedAt" TIMESTAMP(3),
    "guardianshipId" TEXT,
    "program" TEXT,
    "priorExperience" BOOLEAN,
    "preferredDays" TEXT,
    "discoveryBookingId" TEXT,
    "dppVideoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionConsent" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedByName" TEXT NOT NULL,
    "acceptedByRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- 1-1 con el alumno: la unicidad ES la cardinalidad de la relación.
CREATE UNIQUE INDEX "Admission_studentId_key" ON "Admission"("studentId");

-- CreateIndex
-- Panel de coach/admin: "quién sigue a medias" sin recomputar 4 timestamps por fila.
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
-- Una fila de evidencia por (admisión, tipo, versión del texto): re-guardar el formulario
-- no duplica pruebas, y cambiar el texto OBLIGA a subir la versión.
CREATE UNIQUE INDEX "AdmissionConsent_admissionId_kind_version_key" ON "AdmissionConsent"("admissionId", "kind", "version");

-- CreateIndex
-- Consulta directa por alumno ("¿este menor tiene consentimiento?") sin pasar por Admission.
CREATE INDEX "AdmissionConsent_studentId_idx" ON "AdmissionConsent"("studentId");

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_guardianshipId_fkey" FOREIGN KEY ("guardianshipId") REFERENCES "Guardianship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_discoveryBookingId_fkey" FOREIGN KEY ("discoveryBookingId") REFERENCES "ConsultationBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
