# 🗺️ OTR Aula — Plan & Roadmap

LMS propio (sin Moodle) para OTR Debate Academy. **Stack:** Next.js + TypeScript + PostgreSQL (Prisma) + Auth.js + Stripe + Bunny (video) + Resend (email), hospedado en **Hostinger VPS**.

## Principio
Construir **nuestro producto**, no reinventar la plomería: usamos bloques probados (auth, Stripe, Bunny, ORM) y escribimos solo lo único nuestro (lógica de cursos/exámenes/tracking + la UX del template).

## Fases

| Fase | Qué | Estado |
|---|---|---|
| **0 · Fundación** | Next.js + tu template (CSS/markup) corriendo en `localhost:3000` | ✅ Hecho |
| **1 · Front-end funcional (HOY)** | Portar **todas** las pantallas + navegación + interacciones reales (grabador, examen con puntaje, chat, foro, notificaciones, roles alumno/profesor) | ✅ Hecho |
| **2 · Backend núcleo** | PostgreSQL + Prisma + **Auth.js** (login + roles reales) + datos persistentes (usuarios, cursos, módulos) | ⏳ |
| **3 · Venta de acceso** | **Stripe Checkout** + webhooks + gating de cursos (pagar → inscrito) | ⏳ |
| **4 · Contenido & medios** | **Bunny** (video) + **Resend** (email) + subida de archivos | ⏳ |
| **5 · Despliegue** | VPS Hostinger + dominio `academy.otr-academy.com` + SSL + backups | ⏳ |

## Alcance de HOY (lo que sí termino en esta sesión)
- ✅ Página principal (dashboard) con tu diseño exacto.
- 🔄 Las 18 pantallas portadas y navegables: dashboard · curso · índice · lección · **grabador** · **examen + resultados** · reproductor · notas · **panel profesor (tracking)** · calificador · participantes · progreso/niveles · insignias · perfil · foro · hilo · mensajería.
- 🔄 Interacciones funcionales (no solo visuales): grabador con timer/onda, examen que **califica de verdad**, chat que responde, foro, switch alumno↔profesor, notificaciones, toasts.

## Requiere tus cuentas (lo hacemos apenas las tengas)
- **Stripe** (llaves test/live) → cobrar.
- **VPS Hostinger** + dominio → desplegar.
- **Bunny / Resend** → video y correo en producción.

## Estructura del proyecto
```
app/
├─ styles/      tu CSS (tokens/app/screens/responsive)
├─ lib/         icons · data · components · shell · scr-* (tus pantallas) · screens (router)
├─ components/  Aula.tsx (app + interacciones)
prisma/schema.prisma   modelo de BD (usuarios, cursos, enrollment/pagos, submissions)
```
