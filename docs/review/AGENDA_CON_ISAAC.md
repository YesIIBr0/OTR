# Agenda para hablar con Isaac

Puntos y preguntas para cerrar cómo va a funcionar OTR Academy. Ordenado por lo que más
cuesta si se deja para el final.

---

## A · La plataforma hace promesas. ¿Quién las cumple?

Esto es lo que menos se ha hablado y lo que más rápido se rompe. Hoy el sitio le **promete
cosas por escrito** a cada alumno que entra, y esas promesas necesitan una persona detrás:

| La plataforma dice… | ¿Quién lo hace? |
|---|---|
| "Soporte 24/7" en la cabecera de todas las pantallas | ¿Quién contesta, en qué horario de verdad, y por qué canal? |
| "Tu coach te contactará con los próximos pasos" (al terminar la admisión) | ¿Quién ve que entró un alumno nuevo? ¿En cuánto tiempo lo contactan? |
| "Te enviaremos la invitación al grupo" (paso 3) | Ya tenemos el enlace, pero ¿quién mete a la gente y quién modera? |
| "Agenda tu llamada de 20 min con un coach" | ¿Qué coaches la atienden y con qué disponibilidad real? |
| "Puedes ejercer tus derechos escribiendo a privacidad@…" | ¿Quién lee ese buzón y responde? (la ley obliga) |
| El alumno sube su vídeo DPP | ¿Alguien lo revisa? ¿Para qué se usa? |

**Preguntas concretas:**
1. ¿Quién es el **administrador** de la plataforma? ¿Isaac, o alguien del equipo?
2. ¿Quién carga el contenido (cursos, torneos, highlights) — ustedes o nosotros?
3. Cuando un alumno completa la admisión, **¿qué pasa después y quién lo dispara?**
4. ¿Los coaches van a tener cuenta? ¿Quién se las crea y quién los verifica?

---

## B · Para encender esto necesitamos de ustedes

Sin estas cuatro, la plataforma no se puede usar de verdad:

1. **Correo saliente.** Hoy no sale ni uno. Sin esto no hay verificación de cuenta ni
   recuperar contraseña. Están en Hostinger: lo más rápido es un buzón suyo, más SPF y DKIM
   en el DNS (si no, todo cae en spam).
2. **El dominio.** `otr-academy.com` sirve solo la landing; el Aula no está ahí.
   **¿Va en `aula.otr-academy.com` o movemos todo?** Y necesitamos acceso al DNS.
3. **Legal.** Tratan datos de menores. Hace falta un **abogado dominicano** que revise el
   clausulado, la **razón social, RNC y domicilio** (hoy el aviso dice "[por confirmar]") y
   crear el buzón `privacidad@otr-academy.com`.
4. **Contenido real.** Cursos con precio, coaches con foto y bio, torneos, horarios.
   Esto no es programar: es cargar información, y solo ustedes la tienen.

Después, para funciones concretas: **Stripe** (cobrar), **Cloudflare Stream** (clases
grabadas) y **WhatsApp Business** (los envíos masivos que pediste en junio — recordar que
Meta aprueba la plantilla y un número nuevo empieza limitado a ~250/día).

---

## C · Decisiones que solo Isaac puede tomar

Cinco se preguntaron el **09/08 y siguen sin respuesta**:

1. **¿Los menores aparecen en el leaderboard público?** Es privacidad, no técnica.
2. **Postura con menores**: hoy se piden datos de tutor por debajo de 21, pero la tutela
   real aplica por debajo de 18. ¿Se queda así?
3. **Marketplace abierto**: 7 decisiones sin resolver. La crítica: **¿cómo se vetan los
   coaches externos que van a tratar con menores?**
4. **Instagram**: cuenta real y qué publicaciones van en "Lo mejor de la temporada".
5. **Las 3 fotos de los programas.** El hueco ya está montado en el código.

Y dos nuevas:

6. **Calendly**: ¿qué plan tienen y cuál es el enlace? Ojo: sin webhook (plan de pago), el
   paso de la llamada dejaría de **verificarse** y pasaría a marcarse por confianza. Hoy el
   servidor comprueba que la reserva existe. Con el plan gratis, es un cambio a peor.
7. **Verificación de correo**: no existe y es la premisa del flujo. ¿Debe **bloquear** el
   acceso hasta verificar, o solo **avisar**?

---

## D · Dinero

1. **¿Cuánto cuesta cada programa** y bajo qué modelo — ¿mensualidad, por curso, por paquete?
2. **¿En qué moneda se cobra**, DOP o USD?
3. **¿Qué entidad legal recibe el dinero?** (es la misma que va en el aviso de privacidad)
4. **¿Hay becas o precios diferenciados?** El leaderboard ya premia con "beca completa".
5. **¿Política de reembolso?** Hay que escribirla antes de cobrar el primer peso.

---

## E · Lanzamiento

1. **¿Cuándo quieren abrir, y con cuántos alumnos?**
2. **¿Piloto o abierto?** Recomiendo piloto con un grupo pequeño: si algo falla, falla
   con 10 personas y no con 200.
3. **¿Qué es lo mínimo para abrir?** Mi lectura: correo + dominio + legal + un curso real
   cargado. Stripe puede esperar si los primeros cobran por fuera.
4. **¿Qué pasa con los alumnos que ya tienen?** ¿Se migran, se registran solos?

---

## F · Después de la entrega

1. **¿Quién mantiene esto?** Se habló de 120 días de soporte y fixes — conviene dejar por
   escrito qué entra y qué no.
2. **¿A nombre de quién quedan las cuentas** (servidor, dominio, Stripe, correo)? Deberían
   ser de OTR, no personales.
3. **El segundo desarrollador**: ¿cuál es su alcance, quién coordina, y en qué se mete
   primero? Le hace falta acceso al repo y la llave del servidor.
4. **¿Quién decide qué se construye después?** Hoy los cambios llegan por WhatsApp en
   capturas; funciona, pero conviene una sola lista priorizada.

---

## G · Lo que Isaac debería saber que YA está bien

Para que la conversación no sea solo pedir:

- **La plataforma funciona.** El flujo de admisión completo se probó de punta a punta
  contra la base de datos real: formulario, llamada agendada, comunidad y vídeo.
- **No hay "mock data" que reemplazar en el código.** Lo que falta es contenido.
- **Los permisos están bien**: 65 de 74 rutas exigen sesión y 42 comprueban rol.
- **El clausulado legal ya está escrito** conforme a la Ley 172-13, con consentimiento del
  tutor y autorización de imagen aparte. Solo falta que un abogado lo valide.
- Todo lo que pidió esta semana está desplegado y verificado con clicks.
