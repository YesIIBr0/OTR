-- rebrand-colors.sql — remapeo de COLORES GUARDADOS EN DATOS al Brand Book V1.0 (2026-08).
--
-- Qué hace: reescribe los hex de la paleta vieja (crema/verde/oro/azul navy) que quedaron
-- persistidos en filas existentes, a la paleta nueva (negro #171717 + naranja #F25623 + grises
-- fríos). Los defaults del schema ya cambiaron (Course.color @default("#171717")), pero las filas
-- creadas ANTES del rebrand conservan el hex viejo: esto las pone al día.
--
-- Dónde: Postgres (staging/prod). Ejecutar UNA vez después de desplegar el rebrand.
--   psql "$DATABASE_URL" -f scripts/rebrand-colors.sql
--
-- Es IDEMPOTENTE: solo toca filas cuyo color siga estando en la lista vieja; correrlo N veces
-- deja el mismo resultado (la segunda pasada actualiza 0 filas).
--
-- Nota: los nombres de tabla/columna son PascalCase sin @@map en el schema, por eso van entre
-- comillas dobles ("Course", "Level").
--
-- Mapeo canónico (plan docs/superpowers/plans/2026-08-07-rebrand-brandbook-v1.md):
--   '#2E8BD0', '#0C2340'            -> '#171717'  (sky/navy viejos -> negro)
--   '#4FA9E8', '#2CAA20', '#F2B814' -> '#F25623'  (azul claro/verde/oro -> naranja acento)
--   '#1E8C16'                       -> '#C8401A'  (verde hover -> naranja oscuro)
--   '#64748B'                       -> '#4D4D4D'  (gris frío viejo -> ink-600)

BEGIN;

-- Course.color — color de la tarjeta/curso elegido en el picker del Aula.
UPDATE "Course" SET "color" = '#171717' WHERE "color" IN ('#2E8BD0', '#0C2340');
UPDATE "Course" SET "color" = '#F25623' WHERE "color" IN ('#4FA9E8', '#2CAA20', '#F2B814');
UPDATE "Course" SET "color" = '#C8401A' WHERE "color" = '#1E8C16';
UPDATE "Course" SET "color" = '#4D4D4D' WHERE "color" = '#64748B';

-- Level.color — color del nivel de gamificación. El seed guarda tokens CSS
-- (var(--lvl-*)), que NO se tocan; esto solo alcanza filas con hex literal viejo.
UPDATE "Level" SET "color" = '#171717' WHERE "color" IN ('#2E8BD0', '#0C2340');
UPDATE "Level" SET "color" = '#F25623' WHERE "color" IN ('#4FA9E8', '#2CAA20', '#F2B814');
UPDATE "Level" SET "color" = '#C8401A' WHERE "color" = '#1E8C16';
UPDATE "Level" SET "color" = '#4D4D4D' WHERE "color" = '#64748B';

COMMIT;
