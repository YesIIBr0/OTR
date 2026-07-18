-- [F-MKT M1] Listing: oferta del marketplace abierto multi-materia (visión Isaac 2026-07-18).
-- N listings por profesor, cada uno con su categoría y tarifa/hora. Nace PENDING y solo
-- publica tras aprobación manual del admin (vetting — plataforma con menores).

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCentsHour" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "modality" TEXT NOT NULL DEFAULT 'online',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_category_status_idx" ON "Listing"("category", "status");

-- CreateIndex
CREATE INDEX "Listing_teacherId_idx" ON "Listing"("teacherId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
