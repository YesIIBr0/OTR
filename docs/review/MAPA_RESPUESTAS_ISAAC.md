# Respuestas de Isaac → qué significa en el sistema

Mapeado el 2026-08-20 contra el código. Cada respuesta suya, contra lo que hay hoy.

---

## 1. "Administradores somos como 6, nosotros + los coaches"

**Hoy en la VPS hay 1 ADMIN, 2 TEACHER, 13 STUDENT, 1 PARENT.**

Nada que construir: la consola ya permite cambiar roles, así que el admin actual puede
promover a los otros 5. Pero hace falta que **existan esas cuentas** (que se registren) y
saber **quiénes son**.

⚠️ **Ojo con "+ los coaches".** Un coach NO debería ser admin: el admin puede cambiar roles,
suspender cuentas, exportar y **borrar datos de cualquier usuario**. Con menores de por medio,
cuantas menos manos tengan ese poder, mejor. Hoy los coaches tienen su propio rol con lo suyo.

**Pregunta para Isaac:** ¿los coaches necesitan administrar *usuarios*, o solo *sus clases*?
Si es lo segundo, ya lo tienen y no hay que tocar nada.

---

## 2. "El contenido lo carga el admin"

**Ya funciona.** El constructor de cursos (`course-builder`) y "Mis cursos" (`manage`) están
abiertos a `teacher` **y** `admin`. Un admin puede crear cursos, módulos y lecciones hoy mismo.

**Pregunta:** si el contenido lo carga solo el admin, **¿le quitamos el constructor a los
profesores?** Hoy pueden. No es un fallo — es una decisión de quién manda sobre el contenido.

---

## 3. "Un alumno completa e igual que en Adjudica tenemos que aprobarlo"  ← ESTO NO EXISTE

Hoy el alumno completa los 4 pasos → `status = COMPLETED` → **entra directo al Aula**. No hay
aprobación de nadie.

Lo que hay que construir:

| Pieza | Qué cambia |
|---|---|
| Estado | `IN_PROGRESS \| COMPLETED` pasa a incluir **`PENDING_REVIEW`** y **`APPROVED` / `REJECTED`** |
| Campos | quién revisó, cuándo, y una nota (por qué se rechazó) |
| Compuerta | `needsAdmission` deja de mirar "4 pasos hechos" y pasa a mirar "aprobado" |
| Pantalla del alumno | tras completar ya no dice "estás dentro", sino **"tu solicitud está en revisión"** |
| Pantalla del admin | aprobar / rechazar, con el expediente delante |

### Y aquí se resuelve solo el otro hueco
El **vídeo DPP** que sube el alumno hoy **no lo puede ver nadie**. Es exactamente lo que el
admin necesita mirar para aprobar. Las dos cosas son la misma pantalla: la ficha del
aspirante con su formulario, su vídeo y los botones de aprobar o rechazar.

### ⚠️ CHOQUE con lo que Isaac pidió hace unas horas
Nos pidió que la pantalla final dijera **"👏 ¡Bienvenido a OTR Academy!"**. Con aprobación
manual, esa pantalla **miente**: el alumno terminó sus pasos, pero todavía no está dentro.

Hay que elegir:
- **A ·** El saludo se queda, pero solo **después** de aprobar. Al terminar los 4 pasos ve
  "solicitud enviada, te avisamos". Es lo honesto.
- **B ·** El saludo sale al terminar los pasos, y la aprobación es un trámite interno que el
  alumno no ve. Más simple, pero le decimos "estás dentro" a alguien que quizá se rechace.

**Recomiendo A.**

### ⚠️ RIESGO al desplegar
Si la compuerta pasa a "aprobado", **todos los alumnos actuales quedan fuera** hasta que
alguien los apruebe — y hoy solo hay **un** admin. La migración tiene que **dar por
aprobados a los que ya completaron** (Analia incluida). Si no, se cierra la puerta con la
gente dentro.

---

## 4. "Nosotros también verificamos la cuenta de los coaches"

**Ya existe y funciona.** La consola de usuarios tiene verificar/quitar verificación de coach,
y la verificación es requisito para recibir reservas. Cada cambio queda en el registro de
auditoría. **Nada que construir.**

---

## Resumen

| Respuesta de Isaac | Estado |
|---|---|
| 6 admins | Ya se puede — falta que existan las cuentas y decidir si los coaches entran |
| Contenido lo carga el admin | Ya funciona — decidir si se lo quitamos a los profesores |
| **Aprobar al alumno** | **Hay que construirlo** — y arrastra el vídeo DPP y la pantalla final |
| Verificar coaches | Ya existe |

**De cuatro respuestas, tres ya están resueltas.** La única obra es la aprobación, y con
ella se cierra de paso el hueco del vídeo.
