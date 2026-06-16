# ADR-0003 — CI/CD "VPS-pull" (el VPS baja la imagen; sin SSH entrante)
**Estado:** Aceptado · **Fecha:** 2026-06

## Contexto
Deploy a un VPS Hostinger de 1 CPU. El push original (GitHub Actions hace SSH/rsync ENTRANTE al VPS) fallaba ~40% de las veces: Hostinger dropea ciertas IPs de runners de GitHub (rangos de nube). El VPS no bloquea (sin fail2ban/ufw); es la red de Hostinger.

## Decisión
**Pull-based:** GitHub Actions construye la imagen y la publica en ghcr.io (privada). El VPS la BAJA solo, por un **cron cada 2 min** (`scripts/vps-pull.sh`): compara el digest, y si cambió hace `docker compose down --remove-orphans && up -d` + `prisma db push` + healthcheck. El VPS está logueado en ghcr con un PAT `read:packages`.

## Consecuencias
- **+** Inmune a los drops de red entrantes — el VPS **inicia** la conexión saliente. Deploys deterministas.
- **+** El VPS no compila (1 CPU): la imagen viene pre-construida del runner. CI gatea con `tsc` + `prisma validate` (nunca despliega roto).
- **−** Latencia de hasta 2 min entre push y deploy (cron). Aceptable para staging.
- **−** `down+up` implica ~10-15s de downtime por deploy con cambio (elegido sobre el rolling recreate que causaba conflictos de contenedor → 502). Mitigar con grace period (ESC-2).
- **Nota:** `down+up` se eligió tras 2 incidentes de "container name already in use" (huérfano renombrado que `--remove-orphans` no borra; `down` sí limpia por etiqueta de proyecto).
