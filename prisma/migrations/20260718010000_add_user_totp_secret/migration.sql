-- [R5 — Tribunal 3.1] User.totpSecret: 2FA TOTP (RFC 6238) para cuentas ADMIN.
-- Secreto base32 (160 bits); NULL = 2FA apagada. El login exige el código a cualquier
-- cuenta con el secreto puesto; la activación (Ajustes) está gateada a ADMIN.
-- AlterTable
ALTER TABLE "User" ADD COLUMN "totpSecret" TEXT;
