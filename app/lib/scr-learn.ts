// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { videoEmbedHtml } from "./video";
import { esc } from "./esc";
export const S = {};

// Resuelve la lección activa (window.__lesson) entre TODOS los cursos inscritos:
// lessonId es único global, así que escaneamos DB.coursesContent (Moodle multi-curso)
// y devolvemos también el curso contenedor (para code/name/coach). Cae a courseModules
// (primer curso) por compatibilidad si coursesContent aún no está poblado.
function findLesson(id) {
  for (const c of (DB.coursesContent || [])) {
    for (const m of (c.modules || [])) {
      for (const it of (m.items || [])) if (it.id === id) return { lesson: it, course: c };
    }
  }
  for (const m of (DB.courseModules || [])) {
    for (const it of (m.items || [])) if (it.id === id) return { lesson: it, course: null };
  }
  return { lesson: null, course: null };
}

// Lección activa (seleccionada al navegar; patrón window.__lesson).
function currentLesson() {
  return findLesson((window as any).__lesson).lesson;
}

// Quiz real desde la BD. Prioriza el quiz de la lección clicada (window.__quizLesson,
// seteado en scr-core al abrir una lección type==='quiz'); si no, cae a la primera
// lección quiz con quiz!=null en DB.coursesContent. Devuelve null si no hay ninguno.
function currentQuiz() {
  const byLesson = DB.quizByLesson || {};
  const lid = (window as any).__quizLesson;
  if (lid && byLesson[lid]) return byLesson[lid];
  // Quiz de la lección activa (si __lesson apunta a una lección quiz).
  const active = currentLesson();
  if (active && active.type === "quiz" && active.quiz) return active.quiz;
  // Fallback: primera lección quiz con quiz embebido en cualquier curso inscrito.
  for (const c of (DB.coursesContent || [])) {
    for (const m of (c.modules || [])) {
      for (const it of (m.items || [])) if (it.type === "quiz" && it.quiz) return it.quiz;
    }
  }
  // Segundo fallback: cualquier entrada de quizByLesson.
  for (const k of Object.keys(byLesson)) if (byLesson[k]) return byLesson[k];
  return null;
}

// Mejor intento previo del examen de la lección activa. Los exámenes en
// DB.myGrades.rows (kind 'Examen') se guardan con activity = título de la lección
// (igual que QuizAttempt.lessonTitle). Resolvemos el título de la lección activa
// (window.__quizLesson → coursesContent) y buscamos su mejor score numérico.
function priorQuizAttempt() {
  const lid = (window as any).__quizLesson;
  const { lesson } = lid ? findLesson(lid) : { lesson: currentLesson() };
  if (!lesson || !lesson.t) return null;
  const title = lesson.t; // ya viene esc() desde queries.ts
  const rows = (DB.myGrades && DB.myGrades.rows) || [];
  let best: number | null = null;
  for (const r of rows) {
    if (r.kind !== "Examen") continue;
    if (r.activity !== title) continue;
    if (typeof r.score === "number") best = best == null ? r.score : Math.max(best, r.score);
  }
  return best == null ? null : { best };
}

  /* ---------------- ENTREGA DE TAREA · GRABADOR ---------------- */
  // Entrega real: subida de archivo (window.otrUpload), grabación de audio
  // (getUserMedia + MediaRecorder) y texto. Envía a /api/submissions vía window.api.
  S.assignment = {
    render() {
      const { lesson: L, course } = findLesson((window as any).__lesson);
      // Título de la actividad (= título de la lección). L.t YA viene esc() desde
      // queries.ts, igual que la clave de DB.mySubmissions y course.code/name.
      const activity = L && L.t ? L.t : "Entrega";
      // courseCode del curso activo (no el primero fijo). Cae al curso del primer
      // inscrito solo si no se pudo resolver la lección. Ya viene esc().
      const courseCode =
        (course && course.code) ||
        (DB.courses && DB.courses[0] && DB.courses[0].code) || "";
      const due = L && L.due ? esc(L.due) : "";
      // Fecha límite real (dueAt) con fallback al label legacy (due); y puntos de la actividad.
      const dueAtIso = L && L.dueAt ? L.dueAt : null;
      const dueLabel = dueAtIso
        ? (() => { try { const d = new Date(dueAtIso); return isNaN(d.getTime()) ? due : d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }); } catch { return due; } })()
        : due;
      const maxPoints = (L && L.maxPoints != null) ? L.maxPoints : 100;

      // ¿El alumno ya entregó esta actividad? mySubmissions está indexado por el
      // nombre de la actividad (DB lo guardó con esc(), igual que L.t).
      const subs = DB.mySubmissions || {};
      const prev = subs[activity] || null;

      // Tarjeta "Tu entrega" (solo si ya hay una entrega previa): muestra el archivo o
      // texto, el estado (En revisión / Calificada) y, si GRADED, la nota + feedback.
      let prevCard = "";
      if (prev) {
        const graded = prev.status === "GRADED" && prev.grade != null;
        const stateBadge = graded
          ? `<span class="badge ok" style="height:24px">${IC.checkCircle} Calificada</span>`
          : `<span class="badge warn" style="height:24px">${IC.clock} En revisión</span>`;
        // Contenido entregado: audio embebido, link a archivo, o texto.
        // prev.fileName/textBody/feedback/when/letter YA vienen esc() desde queries.ts
        // (NO re-escapar). fileUrl es safeUrl (sin esc) → se escapa para el atributo.
        let body = "";
        if (prev.fileUrl && prev.kind === "audio") {
          body = `<audio controls src="${esc(prev.fileUrl)}" style="width:100%;margin-top:6px"></audio>`;
        } else if (prev.fileUrl) {
          body = `<div class="row vcenter" style="gap:8px;margin-top:6px"><span style="display:flex;color:var(--text-3)">${IC.file}</span><a href="${esc(prev.fileUrl)}" target="_blank" rel="noopener" class="sky">${prev.fileName || "Ver archivo"}</a></div>`;
        } else if (prev.textBody) {
          body = `<div class="prose" style="font-size:13.5px;margin-top:6px;white-space:pre-wrap">${prev.textBody}</div>`;
        }
        const gradeBlock = graded
          ? `<div class="comp-row" style="border-bottom:0;padding-top:12px"><span class="cr-name" style="width:auto;flex:1">Nota del coach</span>${C.badge(esc(String(prev.grade)) + "%", "ok")}${prev.letter && prev.letter !== "—" ? ` ${C.badge(prev.letter, prev.letter[0] === "A" ? "ok" : "sky")}` : ""}</div>`
          : "";
        const feedbackBlock = (graded && prev.feedback)
          ? `<div class="alert info" style="margin-top:12px"><span class="ai">${IC.target}</span><div><div class="at">Comentario del coach</div>${prev.feedback}</div></div>`
          : "";
        prevCard = `
      <div class="card fade-up" style="--d:1;margin-bottom:16px">
        <div class="card-head"><h3>Tu entrega</h3>${stateBadge}</div>
        <div class="card-body" style="padding:6px 16px 16px">
          ${prev.when ? `<div class="faint" style="font-size:12px;margin-bottom:4px">Entregada ${prev.when}</div>` : ""}
          ${body || '<div class="muted" style="font-size:13px">Entrega registrada.</div>'}
          ${gradeBlock}
          ${feedbackBlock}
        </div>
      </div>`;
      }

      const bars = Array.from({length:48}, (_,i)=>`<i style="height:${10+Math.abs(Math.sin(i*0.6))*30}%"></i>`).join('');
      return `
      <div class="row between vcenter fade-up" style="--d:0;margin-bottom:18px;flex-wrap:wrap;gap:12px">
        <div>
          <div class="eyebrow">Entrega de tarea</div>
          <div class="page-title" style="font-size:22px;margin-top:2px" id="asg-title" data-course="${courseCode}" data-activity="${activity}">${activity}</div>
          ${course && course.name ? `<div class="page-sub" style="margin-top:2px">${course.name}</div>` : ''}
        </div>
        ${dueLabel ? `<span class="badge warn" style="height:28px;align-self:flex-start">${IC.clock} Entrega: ${dueLabel}</span>` : ''}
      </div>

      ${prevCard}

      ${prev ? `<div class="page-sub fade-up" style="--d:1;margin-bottom:12px">${prev.status === "GRADED" ? "Puedes re-entregar y subir tu nota." : "Puedes re-entregar mientras esté en revisión."}</div>` : ""}

      <div class="split fade-up" style="--d:1">
        <div class="stack" style="gap:16px">
          <div class="recorder" id="asg-recorder" data-supported="0">
            <div class="rec-inner">
              <span class="badge" style="background:rgba(255,255,255,.12);color:#fff">${IC.mic} Grabador de voz</span>
              <div class="rec-wave" id="rec-wave">${bars}</div>
              <div class="rec-timer" id="rec-timer">00:00</div>
              <div class="muted" id="rec-status" style="color:rgba(234,242,251,.6);font-size:12.5px;margin-top:6px">Listo para grabar — máx. 2:30</div>
              <div class="rec-controls">
                <button class="rec-mini" id="rec-reset" title="Descartar">${IC.refresh}</button>
                <button class="rec-btn" id="rec-toggle" title="Grabar">${IC.mic}</button>
                <button class="rec-mini" id="rec-play" title="Reproducir" disabled>${IC.play}</button>
              </div>
              <audio id="rec-audio" style="display:none"></audio>
            </div>
          </div>

          <div class="card card-pad">
            <div class="row between vcenter" style="margin-bottom:12px"><b>O sube un archivo</b><span class="badge">${IC.file} Audio / video / PDF</span></div>
            <div class="dropzone" id="asg-drop">
              <div class="ill">${IC.file}</div>
              <b style="color:var(--text)">Selecciona tu archivo</b>
              <p style="margin:4px 0 12px;font-size:13px">Audio, video, PDF o documento (máx. 50 MB)</p>
              <button class="btn btn-ghost btn-sm" id="asg-pick" type="button">Seleccionar archivo</button>
              <input type="file" id="asg-file" data-up="submission" accept="audio/*,video/*,application/pdf,image/*,text/plain,.doc,.docx" style="display:none"/>
            </div>
            <div id="asg-filepreview" style="display:none;margin-top:12px"></div>
          </div>

          <div class="card card-pad">
            <div class="row between vcenter" style="margin-bottom:10px"><b>O escribe tu respuesta</b><span class="badge">${IC.doc} Texto</span></div>
            <textarea id="asg-text" class="input" rows="5" placeholder="Escribe aquí tu entrega de texto (opcional)…" style="resize:vertical;min-height:96px;font-family:inherit;line-height:1.5;width:100%"></textarea>
          </div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card">
            <div class="card-head"><h3>Calificación</h3><span class="badge">/ ${maxPoints} pts</span></div>
            <div class="card-body" style="padding:6px 16px 14px">
              ${maxPoints === 100
                ? [['Estructura (CWI)','30'],['Claridad y voz','25'],['Evidencia','25'],['Tiempo y cierre','20']].map(r=>`
                <div class="rubric-row"><span>${r[0]}</span><span class="badge sky" style="margin-left:auto">${r[1]} pts</span></div>`).join('')
                : `<div class="muted" style="font-size:13px;padding:6px 0">Esta entrega vale <b>${maxPoints} puntos</b>. Tu coach la revisará y te dará una nota con feedback.</div>`}
            </div>
          </div>
          <button class="btn btn-primary btn-lg btn-block" id="asg-submit">${prev ? "Re-entregar" : "Entregar"}</button>
          <p class="faint" style="text-align:center;font-size:12px">${prev ? "Una re-entrega reemplaza la anterior." : "Podrás re-entregar después de enviar."}</p>
        </div>
      </div>`;
    },
    mount(root) {
      const titleEl = root.querySelector('#asg-title');
      const activity = titleEl ? (titleEl.textContent || '').trim() : 'Entrega';
      const courseCode = titleEl ? (titleEl.getAttribute('data-course') || '') : '';

      // Estado de la entrega: lo que se mandará al servidor.
      const up: { fileUrl: string|null; fileName: string|null; kind: string|null } = { fileUrl: null, fileName: null, kind: null };

      const submitBtn = root.querySelector('#asg-submit');
      const textEl = root.querySelector('#asg-text');

      // ---- Subida de archivo real (window.otrUpload) -----------------------
      const fileInput = root.querySelector('#asg-file');
      const pickBtn = root.querySelector('#asg-pick');
      const filePrev = root.querySelector('#asg-filepreview');
      if (pickBtn && fileInput) pickBtn.addEventListener('click', () => fileInput.click());
      if (fileInput) fileInput.addEventListener('change', async () => {
        const f = fileInput.files && fileInput.files[0];
        if (!f) return;
        if (f.size > 50 * 1024 * 1024) { (window as any).toast && window.toast('El archivo supera 50 MB', 'danger'); fileInput.value = ''; return; }
        filePrev.style.display = 'block';
        filePrev.innerHTML = `<div class="row vcenter" style="gap:8px;font-size:13px;color:var(--text-2)"><span class="spinner" style="width:14px;height:14px"></span> Subiendo ${esc(f.name)}…</div>`;
        try {
          const res = await (window as any).otrUpload(f, 'submission');
          up.fileUrl = res.url; up.fileName = res.original || f.name;
          up.kind = (res.mime || f.type || '').startsWith('audio/') ? 'audio' : (res.mime || f.type || '').startsWith('video/') ? 'video' : 'file';
          filePrev.innerHTML = `<div class="alert ok" style="margin:0"><span class="ai">${IC.checkCircle}</span><div><div class="at">Archivo listo</div><a href="${esc(up.fileUrl)}" target="_blank" rel="noopener" class="sky">${esc(up.fileName)}</a></div></div>`;
        } catch (err: any) {
          filePrev.innerHTML = `<div class="alert danger" style="margin:0"><span class="ai">${IC.flag}</span><div><div class="at">No se pudo subir</div>${esc(err && err.message ? err.message : 'Intenta de nuevo')}</div></div>`;
          fileInput.value = '';
        }
      });

      // ---- Grabación de audio real (getUserMedia + MediaRecorder) ----------
      const recorderBox = root.querySelector('#asg-recorder');
      const wave = root.querySelector('#rec-wave');
      const bars = wave ? [...wave.querySelectorAll('i')] : [];
      const timerEl = root.querySelector('#rec-timer');
      const statusEl = root.querySelector('#rec-status');
      const toggle = root.querySelector('#rec-toggle');
      const resetBtn = root.querySelector('#rec-reset');
      const playBtn = root.querySelector('#rec-play');
      const audioEl = root.querySelector('#rec-audio');
      const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

      const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window as any).MediaRecorder);
      if (!canRecord) {
        // Sin soporte de grabación: ocultar el grabador, dejar archivo + texto.
        if (recorderBox) recorderBox.style.display = 'none';
      } else {
        recorderBox.setAttribute('data-supported', '1');
        let rec: any = null, stream: any = null, chunks: any[] = [], blobUrl: string | null = null;
        let recording = false, secs = 0, tick: any = null, anim: any = null;

        function stopMeters() { clearInterval(tick); clearInterval(anim); tick = null; anim = null; }
        function releaseStream() { if (stream) { try { stream.getTracks().forEach((t: any) => t.stop()); } catch {} stream = null; } }
        // Teardown global: Aula.renderApp() lo invoca al navegar, para que no queden
        // vivos los setInterval (~110ms x2) ni el micrófono al cambiar de pantalla.
        (window as any).__recTeardown = () => {
          try { stopMeters(); releaseStream(); if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; } } catch {}
        };

        async function start() {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (err: any) {
            statusEl.textContent = 'No se pudo acceder al micrófono';
            (window as any).toast && window.toast('Permiso de micrófono denegado', 'danger');
            return;
          }
          chunks = [];
          if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
          up.fileUrl = null; up.fileName = null;
          try {
            rec = new (window as any).MediaRecorder(stream);
          } catch {
            statusEl.textContent = 'Grabación no soportada en este navegador';
            releaseStream(); return;
          }
          rec.ondataavailable = (e: any) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
          rec.onstop = async () => {
            stopMeters();
            releaseStream();
            const type = (chunks[0] && chunks[0].type) || 'audio/webm';
            const blob = new Blob(chunks, { type });
            blobUrl = URL.createObjectURL(blob);
            if (audioEl) { audioEl.src = blobUrl; }
            if (playBtn) playBtn.disabled = false;
            statusEl.textContent = secs > 0 ? `Grabado ${fmt(secs)} — subiendo…` : 'Grabación vacía';
            // Convertir Blob → File y subir.
            const ext = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'mp4' : type.includes('wav') ? 'wav' : 'webm';
            const file = new File([blob], `grabacion-${Date.now()}.${ext}`, { type });
            if (secs <= 0) { statusEl.textContent = 'Listo para grabar — máx. 2:30'; return; }
            try {
              const res = await (window as any).otrUpload(file, 'submission');
              up.fileUrl = res.url; up.fileName = res.original || file.name; up.kind = 'audio';
              statusEl.textContent = `Grabado ${fmt(secs)} — guardado`;
            } catch (err: any) {
              statusEl.textContent = 'Grabado pero falló la subida';
              (window as any).toast && window.toast('No se pudo subir la grabación', 'danger');
            }
          };
          rec.start();
          recording = true;
          toggle.classList.add('recording'); toggle.innerHTML = IC.pause; statusEl.textContent = 'Grabando…';
          if (playBtn) playBtn.disabled = true;
          secs = 0; timerEl.textContent = '00:00';
          tick = setInterval(() => { secs++; timerEl.textContent = fmt(secs); if (secs >= 150) stop(); }, 1000);
          anim = setInterval(() => { bars.forEach((b: any) => b.style.height = (12 + Math.random()*78) + '%'); }, 110);
        }
        function stop() {
          if (!recording) return;
          recording = false;
          toggle.classList.remove('recording'); toggle.innerHTML = IC.mic;
          try { if (rec && rec.state !== 'inactive') rec.stop(); } catch {}
        }
        toggle.addEventListener('click', () => recording ? stop() : start());
        if (resetBtn) resetBtn.addEventListener('click', () => {
          if (recording) stop();
          stopMeters(); releaseStream();
          secs = 0; if (timerEl) timerEl.textContent = '00:00';
          bars.forEach((b: any, i: number) => b.style.height = (10 + Math.abs(Math.sin(i*0.6))*30) + '%');
          if (statusEl) statusEl.textContent = 'Listo para grabar — máx. 2:30';
          if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null; }
          if (audioEl) audioEl.removeAttribute('src');
          if (playBtn) playBtn.disabled = true;
          if (up.kind === 'audio') { up.fileUrl = null; up.fileName = null; up.kind = null; }
        });
        if (playBtn && audioEl) playBtn.addEventListener('click', () => { if (audioEl.src) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); } });
      }

      // ---- Entregar (POST real /api/submissions vía window.api) ------------
      submitBtn.addEventListener('click', async () => {
        const textBody = textEl && textEl.value ? textEl.value.trim() : '';
        if (!up.fileUrl && !textBody) {
          (window as any).toast && window.toast('Sube un archivo, graba audio o escribe tu entrega', 'warn');
          return;
        }
        const kind = up.fileUrl ? (up.kind || 'file') : 'text';
        const orig = submitBtn.textContent;
        submitBtn.textContent = 'Entregando…'; submitBtn.classList.add('disabled');
        try {
          await (window as any).api('/api/submissions', {
            activity,
            kind,
            fileUrl: up.fileUrl || undefined,
            fileName: up.fileName || undefined,
            textBody: textBody || undefined,
            courseCode: courseCode || undefined,
          });
          (window as any).toast && window.toast('Entregado', 'ok');
          submitBtn.outerHTML = `<div class="alert ok"><span class="ai">${IC.checkCircle}</span><div><div class="at">Entregado y en manos de tu coach</div>Recibirás feedback para afinar tu próxima entrega.</div></div>`;
          (window as any).refresh && window.refresh();
        } catch (err: any) {
          submitBtn.textContent = orig; submitBtn.classList.remove('disabled');
          (window as any).toast && window.toast(err && err.message ? err.message : 'Error al entregar', 'danger');
        }
      });
    }
  };

  /* ---------------- EXAMEN (quiz real desde la BD) ---------------- */
  S.quiz = {
    render() {
      const quiz = currentQuiz();
      if (!quiz || !(quiz.questions && quiz.questions.length)) {
        return `
        <div class="page-head"><div>
          <div class="page-title">Examen</div>
          <div class="page-sub">Pon a prueba lo aprendido en esta unidad</div>
        </div></div>
        <div class="card"><div class="empty">
          <div class="ill">${IC.doc}</div>
          <h4>No hay examen disponible</h4>
          <p>Tu coach aún no publicó el examen de esta lección. Vuelve pronto — y llega preparado.</p>
          <button class="btn btn-primary btn-sm" onclick="go('course')">Volver al curso ${IC.arrowR}</button>
        </div></div>`;
      }
      const total = quiz.questions.length;
      const passScore = quiz.passScore != null ? quiz.passScore : 70;
      const attempt = priorQuizAttempt();
      // Si ya hay un intento previo: badge "Ya completado · mejor: X%" + tarjeta resumen
      // con CTA "Reintentar examen". El examen empieza oculto y se revela al reintentar.
      const doneBanner = attempt ? `
      <div class="card fade-up" style="--d:1;margin-bottom:16px" id="qz-done">
        <div class="card-body" style="padding:18px 16px;text-align:center">
          <div class="ill" style="color:var(--ok)">${IC.checkCircle}</div>
          <h4 style="margin:6px 0 2px">Ya completaste este examen</h4>
          <p class="muted" style="font-size:13.5px">${attempt.best >= passScore ? "Aprobado" : "A reforzar"} · puedes reintentarlo y subir tu marca.</p>
          <div class="row vcenter" style="gap:8px;justify-content:center;margin-top:12px">
            <span class="badge ${attempt.best >= passScore ? "ok" : "warn"}" style="height:26px">${IC.star} Mejor: ${esc(String(attempt.best))}%</span>
            <button class="btn btn-primary btn-sm" id="qz-retry">${IC.refresh} Reintentar examen</button>
          </div>
        </div>
      </div>` : "";
      return `
      <div class="quiz-head fade-up" style="--d:0">
        <div>
          <div class="eyebrow">Examen de unidad</div>
          <div class="page-title" style="font-size:20px;margin-top:2px">${esc(quiz.title || 'Examen')}</div>
          <div class="page-sub" style="margin-top:2px">${total} pregunta${total!==1?'s':''} · aprobado con ${esc(String(passScore))}%${attempt ? ` · ya completado · mejor: ${esc(String(attempt.best))}%` : ""}</div>
        </div>
        <span class="quiz-timer">${IC.doc} <span>${total} ítem${total!==1?'s':''}</span></span>
      </div>
      ${doneBanner}
      <div id="qz-body" style="${attempt ? "display:none" : ""}">
        <div class="q-card fade-up" style="--d:1" id="qz-card"></div>
        <div class="row between vcenter" style="max-width:760px;margin:16px auto 0">
          <button class="btn btn-ghost" id="qz-prev">${IC.chevL} Anterior</button>
          <div class="q-dots" id="qz-dots"></div>
          <button class="btn btn-primary" id="qz-next">Siguiente ${IC.arrowR}</button>
        </div>
      </div>`;
    },
    mount(root) {
      const quiz = currentQuiz();
      if (!quiz || !(quiz.questions && quiz.questions.length)) return; // empty state, sin controles
      const questions = quiz.questions;
      let i = 0;
      // Respuestas por pregunta: { [questionId]: optionId }
      const answers: Record<string, string|null> = {};
      questions.forEach((q: any) => { answers[q.id] = null; });

      // "Reintentar examen": revela el examen oculto tras el banner de ya-completado.
      const retry = root.querySelector('#qz-retry');
      const body = root.querySelector('#qz-body');
      const done = root.querySelector('#qz-done');
      if (retry && body) retry.addEventListener('click', () => {
        body.style.display = '';
        if (done) done.style.display = 'none';
      });

      const card = root.querySelector('#qz-card');
      const dots = root.querySelector('#qz-dots');
      const prev = root.querySelector('#qz-prev');
      const next = root.querySelector('#qz-next');
      if (!card || !dots || !prev || !next) return;

      function paint() {
        const Q = questions[i];
        const opts = Q.options || [];
        card.innerHTML = `<div class="q-num">Pregunta ${i+1} de ${questions.length}</div>
          <div class="q-text">${esc(Q.prompt)}</div>
          ${opts.map((o: any, oi: number) => `<div class="q-opt ${answers[Q.id]===o.id?'sel':''}" data-o="${esc(o.id)}"><span class="q-key">${'ABCDEFGH'[oi]||'•'}</span><span>${esc(o.text)}</span></div>`).join('')}`;
        card.querySelectorAll('.q-opt').forEach((el: any) => el.addEventListener('click', () => { answers[Q.id] = el.dataset.o; paint(); }));
        dots.innerHTML = questions.map((q: any, d: number) => `<span class="q-dot ${d===i?'cur':''} ${answers[q.id]!=null?'done':''}" data-d="${d}">${d+1}</span>`).join('');
        dots.querySelectorAll('.q-dot').forEach((el: any) => el.addEventListener('click', () => { i = +el.dataset.d; paint(); }));
        prev.style.visibility = i===0 ? 'hidden' : 'visible';
        const last = i === questions.length - 1;
        next.innerHTML = last ? 'Finalizar examen ' + IC.check : 'Siguiente ' + IC.arrowR;
        next.className = last ? 'btn btn-navy' : 'btn btn-primary';
      }

      prev.addEventListener('click', () => { if (i > 0) { i--; paint(); } });
      next.addEventListener('click', async () => {
        if (i < questions.length - 1) { i++; paint(); return; }
        // Validar que todo esté contestado.
        const unanswered = questions.filter((q: any) => answers[q.id] == null).length;
        if (unanswered > 0) {
          (window as any).toast && window.toast(`Te falta${unanswered!==1?'n':''} ${unanswered} pregunta${unanswered!==1?'s':''} por responder`, 'warn');
          const idx = questions.findIndex((q: any) => answers[q.id] == null);
          if (idx >= 0) { i = idx; paint(); }
          return;
        }
        // Enviar intento real: { answers: { [questionId]: optionId } }.
        const payload: Record<string, string> = {};
        questions.forEach((q: any) => { payload[q.id] = answers[q.id] as string; });
        next.classList.add('disabled'); next.innerHTML = 'Calificando…';
        try {
          const res = await (window as any).api(`/api/quizzes/${quiz.id}/attempt`, { answers: payload });
          // Guardar resultado + datos del quiz para la pantalla de resultados.
          (window as any).__quizResult = res;
          (window as any).__quizData = { id: quiz.id, title: quiz.title, passScore: quiz.passScore, questions, answers: payload };
          (window as any).go('quiz-results');
          (window as any).refresh && window.refresh();
        } catch (err: any) {
          next.classList.remove('disabled'); next.innerHTML = 'Finalizar examen ' + IC.check;
          (window as any).toast && window.toast(err && err.message ? err.message : 'Error al enviar el examen', 'danger');
        }
      });

      paint();
    }
  };

  /* ---------------- RESULTADOS (reales del servidor) ---------------- */
  S.quizResults = {
    render() {
      const res = (window as any).__quizResult;
      const data = (window as any).__quizData;
      if (!res || !data || !(data.questions && data.questions.length)) {
        return `
        <div class="page-head"><div>
          <div class="page-title">Resultados del examen</div>
        </div></div>
        <div class="card"><div class="empty">
          <div class="ill">${IC.chart}</div>
          <h4>No hay un examen reciente</h4>
          <p>Completa un examen y aquí verás tu puntuación, pregunta por pregunta.</p>
          <button class="btn btn-primary btn-sm" onclick="go('course')">Volver al curso ${IC.arrowR}</button>
        </div></div>`;
      }

      const score = res.score ?? 0;
      const total = res.total ?? (data.questions.length);
      const pct = res.percent != null ? res.percent : (total ? Math.round(score/total*100) : 0);
      const passed = !!res.passed;
      const tone = passed ? (pct >= 90 ? 'ok' : 'ok') : pct >= 50 ? 'warn' : 'danger';
      const results = res.results || {};

      const review = data.questions.map((Q: any) => {
        const r = results[Q.id] || {};
        const ok = !!r.correct;
        const opts = Q.options || [];
        const chosenOpt = opts.find((o: any) => o.id === r.chosen);
        const correctOpt = opts.find((o: any) => o.id === r.correctOptionId);
        return `
          <div class="lrow" style="align-items:flex-start">
            <span style="width:22px;height:22px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px;line-height:1;background:var(--${ok?'ok':'danger'})">${ok?IC.check:'×'}</span>
            <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${esc(Q.prompt)}</div>
              <div style="font-size:12.5px;color:var(--text-2);margin-top:3px">${correctOpt?`Correcta: <b class="sky">${esc(correctOpt.text)}</b>`:''}${!ok?` · Tu respuesta: <span style="color:var(--danger)">${chosenOpt?esc(chosenOpt.text):'—'}</span>`:''}</div>
            </div>
          </div>`;
      }).join('');

      return `
      <div class="score-hero fade-up" style="--d:0;margin-bottom:18px">
        ${C.ring(pct,108,{color:`var(--${tone})`,label:`<b class="brand-font" style="font-size:30px">${pct}%</b><span style="font-size:11px;color:var(--text-3)">${score}/${total}</span>`})}
        <div style="flex:1;min-width:200px">
          <div class="badge ${tone}" style="height:24px;margin-bottom:8px">${passed?(pct>=90?'¡Aprobado con honores!':'Aprobado'):'A reforzar'}</div>
          <h2 style="font-size:22px;font-weight:800;letter-spacing:var(--track-tight)">${esc(data.title || 'Examen')}</h2>
          <p class="muted" style="margin-top:4px">Acertaste <b class="sky">${score} de ${total}</b>. Revisa las respuestas abajo para afinar tu técnica.</p>
          <div class="row" style="gap:10px;margin-top:14px">
            <button class="btn btn-primary" onclick="go('course')">Continuar curso ${IC.arrowR}</button>
            <button class="btn btn-ghost" onclick="go('quiz')">Reintentar</button>
          </div>
        </div>
      </div>
      <div class="grid g-3 fade-up" style="--d:1;margin-bottom:18px">
        <div class="tile">${C.kpi('Correctas',score,{ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi('Total',total,{ic:'grid'})}</div>
        <div class="tile">${C.kpi('Resultado',passed?'Aprobado':'A reforzar',{ic:'chart'})}</div>
      </div>
      <div class="card fade-up" style="--d:2">
        <div class="card-head"><h3>Revisión</h3></div>
        <div class="card-body" style="padding:8px 16px">
          ${review}
        </div>
      </div>`;
    }
  };

  /* ---------------- REPRODUCTOR (honesto: video real + marcar hecha) ---------------- */
  S.player = {
    render() {
      const { lesson: L, course } = findLesson((window as any).__lesson);
      const embed = L ? videoEmbedHtml(L.videoKind, L.videoSrc) : "";
      const hasVideo = !!(L && L.videoSrc);
      // L.t / course.name / course.coach / nextItem.t YA vienen esc() desde queries.ts.
      const title = L ? L.t : "Lección";
      const courseLabel = course ? `${course.name}${course.coach ? ` · ${course.coach}` : ""}` : "";
      const doneByMe = !!(L && L.doneByMe);
      // Etapa de video: si hay fuente real, el embed; si no, un placeholder honesto
      // (sin barra de scrub/tiempos falsos).
      const stageInner = hasVideo ? embed : `
            <div class="pstripes"></div>
            <div class="player-bigplay" style="cursor:default;opacity:.6">${IC.play}</div>`;
      // Siguiente lección NO completada dentro del MISMO curso (para el CTA "Siguiente").
      let nextItem: any = null;
      if (course) {
        const flat: any[] = [];
        (course.modules || []).forEach((m: any) => (m.items || []).forEach((it: any) => flat.push(it)));
        const idx = flat.findIndex((it) => it.id === (L && L.id));
        if (idx >= 0) for (let k = idx + 1; k < flat.length; k++) { if (!flat[k].locked) { nextItem = flat[k]; break; } }
      }
      const destFor = (it: any) => it.type === "quiz" ? "quiz" : (it.type === "mic" || it.type === "assign") ? "assignment" : it.type === "video" ? "player" : "lesson";
      const nextOnclick = nextItem
        ? `${nextItem.type === "quiz" ? `window.__quizLesson='${nextItem.id}';` : ""}window.__lesson='${nextItem.id}';go('${destFor(nextItem)}')`
        : "go('course')";
      const nextLabel = nextItem ? `Siguiente: ${nextItem.t} ${IC.arrowR}` : `Volver al curso ${IC.arrowR}`;
      // Marcar como completada (delegado en Aula.tsx). data-done = estado a fijar.
      const markBtn = L ? `<button class="btn ${doneByMe ? "btn-soft" : "btn-primary"} btn-sm" data-action="mark-lesson-done" data-lesson="${esc(L.id)}" data-done="${doneByMe ? "false" : "true"}">${doneByMe ? `${IC.checkCircle} Completada` : `${IC.check} Marcar como completada`}</button>` : "";

      // Transcripción/contenido SOLO si la lección trae contentHtml real (sin inventar).
      const transcript = L && L.contentHtml ? `
        <div class="card card-pad" style="margin-top:16px">
          <div class="prose" style="font-size:14px">${L.contentHtml}</div>
        </div>` : "";

      return `
      <div class="fade-up" style="--d:0;max-width:900px;margin:0 auto">
        <div class="player-stage">${stageInner}</div>
        <div class="row between vcenter" style="margin:16px 0 10px;flex-wrap:wrap;gap:10px">
          <div>
            <h2 style="font-size:19px;font-weight:800;letter-spacing:var(--track-tight)">${title}</h2>
            ${courseLabel ? `<div class="muted" style="font-size:13px;margin-top:2px">${courseLabel}</div>` : ""}
          </div>
          <div class="row" style="gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="go('course')">${IC.chevL} Volver</button>
            ${markBtn}
          </div>
        </div>
        ${!hasVideo ? `<div class="alert info" style="margin:10px 0"><span class="ai">${IC.flag}</span><div><div class="at">Video en preparación</div>Tu coach está preparando el video de esta lección.</div></div>` : ""}
        ${transcript}
        <div class="row" style="justify-content:flex-end;margin-top:18px">
          <button class="btn btn-primary" onclick="${nextOnclick}">${nextLabel}</button>
        </div>
      </div>`;
    }
  };

  /* ---------------- MIS CALIFICACIONES (alumno) ---------------- */
  S.grades = {
    render() {
      const g = DB.myGrades || { rows:[], avg:0, submitted:0, total:0, best:0 };
      const rows = g.rows || [];

      const mainCourseName = (DB.courses && DB.courses[0] && DB.courses[0].name) || null;
      const head = `
      <div class="page-head fade-up" style="--d:0"><div><div class="page-title">Mis calificaciones</div><div class="page-sub">${mainCourseName ? esc(mainCourseName) + ' · ' : ''}promedio ponderado</div></div>${mainCourseName ? `<div class="seg"><button class="on">${esc(mainCourseName)}</button><button>Todos los cursos</button></div>` : ''}</div>`;

      if (!g.total) {
        return `${head}
        <div class="card"><div class="empty">
          <div class="ill">${IC.chart}</div>
          <h4>Tu marcador está en blanco</h4>
          <p>Entrega una tarea o completa un examen — tus notas y tu promedio se construyen aquí.</p>
        </div></div>`;
      }

      return `${head}
      <div class="grid g-3 fade-up" style="--d:1;margin-bottom:18px">
        <div class="tile">${C.kpi('Promedio', g.avg, {unit:'%', ic:'chart'})}</div>
        <div class="tile">${C.kpi('Entregadas', `${g.submitted} / ${g.total}`, {ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi('Mejor nota', g.best, {unit:'%', ic:'star'})}</div>
      </div>
      <div class="table-wrap scroll-m fade-up" style="--d:2">
        <table class="tbl"><thead><tr><th>Actividad</th><th class="num">Nota</th><th class="center">Letra</th></tr></thead>
        <tbody>${rows.map(r=>{
          const numeric = typeof r.score === 'number' || /^\d+$/.test(String(r.score));
          const scoreCls = r.letter === '—' ? (r.score === 'En revisión' ? 'muted' : 'faint') : '';
          // r.activity y r.feedback YA vienen esc() desde queries.ts — NO re-escapar.
          const hasFeedback = r.kind === 'Entrega' && r.feedback && String(r.feedback).trim();
          const mainRow = `<tr>
            <td><b style="font-weight:600">${r.activity}</b>${r.kind?` <span class="tag-soft">${esc(r.kind)}</span>`:''}</td>
            <td class="num"><b class="${scoreCls}">${esc(String(r.score))}${numeric?'%':''}</b></td>
            <td class="center">${r.letter==='—'?'<span class="faint">—</span>':C.badge(esc(r.letter), r.letter[0]==='A'?'ok':'sky')}</td>
          </tr>`;
          // Fila expandible con el comentario escrito del coach (el alumno DEBE poder leerlo).
          const fbRow = hasFeedback ? `<tr class="fb-row"><td colspan="3" style="padding-top:0">
            <div class="alert info" style="margin:0 0 4px"><span class="ai">${IC.target}</span><div><div class="at">Comentario del coach</div>${r.feedback}</div></div>
          </td></tr>` : '';
          return mainRow + fbRow;
        }).join('')}</tbody></table>
      </div>`;
    }
  };
