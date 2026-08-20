# Administración total del sitio — mapa y plan

Auditado el 2026-08-20 contra el repo. **Lo primero: ya existe mucho más de lo que parecía.**
Este plan NO reconstruye nada de eso.

## Lo que el admin YA puede hacer hoy

| Área | Dónde |
|---|---|
| Moderación: reportes, cursos, coaches | `admin` (consola) |
| Usuarios: cambiar rol, suspender, verificar coaches | `admin-users` |
| **Admisiones**: ver aspirantes, progreso y estado de consentimiento | `admin-users` (usa `DB.adminAdmissions`) |
| Métricas de plataforma | `admin-metrics` |
| Bandeja de WhatsApp | `admin-whatsapp` |
| Registro de auditoría | `/api/admin/audit` |
| Exportar y borrar datos de un usuario (Ley 172-13) | `/api/admin/export`, `/api/admin/erase` |
| Crear y editar **cursos** (módulos, lecciones) | `course-builder` |
| Crear, editar y borrar **torneos** | `events` (staff) |
| Gestionar **highlights** de la temporada | `highlights` (coach/admin) |

## Los dos huecos reales

### 1. No existe configuración de plataforma editable  ← el que importa
**No hay ningún modelo de ajustes** en la base. Todo lo configurable vive en variables de
entorno, así que cambiar el enlace del grupo de WhatsApp exige **entrar por SSH al servidor
y redesplegar**. Eso significa que hoy **el sitio no se puede administrar sin un
desarrollador**, que es justo lo contrario de "administración total".

**Plan:** modelo `PlatformSetting` (clave/valor con auditoría de quién cambió qué y cuándo),
API de staff y pantalla `admin-settings`. El enlace de la comunidad se muda ahí; la variable
de entorno queda como respaldo para no romper lo que ya funciona.

### 2. El vídeo DPP que sube el alumno no lo puede ver nadie
El paso 4 pide un vídeo de 30 segundos, la plataforma lo guarda… y **no aparece en ninguna
pantalla de admin**. Se le pide un vídeo a un alumno —a menudo menor de edad— que nadie
mira. Además de hueco de producto, es un problema de minimización de datos: se recoge algo
sin uso.

**Plan:** enseñarlo en la ficha del aspirante dentro de `admin-users`, con el mismo criterio
de privacidad que ya usa esa pantalla.

## Orden

1. `PlatformSetting` + pantalla de ajustes + mudanza del enlace de la comunidad.
2. Vídeo DPP visible para el staff.

Lo demás que pediría un "admin total" —precios, disponibilidad de coaches— depende de
decisiones de negocio que aún no están tomadas (ver `AGENDA_CON_ISAAC.md`).
