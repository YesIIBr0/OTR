# Qué falta para activar OTR Academy

Medido el 2026-08-20 contra el repo y el servidor real, no de memoria.
Sirve también de guía de entrada para un segundo desarrollador.

---

## 0. Lo primero, porque cambia la conversación

**La plataforma NO está en el dominio real.** `otr-academy.com` (147.79.79.59, Hostinger)
sirve solo la landing de marketing — `/aula` y `/api/health` dan **404**. Todo lo que Isaac
ha estado revisando vive en la VPS de staging `2.25.205.214.sslip.io`.

No es que falten ajustes: **falta el despliegue a producción entero**. Hay que decidir si el
Aula va en un subdominio (`aula.otr-academy.com` apuntando a la VPS) o si se mueve la landing.
Eso arrastra DNS, TLS, backups y un `.env.production` de verdad.

**Y la verificación de correo no existe.** Isaac dice que el flujo arranca "después que
alguien cree una cuenta y verifique el correo". Hoy `app/api/auth/register/route.ts` **no
manda ningún correo ni exige verificación**: te registras y entras. Hay que construirlo.

---

## 1. Credenciales (medido en el `.env.production` del servidor — solo nombres, sin valores)

| Clave | Estado | Qué rompe que falte |
|---|---|---|
| `SMTP_URL` | **VACÍA** | **No sale ni un correo.** Recuperar contraseña, recordatorios de sesión, avisos de reserva y de debate, tutela, y la invitación al grupo que el paso 3 promete por escrito |
| `STRIPE_SECRET_KEY` | **VACÍA** | No se puede cobrar |
| `STRIPE_WEBHOOK_SECRET` | **VACÍA** | Sin confirmación de pagos |
| `CLOUDFLARE_ACCOUNT_ID` | **VACÍA** | Sin vídeo en streaming (clases grabadas) |
| `CLOUDFLARE_API_TOKEN` | **VACÍA** | ídem |
| `CLOUDFLARE_CUSTOMER_SUBDOMAIN` | **VACÍA** | ídem |
| `WHATSAPP_ACCESS_TOKEN` | **NO EXISTE** | La integración de WhatsApp Business está en el código pero sin config |
| `WHATSAPP_PHONE_NUMBER_ID` | **NO EXISTE** | ídem |
| `WHATSAPP_VERIFY_TOKEN` | **NO EXISTE** | ídem |
| `WHATSAPP_APP_SECRET` | **NO EXISTE** | ídem |
| `APP_URL`, `AUTH_SECRET`, `CRON_SECRET`, `DATABASE_URL`, Postgres | puestas | — |

⚠️ Ojo con el correo: `app/lib/mail.ts` **degrada en silencio** — sin `SMTP_URL` escribe en la
consola y no lanza error. O sea que hoy la plataforma *cree* que envía correos y no envía
ninguno, sin avisar a nadie.

---

## 2. Datos: mock vs real — mejor de lo esperado

**No hay mock data en el código.** `app/lib/data.ts` son 8 líneas (un shim), no un blob de
datos falsos. Todo sale de Postgres vía `prisma/seed.ts`.

Lo que hay que sustituir es **contenido, no código**: el seed crea 5 usuarios, 4 reservas,
3 torneos, 2 cursos con sus módulos y lecciones, 2 perfiles de coach, 1 highlight, etc. Todo
de ejemplo. Falta cargar el catálogo real: **cursos, coaches, torneos, precios y horarios**.

---

## 3. Permisos — en buen estado

De **74 rutas de API, 65 exigen sesión** y 42 comprueban rol explícito. Las 9 sin sesión son
las que deben ser públicas: los webhooks de Stripe y WhatsApp (firmados), el cron (con
`CRON_SECRET`), `health`, la disponibilidad de consultas, los torneos de Tabroom y los tres
de auth (registro, olvido y reset).

Lo que queda no es código, es **decisión de la academia**: menores en el leaderboard y el
vetting de externos del marketplace (los dos tocan a menores de edad).

---

## 4. Mapeos que faltan cablear

- **Enlace del grupo de WhatsApp** — `communityUrl` **no lo manda el servidor desde ningún
  sitio**. No es que faltara el valor: falta el conducto. Propuesta: `ADMISSION_COMMUNITY_URL`
  devuelto por `/api/admission`.
- **Calendly** — decisión pendiente. Sin webhook (plan de pago) el paso 2 pasaría a marcarse
  por confianza en vez de verificarse contra una reserva real, que es como funciona hoy.

---

## 5. Legal (bloquea el lanzamiento con menores)

- Revisión del clausulado por un **abogado dominicano**.
- **Razón social, RNC y domicilio** — el aviso hoy dice "[razón social y RNC por confirmar]".
- Crear el buzón **`privacidad@otr-academy.com`**: el texto promete que por ahí se ejercen los
  derechos. Si rebota, se incumple la Ley 172-13.

## 6. Activos que faltan

- Las **3 fotos de programa** (el hueco ya está montado en el código).
- Fotos y URLs reales de **Instagram** para "Lo mejor de la temporada".

---

## Orden que yo seguiría

1. **SMTP** — desbloquea correo, y sin correo no hay verificación ni recuperación de contraseña.
2. **Verificación de correo en el registro** — es la puerta que Isaac ya da por hecha.
3. **Producción**: subdominio + DNS + TLS + backups.
4. **Contenido real** (cursos, coaches, torneos, precios).
5. **Legal** en paralelo desde ya, porque depende de terceros.
6. **Stripe** cuando haya algo que cobrar.
7. Cloudflare y WhatsApp al final: mejoran, no bloquean.
