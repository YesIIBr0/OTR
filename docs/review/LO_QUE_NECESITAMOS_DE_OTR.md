# Lo que necesitamos de OTR y de Isaac para continuar

Escrito el 2026-08-20. Es la lista de **pedidos**, no el inventario técnico (ese está en
`QUE_FALTA_PARA_ACTIVAR.md`). Ordenada por lo que bloquea antes.

---

## Bloquea el lanzamiento — sin esto la plataforma no puede usarse de verdad

### 1. Correo saliente (SMTP)  ← el más urgente
Hoy **no sale ni un correo**. Sin esto no hay verificación de cuenta, ni recuperar
contraseña, ni recordatorios de clase, ni avisos de reserva.

Necesitamos:
- Una cuenta de envío. Ya están en Hostinger, así que lo más rápido es un buzón suyo;
  si no, SendGrid/Postmark/Resend sirven igual.
- La **cadena de conexión** (`smtp://usuario:clave@host:puerto`) y el **remitente**
  (`no-reply@otr-academy.com` o el que decidan).
- Que alguien con acceso al DNS ponga **SPF y DKIM**. Sin eso los correos llegan a spam,
  que en la práctica es como no enviarlos.

### 2. El dominio — decisión + acceso
`otr-academy.com` sirve hoy **solo la landing**; `/aula` da 404. La plataforma vive en una
IP de pruebas. **Esto es lo que impide que alguien la use.**

Necesitamos:
- **La decisión**: ¿el Aula va en `aula.otr-academy.com`, o se mueve todo al dominio raíz?
- Acceso al DNS (Hostinger) para apuntarlo.

### 3. Legal — depende de un tercero, empezar YA
La academia trata datos de **menores**. Esto no se improvisa el día del lanzamiento.

Necesitamos de OTR:
- **Un abogado dominicano** que revise el clausulado (está escrito conforme a la Ley 172-13,
  pero nadie del equipo legal lo ha visto).
- **Razón social, RNC y domicilio** — el aviso de privacidad hoy dice literalmente
  "[razón social y RNC por confirmar]".
- Crear el buzón **`privacidad@otr-academy.com`**. El texto promete que por ahí se ejercen
  los derechos; si rebota, se incumple la ley.

### 4. Contenido real  ← esto es de Isaac y del equipo académico
La plataforma funciona, pero con datos de ejemplo. **No hace falta programar nada**: es
cargar información.

Necesitamos:
- **Cursos**: cuáles se imparten, sus módulos y lecciones, y el precio.
- **Coaches**: nombres, fotos, bios, y **quién atiende las llamadas de descubrimiento**.
- **Torneos y eventos** reales del calendario.
- **Horarios** de clase de verdad.

---

## Bloquea funciones concretas, no el uso general

### 5. Stripe — para poder cobrar
Cuenta de Stripe + `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET`. Y dos decisiones:
**en qué moneda** se cobra (DOP o USD) y **qué entidad legal** recibe el dinero.

### 6. Cloudflare Stream — para las clases grabadas
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_CUSTOMER_SUBDOMAIN`.

### 7. WhatsApp Business (Meta) — para los envíos que Isaac pidió en junio
Las cuatro credenciales de la API, un **número de WhatsApp Business**, y saber que Meta
tiene que **aprobar la plantilla** antes de cualquier envío masivo. Un número nuevo empieza
limitado (~250/día). Esto ya se le explicó a Isaac el 24/06 y sigue igual.

---

## Decisiones que solo puede tomar Isaac (no cuestan dinero, cuestan una respuesta)

Estas se le preguntaron el 09/08 y **nunca las contestó**:

1. **¿Los menores aparecen en el leaderboard público?** Es decisión de privacidad de la
   academia, no técnica.
2. **Postura general con menores de edad** — hoy se piden datos de tutor por debajo de 21,
   pero la tutela y las protecciones reforzadas se aplican por debajo de 18.
3. **Marketplace abierto**: hay 7 decisiones sin resolver. La crítica es **cómo se vetan los
   coaches externos que van a tratar con menores**.
4. **Instagram de OTR**: la cuenta real y qué publicaciones van en "Lo mejor de la temporada".
5. **Las 3 fotos de los programas** (Debate competitivo, Oratoria, Taller intensivo). El
   hueco ya está montado en el código: llegan las fotos y entran.

### Y dos nuevas, de esta semana

6. **Calendly**: ¿qué plan tienen y cuál es el enlace del evento? Importante: sin webhook
   —que es de plan de pago— el paso de la llamada dejaría de **verificarse** contra una
   reserva real y pasaría a marcarse por confianza. Hoy el servidor comprueba que la
   reserva existe. Es un cambio a peor si se hace con el plan gratuito.
7. **Verificación de correo**: no existe todavía y es la premisa del flujo de admisión.
   ¿Debe **bloquear** el acceso hasta verificar, o solo **avisar**? Ojo: si bloquea y SMTP
   sigue vacío, no entra nadie.

---

## Si entra un segundo desarrollador

- Acceso al repo de GitHub.
- La llave SSH del VPS.
- Leer `QUE_FALTA_PARA_ACTIVAR.md` y `COLA_CAMBIOS.md` antes de tocar nada.
- Aviso: trabajar en **git worktrees** separados (el `.next` compartido da 404 fantasma).

---

## Lo que NO hace falta pedir

- **No hay mock data que reemplazar en el código.** Todo sale de Postgres; lo que falta es
  contenido, que es carga de datos.
- **Los permisos están bien**: 65 de 74 rutas exigen sesión, 42 comprueban rol, y las 9
  públicas son las que deben serlo.
- La plataforma **funciona**: el flujo de admisión completo se probó de punta a punta
  contra la base real.
