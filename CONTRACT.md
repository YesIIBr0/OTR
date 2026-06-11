# OTR Producción — CONTRATO entre agentes (formas exactas)

Helpers existentes (NO recrear):
- `app/lib/api.ts`: `ok(data?)`, `bad(error, status?)`, `readJson<T>(req)`, `clean(v, max?)`
- `app/lib/auth.ts`: `getSessionUser()` (→ User | null), `setSession(userId)`, `clearSession()`
- `app/lib/auth-crypto.ts`: `hashPassword(pw)`, `verifyPassword(pw, stored)`, `signSession`, `verifySession`
- `app/lib/db.ts`: `db` (PrismaClient singleton)
- `app/lib/rate-limit.ts`: `rateLimit(key, limit, windowMs) → {ok, retryAfter}`
- `app/lib/esc.ts`: `esc(str)` para texto de usuario en HTML
- `app/lib/video.ts`: `videoEmbedHtml(kind, src)`, `sanitizeHtml(html)`, `normalizeVideoSrc(kind, src)`
- Cliente global navegador: `window.api(url, body?, method?)` (POST por defecto, lanza en error), `window.go(route)`, `window.toast(msg, tone)`, `refresh()` (re-fetch app-data + re-render).

Roles: User.role ∈ `STUDENT | TEACHER | ADMIN`. isTeacher = role==='TEACHER'||'ADMIN'.

---
## 1. UPLOADS (archivos reales en disco → public/uploads, servidos por Next)
`window.otrUpload(file, kind) : Promise<{url, original, mime, size, id}>` — definido en Aula.tsx (Agente C).
Llama a `POST /api/uploads` con `FormData{ file, kind }`.

**POST /api/uploads** (Agente A1) — auth requerido.
- Lee `const form = await req.formData(); const file = form.get('file') as File; const kind = clean(form.get('kind'),20) || 'file'`.
- Valida: file existe; size ≤ 50MB; mime en allowlist (image/*, audio/*, video/*, application/pdf, text/plain, application/msword, openxml docs).
- Guarda vía `saveUpload(file, user.id, kind)` de `app/lib/uploads.ts`.
- Devuelve `ok({ url, original, mime, size, id })`. `url` = `/uploads/<cuid>.<ext>`.

`app/lib/uploads.ts` (Agente A1): `export async function saveUpload(file: File, userId: string, kind: string): Promise<{url,original,mime,size,id}>` — usa `fs/promises` + `path.join(process.cwd(),'public','uploads', name)`, nombre = `crypto.randomUUID()+ext`, crea fila `db.upload`, retorna datos. Mime/size se validan también aquí (defensa en profundidad).

---
## 2. QUIZ real (autoría del profesor; reemplaza el hardcode)
Modelos ya creados: Quiz(lessonId unique, title, passScore) · QuizQuestion(quizId, prompt, position) · QuizOption(questionId, text, correct, position).

**Forma del quiz en DB (de queries.ts, Agente B) dentro de cada lección type='quiz':**
```
lesson.quiz = {
  id, lessonId, title, passScore,
  questions: [ { id, prompt, options: [ { id, text /* correct SOLO si isTeacher */ } ] } ]
}
```
- Para ESTUDIANTE: las opciones NO incluyen `correct` (anti-trampa).
- Para PROFESOR: las opciones SÍ incluyen `correct` (para editar).
- queries.ts además expone `DB.quizByLesson = { [lessonId]: quiz }` con la misma forma.

**POST /api/quizzes** (Agente A1) — TEACHER/ADMIN. Body:
`{ lessonId, title?, passScore?, questions:[{ prompt, options:[{ text, correct:boolean }] }] }`.
Upsert: si la lección ya tiene quiz, borra sus questions/options y recrea. Verifica que la lección pertenezca a un curso del profesor (ownership). Devuelve `ok({ quizId })`.

**PATCH/DELETE /api/quizzes/[id]** (Agente A1) — TEACHER/ADMIN dueño. PATCH actualiza title/passScore/questions; DELETE borra el quiz.

**POST /api/quizzes/[id]/attempt** (Agente A1) — STUDENT. `[id]` = quizId. Body `{ answers: { [questionId]: optionId } }`.
- El servidor califica: cuenta opciones correctas elegidas. `score = nºcorrectas`, `total = nºpreguntas`, `percent = round(score/total*100)`, `passed = percent ≥ quiz.passScore`.
- Crea `QuizAttempt{ userId, userName, lessonTitle: quiz.lesson.title, score, total }`. Otorga XP SOLO si mejora el mejor previo (misma lógica que /api/quiz-attempts existente: copiar ese patrón).
- Devuelve `ok({ score, total, percent, passed, results: { [questionId]: { chosen, correctOptionId, correct:boolean } } })`.

---
## 3. AUTH: registro por rol + recuperación de contraseña
**POST /api/auth/register** (editar, Agente A2) — acepta además `role: 'student'|'teacher'` (default student) → mapea STUDENT/TEACHER. Si teacher, acepta `headline?` y `formats?` (qué enseña, coma-separado) y los guarda. Mantiene validaciones + rate limit existentes.

**POST /api/auth/forgot** (Agente A2) — `{ email }`. Rate-limited. Si el usuario existe: genera token aleatorio (`crypto.randomBytes(32).hex`), guarda `db.passwordReset{ userId, tokenHash: hashToken(token), expiresAt: now+1h }`. Envía email vía `sendPasswordReset(email, link)`; link = `${origin}/aula?reset=<token>` (origin de `req.headers.get('origin')` o env `APP_URL`). SIEMPRE devuelve `ok()` (no filtra si el correo existe). `hashToken` = sha256 hex (en mail.ts o auth-crypto; usa crypto de node).

**POST /api/auth/reset** (Agente A2) — `{ token, password }`. Busca passwordReset por tokenHash; valida no usado y no expirado; password ≥ 6; actualiza `user.passwordHash = hashPassword(password)`, marca `usedAt`. Devuelve `ok()`.

`app/lib/mail.ts` (Agente A2): `export async function sendMail({to,subject,html}): Promise<void>` — si `process.env.SMTP_URL` definido, usa `nodemailer.createTransport(process.env.SMTP_URL)`; si no, `console.log('[mail]', to, subject, html)` (fallback dev real). `export async function sendPasswordReset(email, link)` arma el HTML OTR. `export function hashToken(t): string` sha256 hex. Nunca lanza (try/catch interno, loguea).

---
## 4. SUBMISSIONS con archivo/texto real
**POST /api/submissions** (editar, Agente A2) — acepta `{ activity, kind, fileUrl?, fileName?, textBody?, courseCode? }` y los persiste. Mantiene lo existente.
- `kind`: 'audio'|'video'|'file'|'text'. Si hay fileUrl, guárdalo; si textBody, guárdalo.

## 5. PROFILE avatar (allowlist)
**PATCH /api/profile** (editar, Agente A2) — añade `avatarUrl` al allowlist de campos actualizables.

---
## Convenciones UI (screens son @ts-nocheck; render→string innerHTML, mount opcional)
- Subir archivo: `<input type="file" data-up="submission">` + botón; en mount: on change → `const {url}=await window.otrUpload(file,'submission')` → guardar en variable → preview. NO usar data-action global salvo lo que ya exista.
- Para postear: usar `window.api('/api/...', body)`. Tras éxito: `window.toast('Listo ✓','ok')` y `refresh()` si cambia estado global.
- Escapar SIEMPRE texto de usuario con `esc()`.
- Navegación entre pantallas: `window.go('ruta')` o `data-go="ruta"`.

## Branding (ver BRAND.md): negro `#0A0A0B`, ámbar `#F5A623`→`#FF9D2E`, blanco. Lema "By Students, For Students".
