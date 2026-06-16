# OTR Academy — Resumen Ejecutivo (para liderazgo)
**16 jun 2026.** Lenguaje de negocio, sin jerga. Detalle técnico en `AUDIT.md` / `ACTION_PLAN.md`.

## Veredicto en una frase
La plataforma es un **producto sólido para su etapa** (construido por una sola persona) y **se puede abrir a un público inicial pequeño con riesgos controlados**, pero **todavía NO está lista para 3.000 usuarios** ni para cobrar de verdad: faltan integraciones reales (pagos, correo, video), red de seguridad de datos, y contenido. **Salud técnica: 6/10.**

## Lo que YA funciona bien (no es código de juguete)
Acceso seguro con contraseñas cifradas, permisos correctos por rol, el dinero se maneja con transacciones que evitan dobles cobros, despliegue automático y confiable, y un creador de cursos completo estilo Moodle (plantillas, arrastrar y soltar, exámenes). El equipo (1 dev) ha avanzado mucho.

## Los riesgos que pueden HACER DAÑO (atendidos o en cola)
1. **Pérdida total de datos** — antes no había copia de seguridad; un fallo del servidor borraba todo. **✅ Resuelto hoy** (copia diaria automática). *Falta llevarla fuera del servidor (coste mínimo).*
2. **La "sala de clase" virtual no existe** — hoy un alumno paga una sesión, entra… y ve una pantalla en blanco. **Bloquea el corazón del negocio** (el coaching pagado). Requiere elegir y pagar un proveedor de video.
3. **El sistema se satura con poca gente** — diseñado para 1 servidor pequeño; con ~100 usuarios a la vez empieza a ir lento. Tiene arreglo barato (no hay que reescribir), pero hay que hacerlo antes de crecer.
4. **Cambios "a ciegas"** — no hay pruebas automáticas; cada cambio futuro es una apuesta. Una sola persona sabe cómo funciona todo (**riesgo de "factor bus"**).

## Vulnerabilidades de seguridad — atendidas hoy ✅
Cerré 4 agujeros reales (un enlace que permitía redirigir a phishing, un guard de borrado de base de datos que era saltable, un vector para tumbar el servidor, y una fuga de pantallas de administrador). Ninguna había sido explotada; ya están tapadas y desplegadas.

## Las 5 apuestas que más mueven la aguja (en orden)
| # | Apuesta | Qué desbloquea | Necesita de ti |
|---|---|---|---|
| 1 | **Arreglar integridad de datos + control de versiones de la BD** | Iterar rápido sin romper producción; dinero sin "huérfanos" | Solo OK (ya verifiqué que es seguro) |
| 2 | **Terminar la sala de video** | El coaching pagado — el negocio central | **Elegir proveedor de video** (coste) |
| 3 | **Copia de seguridad externa + pruebas del dinero** | Sobrevivir un desastre; cambios seguros | OK + un bucket (centavos/mes) |
| 4 | **Caché + ajustes de BD** | 80% de la escala a 3.000 usuarios, esfuerzo bajo | Solo OK |
| 5 | **Decisiones de producto pendientes** | Convertir el MVP en producto cobrable | **Llaves de Stripe, correo, dominio, marco legal** |

## Lo que cuesta vs lo que desbloquea
- **Casi todo lo técnico** lo puede hacer el dev actual en olas, **sin coste nuevo de infra** (mismo servidor, ~+15 USD/mes solo si crece).
- **Lo que SÍ necesita inversión/decisión tuya:** proveedor de video, servicio de correo, llaves de Stripe, dominio oficial, y redacción legal (términos, privacidad, consentimiento de menores). Sin esto, **no se puede cobrar ni lanzar a público con menores**, por más impecable que esté el código.

## Recomendación
**Lanzar a un grupo pequeño y controlado ahora** (registro + cursos + debate, sin cobro), mientras se cierran en paralelo las 3 primeras apuestas. **Abrir el cobro y escalar solo cuando** estén la sala de video, los pagos reales y el marco legal. El mayor riesgo del proyecto no es el código — es que **una sola persona lo sostiene**: documentar y sumar un 2º dev es la inversión de mayor retorno a medio plazo.
