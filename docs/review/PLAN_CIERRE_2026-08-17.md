# Plan de cierre OTR Academy — 2026-08-17

Correlación completa del chat `OTR MOODLE` (WhatsApp, 2026-06-20 → 2026-08-17) contra el
estado real del repo y del despliegue. Cada adjunto se correlaciona por su timestamp, que
coincide exactamente con el del mensaje que lo acompaña.

Fuente: `_chat.txt` (390 líneas) + 39 imágenes + 2 vídeos + 1 PDF de branding.

---

## 0. Verdad de campo medida hoy (no supuesta)

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `origin/main` == local | ✅ `a1de7d1` | `git rev-parse` |
| Imagen que corre la VPS | ✅ creada `2026-08-16T19:32:21Z` | `docker inspect otr-web-1` |
| CI de `a1de7d1` | ✅ success `19:28Z` | `gh run list` |
| Wizard de admisión en el bundle servido | ✅ `adm.welcomeTitle`, `Comenzar mi proceso`, `needsAdmission` | grep sobre los 35 chunks servidos |
| Migración `20260810000000_add_admission` | ✅ aplicada | `_prisma_migrations` |
| Tablas `Admission` / `AdmissionConsent` | ✅ existen | `pg_tables` |
| Estudiantes / filas de `Admission` | 13 / **0** | `psql` |
| Suite | ✅ 1483 tests, 82 archivos | `vitest run` |
| Lint | ✅ 0 errores (796 warnings `no-explicit-any`) | `npm run lint` |

**Conclusión sobre "no lo veo en la VPS":** el wizard **sí está desplegado y migrado**. Con
0 filas en `Admission`, `queries.ts:2163` da `needsAdmission = true` para los 13 estudiantes,
así que cualquier login de alumno debería caer en el wizard. El deploy ocurrió ayer 16/08 a
las 15:32 (hora RD) — **posterior** a la última revisión de Isaac.

> ⚠️ Ojo al método: `admission` se carga **diferido** (`screens.ts:44`). Un grep al bundle
> inicial NO lo encuentra y hace creer que falta. Hay que buscar en los chunks perezosos.

---

## 1. Ledger correlacionado: petición → adjunto → estado

### Tanda 2026-08-04, 22:23–22:45 (17 imágenes) — estética y navegación
| Hora | Petición | Adjunto | Estado |
|---|---|---|---|
| 22:23 | Info bajo los cursos; eliminar reservas; curso a la mitad; contenido y calificaciones dentro de cursos | `…3076`, `…3077` | ✅ |
| 22:24 | Clases más grandes, con thumbnail | `…3078` | ✅ |
| 22:26 | `MIS PROGRAMAS` → dropdown (Activos / Buscar nuevos / Buscar coaches / Debate Hub / Mensajes) | `…3080` | ✅ |
| 22:29 | Membresía para perfil; `PROGRESO` → dropdown (Trayectoria / Niveles / Asignaciones / Logros) | `…3083`, `…3084` | ✅ |
| 22:32–22:33 | Aesthetic de clases y cursos; referencia Preply | `…3086`–`…3096` | ✅ (PR #30) |
| 22:34 | Cierre "como en adjudica" | `…3099` | ✅ |
| 22:35 | Toggle COACH / STUDENT | `…3100` | ✅ (visible en login) |
| 22:45 | Bajar bloque de sección principal; arriba "Welcome, Isaac" | `…3101` | ✅ |

### 2026-08-06 — Brand Book
`…3105 OTR Academy - Branding.pdf` (12 págs) → "cambia toda la estética usando ese doc".
✅ Implementado como sistema de diseño (greige `#F1F1EF`, radios 3–6, botones h40, logo
vectorizado). Guardián: `tests/brand-palette.test.ts`.

### Tanda 2026-08-07 — dashboard y header
| Hora | Petición | Adjunto / artifact | Estado |
|---|---|---|---|
| 12:08 | "hazlo funcional; las clases son en Zoom → deben ser **eventos** a los que entres a través de la plataforma" | — | ✅ |
| 12:25 | Dashboard | artifact `831d6fa3` + `…3125` | ✅ |
| 12:47 | Menú arriba en el header; bordes menos redondeados | — | ✅ |
| 17:37 | Reemplazar por el logo real | `…3133`, `…3134` | ✅ logo vectorizado |
| 17:42 | Sección de eventos | artifact `3a0b87a1` | ✅ |
| 17:43 | Header así; **más espacio en blanco**, textos más chicos | `…3148`, `…3149` | ✅ |

### Tanda 2026-08-08
| Hora | Petición | Adjunto | Estado |
|---|---|---|---|
| 16:24 | **"Quítale el Aula, deja el logo y ya"** | `…3158` | ⚠️ **PARCIAL** — corregido en el shell del app, pero `app/components/Auth.tsx:416` todavía pinta `OTR Aula` en el login |
| 17:01 | Adentro de las clases / menú de clases | artifact `65123345` | ✅ |
| 18:08 | Debate Hub se queda (irá conectado a NSDA) | `…3169` | ✅ (no se tocó) |

### Tanda 2026-08-09, 11:30–11:41
| Hora | Petición | Adjunto | Estado |
|---|---|---|---|
| 11:30 | Leaderboard debe enseñar **todos** | `…3172` | ✅ PR #30 |
| 11:31 | "Best of the season" → a Instagram, no a eventos; subida desde el portal de coach | `…3175`, `…3176` | ✅ PR #30 |
| 11:32 | Vista larga 1 por fila; 4 en preview + "ver todos" | `…3177` | ✅ |
| 11:33 | "Find New" abre otra pestaña — debería ser en la misma | `…3178`, `…3179` (vídeo) | ✅ — no queda ningún `target="_blank"` en cursos; los que restan son enlaces externos legítimos (IG, Zoom, WhatsApp) |
| 11:34 | "Descubre nuevos" abajo, por tipos de clase | `…3180` | ✅ |
| 11:36 | W verde / L negro; platinum en platino, gold en gold; foto del estudiante de fondo | `…3183` | ✅ PR #33 (tiers metálicos) |
| 11:40 | Cursos por categoría estilo Preply; menú `Progress` con `Ranks` + `Achievements` | `…3186` | ✅ |
| 11:40 | Notificaciones → Messages | — | ✅ |

### Tanda 2026-08-09, 15:37–19:14 — el naranja
| Hora | Petición | Adjunto | Estado |
|---|---|---|---|
| 15:37 | Centralizar el acceso; logo arriba a la izquierda | `…3198` | ✅ verificado hoy en la VPS |
| 15:39 | Demasiado naranja → negro/blanco; completed y progress bar en **verde** | `…3201` | ✅ PR #33 |
| 15:40 | Borrar los eyebrows en todas las páginas | `…3203` | ✅ |
| 15:41 / 15:42 | Ídem naranja; sustituir bloque | `…3204`, `…3206` | ✅ |
| 19:14 | Quitar acentos naranja intenso, incluida la barra #1 del leaderboard | `…3209` | ✅ PR #33 |

→ Wilser confirma despliegue el 09/08 20:25. **Toda esta tanda está cerrada.**

### 2026-08-11, 00:40 — el pedido vigente
Artifact **`1e19da45`** = flujo que arranca *después de crear cuenta y verificar correo*.
Isaac manda vista **desktop y móvil** y pide que **toda la información se guarde en base de datos**.

Estado: implementado (PR #34 wizard 4 pasos, #35 clausulado Ley 172-13, #36 pintado como el
mockup) y **desplegado ayer 16/08 15:32**. Persistencia: `Admission` + `AdmissionConsent`,
API `/api/admission`, `/api/admission/step`, `/api/admission/video`.

⚠️ **Sin verificar**: la paridad visual "tal cual el artifact" y el recorrido con clicks.

---

## 1-bis. Paridad medida: nuestro wizard vs. el artifact `1e19da45`

Comparación hecha con los **builders reales** (`app/lib/scr-admission.ts` + `shell.ts`
renderizados sin servidor) contra el artifact abierto en Chrome, ambos a 1568 px.

### Coincide ✅
Header (escudo + `OTR Academy` / `PORTAL DEL ESTUDIANTE`, `Soporte 24/7`, nombre +
`Nueva estudiante` + avatar) · bienvenida a sangre con foto oscura, titular, lead y CTA
`Comenzar mi proceso →` + `4 pasos · aprox. 15 minutos` · barra `N de 4 pasos completados`
con el porcentaje en verde · raíl de 4 pasos con estados En progreso / Completado / Bloqueado
con candado · tarjeta con cabecera `● Formulario de Admisión · llénalo aquí` · sección 1
completa · bloques A/B/C de experiencia y días.

### Deriva — estado tras la sesión del 17/08
| # | Artifact | Antes | Estado |
|---|---|---|---|
| 1 | sin chip sobre el título | chip `PASO 1 DE 4` | ✅ **retirado** del panel; el rail lo conserva en su `aria-label` |
| 2 | `Join OTR Academy Community Chat` | `Comunidad de la academia` | ✅ **renombrado** en ES y EN |
| 3 | 3 tiles **grandes con imagen** | 3 chips de texto | ✅ **tiles implementados** (foto 4/3 arriba + banda con letra y nombre); siguen siendo radios nativos. ⚠️ **hueco de foto vacío**: ver §2 B-bis |
| 5 | `Curso / Nivel` a lo ancho | a media columna junto a Institución | ✅ **cada campo en su fila a lo ancho**. ⚠️ sigue siendo `<select>`, no texto libre: el valor viaja como CÓDIGO del contrato (`SECUNDARIA`…) y abrirlo a texto libre obliga a tocar la API |
| 6 | `Escribe aquí tu respuesta...` | sin puntos | ✅ **puntos suspensivos** en ES y EN |
| 4 | selector de país con bandera | prefijo fijo `+1 · RD` | ❌ **NO hecho, a propósito.** El kit prohíbe emoji en cadenas (cabecera de `i18n-keys/adm.ts`) y un selector multi-país rompería la validación dominicana de 10 dígitos (809/829/849). Decisión de Isaac |
| 7 | sin textos de ayuda | `Formato mes / día / año…`, `10 dígitos…` | ❌ **NO hecho, a propósito.** Son descripciones `aria-describedby` de sus campos; quitarlas es un retroceso de accesibilidad. Decisión de Isaac |

### No coincide ⚠️ — divergencia DELIBERADA (decisión, no descuido)
| # | Artifact | Nuestro | Por qué |
|---|---|---|---|
| 8 | sección 2 `Información del padre/madre o tutor` siempre visible | aparece **solo** si la fecha de nacimiento da menor de 21 | por eso nuestra numeración corre 2/3/4 en vez de 3/4/5 |
| 9 | 1 checkbox de una línea | aviso de privacidad desplegable (Ley 172-13) + 2 checkboxes (obligatorio + autorización de imagen opcional) | PR #35; el mockup no es válido legalmente con menores |
| 10 | `Atrás \| Marcar como completado \| Siguiente` | `Atrás \| Siguiente` + `Guardar y continuar` dentro de la tarjeta | en el mockup nada se guarda; a mano se pasaría sin datos y sin vídeo |

**Pasos 2, 3 y 4:** los nuestros están completos y coherentes (calendario de agosto 2026 +
`Confirmar llamada`; `Unirme al grupo` + `Ya estoy dentro`; grabador DPP de 30 s con
`Grabar vídeo` / `Subir archivo`). **No pude compararlos contra el artifact**: sus clics
dejaron de registrar dentro del iframe sandbox y no logré avanzar más allá del paso 1.

---

## 2. Lo que queda abierto

### A. Bloqueado por acceso (no por código)
1. **Pasos 2–4 del artifact sin comparar** — ver arriba.
2. **Verificación con clicks del wizard en la VPS.** Requiere iniciar sesión como alumno.

### B. Cabos de código
3. `app/components/Auth.tsx:416` — quitar `Aula` del wordmark del login (petición 08/08).
   **Pendiente**: no se tocó en esta sesión.
4. Los puntos 4 y 7 de §1-bis, ambos parados a propósito y esperando decisión de Isaac.

### B-bis. Dependencia de activos
5. **Fotos de los 3 programas** (Debate competitivo / Oratoria y comunicación / Taller
   intensivo). En el repo solo existe **una** foto de marca (`public/img/hero-speaking.jpg`);
   las otras son el OG y capturas del site. Repetirla en tres programas distintos sería
   mentir, así que los tiles se pintan con el hueco en greige. En cuanto lleguen las fotos,
   basta con dar `background-image` a `.adm-prog-img` — la estructura ya está.

---

## 1-ter. Gate de la sesión del 17/08 (medido, no supuesto)

| Comprobación | Resultado |
|---|---|
| `tsc --noEmit` | ✅ 0 errores |
| `npm run lint` | ✅ 0 errores (796 warnings preexistentes de `no-explicit-any`) |
| Suite | ✅ **1488** tests, 82 archivos (eran 1483 → +5 casos de paridad) |
| `next build` | ✅ limpio |

⚠️ El build **falla sin `AUTH_SECRET` real**: el worktree no tiene `.env` y el guardián
aborta con el placeholder de `.env.example`. No es regresión, es el entorno.

### Lo verificado con los ojos
Los 5 pantallazos del wizard renderizados con los builders reales, en Chrome a 1568 px y en
móvil a 375 px: chip fuera, rail con el nombre de Isaac, placeholders con puntos suspensivos,
Institución y Curso a lo ancho, y los 3 tiles de programa —clicando el tile A queda
seleccionado con su borde negro y la letra invertida, o sea el radio nativo sigue vivo—.
En móvil los tiles se apilan a una columna (303×215 cada uno, medido).

### Lo NO verificado, y por qué
El recorrido **completo con sesión real** (guardar el paso 1 en la BD, agendar la llamada,
subir el vídeo DPP) **no se probó**: exige iniciar sesión y no tecleo contraseñas. La
persistencia está cubierta por `tests/api-admission.test.ts`, que es apoyo, **no** prueba
de pantalla.

### C. Decisiones de negocio sin respuesta de Isaac
Wilser las preguntó el 09/08 13:26 y el 09/08 17:55; **nunca fueron contestadas**:
4. **Menores en el leaderboard** — decisión de privacidad de la academia.
5. **Legalidad con menores de edad** (planteado 17:55).
6. **Marketplace abierto** — 7 decisiones sin resolver; la crítica es el vetting de externos
   que tratarán con menores. Spec: `docs/review/MARKETPLACE_ABIERTO_2026-07.md`.
7. **Stripe real** — faltan las llaves.
8. **Instagram de OTR** — fotos y URLs reales; no se inventan.

### D. Fuera del alcance "sitio web"
9. Envío masivo por WhatsApp con n8n (24/06) — depende de aprobación de plantilla por Meta,
   lista opt-in y número calentado. El 14/07 quedó "falta el API de Meta".

---

## 3. Orden de ejecución propuesto para hoy

1. Desbloquear el acceso (login de alumno) y **recorrer el wizard con clicks** en la VPS:
   los 4 pasos, el caso menor de 21 con tutor, el vídeo DPP y el guardado en BD.
2. Abrir el artifact `1e19da45` y hacer la **comparación pantalla por pantalla**; anotar cada
   diferencia como cabo concreto.
3. Aplicar los cabos de paridad + quitar `Aula` del login. Test primero, suite completa.
4. Clicks en la pantalla vecina que no debía cambiar (login de coach, dashboard).
5. Commit → PR → merge → deploy → paridad → clicks en la VPS.
6. Mandar a Isaac la lista de las 5 decisiones (§2C) que solo él puede cerrar.

**Realidad del alcance:** los puntos 1–5 son cerrables hoy. Los de §2C **no dependen de
código** y no se cierran sin respuesta de Isaac; §2D depende de Meta.
