-- [RONDA3 · i18n] Traducción EN del premio de temporada. Columna ADITIVA y NULLABLE:
-- ninguna fila existente cambia y un deploy anterior sigue funcionando (no la lee).
-- NULL = la vista sirve el texto ES; el premio existe aunque falte la traducción, y
-- se prefiere verlo en el otro idioma a dejar la cajita del podio en blanco.
ALTER TABLE "SeasonPrize" ADD COLUMN "textEn" TEXT;
