-- [F-MKT M3] Booking.listingId: de qué Listing del marketplace abierto nació la sesión
-- (NULL = flujo original de coaches/paquetes). Sin FK dura a propósito: pausar/borrar un
-- listing no debe tocar el historial financiero de las reservas ya hechas.
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "listingId" TEXT;
