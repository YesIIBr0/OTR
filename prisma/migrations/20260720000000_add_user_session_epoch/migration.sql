-- [GOAL G4] User.sessionEpoch: revocación de sesiones server-side en O(1).
-- El token de sesión incluye este número; getSessionUser lo compara contra el de la fila.
-- Incrementarlo invalida TODAS las sesiones vivas del usuario ("cerrar sesión en todos los
-- dispositivos") — antes, un token robado seguía siendo válido 30 días aunque el usuario
-- hiciera logout (clearSession solo borraba la cookie del navegador).
-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionEpoch" INTEGER NOT NULL DEFAULT 0;
