-- [DEUDA-H] Etiquetas de fecha ALMACENADAS en español ("hace 1h", "ayer", "ahora") que se
-- colaban íntegras en la UI en inglés y además envejecían mal (texto congelado en la fila).
-- Se guarda el INSTANTE y la etiqueta se deriva en lectura con el idioma de la request.
-- Todas las columnas son ADITIVAS y NULLABLES: ninguna fila existente cambia y un deploy
-- anterior sigue funcionando (no las lee). NULL = la vista cae al texto legacy.
ALTER TABLE "Notification" ADD COLUMN "whenAt" TIMESTAMP(3);
ALTER TABLE "ForumThread" ADD COLUMN "lastAt" TIMESTAMP(3);
ALTER TABLE "ForumPost" ADD COLUMN "whenAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN "whenAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN "sentAt" TIMESTAMP(3);
