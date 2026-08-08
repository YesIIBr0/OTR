-- [DASHBOARD] Capa de datos de las tres piezas del dashboard que no se pintaban por
-- falta de datos: XP por insignia, premios del podio de la temporada y "Lo mejor de
-- la temporada". Todo es contenido editable en DB, nada hardcodeado en la vista.

-- AlterTable: XP que otorga cada insignia (0 = no se muestra).
ALTER TABLE "Badge" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SeasonPrize" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeasonPrize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonPrize_rank_key" ON "SeasonPrize"("rank");

-- CreateTable
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);
