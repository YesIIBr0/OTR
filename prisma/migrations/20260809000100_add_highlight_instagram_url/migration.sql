-- [RONDA3 · Isaac] "cada publicación de esa a un post de IG": enlace de la publicación
-- de Instagram de cada logro de "Lo mejor de la temporada". Columna ADITIVA y NULLABLE:
-- NULL = la tarjeta no navega a ningún sitio, que es mejor que un enlace roto.
ALTER TABLE "Highlight" ADD COLUMN "instagramUrl" TEXT;
