// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { videoEmbedHtml } from "./video";
export const S = {};

// Lección activa (seleccionada al navegar; patrón window.__lesson, como window.__q en búsqueda).
function currentLesson() {
  const id = (window as any).__lesson;
  for (const m of (DB.courseModules || [])) for (const it of (m.items || [])) if (it.id === id) return it;
  return null;
}

  /* ---------------- ENTREGA DE TAREA · GRABADOR ---------------- */
  S.assignment = {
    render() {
      const bars = Array.from({length:48}, (_,i)=>`<i style="height:${10+Math.abs(Math.sin(i*0.6))*30}%"></i>`).join('');
      return `
      <div class="row between vcenter" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div><div class="page-title" style="font-size:22px">Grabación: discurso de 2 minutos</div>
        <div class="page-sub">Defiende una contención usando Claim · Warrant · Impact</div></div>
        <span class="badge warn" style="height:26px">${IC.clock} Vence viernes 23:59</span>
      </div>

      <div class="split">
        <div class="stack" style="gap:16px">
          <div class="recorder">
            <div class="rec-inner">
              <span class="badge" style="background:rgba(255,255,255,.12);color:#fff">${IC.mic} Grabador de voz · PoodLL</span>
              <div class="rec-wave" id="rec-wave">${bars}</div>
              <div class="rec-timer" id="rec-timer">00:00</div>
              <div class="muted" id="rec-status" style="color:rgba(234,242,251,.6);font-size:12.5px;margin-top:6px">Listo para grabar — máx. 2:30</div>
              <div class="rec-controls">
                <button class="rec-mini" id="rec-reset" title="Reiniciar">${IC.refresh}</button>
                <button class="rec-btn" id="rec-toggle" title="Grabar">${IC.mic}</button>
                <button class="rec-mini" id="rec-play" title="Reproducir">${IC.play}</button>
              </div>
            </div>
          </div>

          <div class="card card-pad">
            <div class="row between vcenter" style="margin-bottom:12px"><b>O sube un video</b><span class="badge">${IC.video} MP4 / MOV</span></div>
            <div class="dropzone">
              <div class="ill">${IC.video}</div>
              <b style="color:var(--text)">Arrastra tu video aquí</b>
              <p style="margin:4px 0 12px;font-size:13px">o selecciona un archivo (máx. 200 MB)</p>
              <button class="btn btn-ghost btn-sm">Seleccionar archivo</button>
            </div>
          </div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card">
            <div class="card-head"><h3>Rúbrica</h3><span class="muted" style="font-size:12px">/ 100</span></div>
            <div class="card-body" style="padding:6px 16px 14px">
              ${[['Estructura (CWI)','30'],['Claridad y voz','25'],['Evidencia','25'],['Tiempo y cierre','20']].map(r=>`
                <div class="rubric-row"><span>${r[0]}</span><span class="badge sky" style="margin-left:auto">${r[1]} pts</span></div>`).join('')}
            </div>
          </div>
          <div class="alert info"><span class="ai">${IC.target}</span><div><div class="at">Consejo del coach</div>Empieza fuerte: claim en los primeros 10 segundos.</div></div>
          <button class="btn btn-primary btn-lg btn-block" id="rec-submit">Entregar grabación</button>
          <p class="faint" style="text-align:center;font-size:12px">Podrás re-grabar hasta la fecha de entrega.</p>
        </div>
      </div>`;
    },
    mount(root) {
      const wave = root.querySelector('#rec-wave');
      const bars = [...wave.querySelectorAll('i')];
      const timerEl = root.querySelector('#rec-timer');
      const statusEl = root.querySelector('#rec-status');
      const toggle = root.querySelector('#rec-toggle');
      let rec=false, secs=0, tick=null, anim=null;
      const fmt=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
      function start(){
        rec=true; toggle.classList.add('recording'); toggle.innerHTML=IC.pause; statusEl.textContent='Grabando…';
        tick=setInterval(()=>{ secs++; timerEl.textContent=fmt(secs); if(secs>=150)stop(); },1000);
        anim=setInterval(()=>{ bars.forEach(b=>b.style.height=(12+Math.random()*78)+'%'); },110);
      }
      function stop(){
        rec=false; toggle.classList.remove('recording'); toggle.innerHTML=IC.mic; statusEl.textContent=secs>0?`Grabado ${fmt(secs)} — escucha o re-graba`:'Listo para grabar';
        clearInterval(tick); clearInterval(anim);
      }
      toggle.addEventListener('click',()=>rec?stop():start());
      root.querySelector('#rec-reset').addEventListener('click',()=>{ stop(); secs=0; timerEl.textContent='00:00'; bars.forEach((b,i)=>b.style.height=(10+Math.abs(Math.sin(i*0.6))*30)+'%'); statusEl.textContent='Listo para grabar — máx. 2:30'; });
      root.querySelector('#rec-submit').addEventListener('click',(e)=>{
        const b=e.target; b.textContent='Entregando…'; b.classList.add('disabled');
        fetch('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({activity:'Grabación: discurso de 2 min',kind:'audio'})})
          .then(r=>r.json()).then(()=>{ b.outerHTML=`<div class="alert ok"><span class="ai">${IC.checkCircle}</span><div><div class="at">¡Entregado y guardado!</div>Tu coach revisará la grabación. Recibirás feedback pronto.</div></div>`; })
          .catch(()=>{ b.textContent='Entregar grabación'; b.classList.remove('disabled'); window.toast&&window.toast('Error al entregar','danger'); });
      });
    }
  };

  /* ---------------- EXAMEN ---------------- */
  const QUIZ = [
    { q:'¿Qué pieza del argumento conecta el claim con la realidad?', o:['Impact','Warrant','Rebuttal','Signpost'], a:1 },
    { q:'El impacto de un argumento se mide principalmente por…', o:['Volumen de voz','Magnitud, probabilidad y tiempo','Número de cartas de evidencia','Longitud del discurso'], a:1 },
    { q:'¿Cuál es una buena práctica al abrir una contención?', o:['Empezar con el claim claro','Leer toda la evidencia primero','Pedir disculpas','Resumir al rival'], a:0 },
    { q:'En Public Forum, el "crossfire" sirve para…', o:['Descansar','Cuestionar y exponer debilidades','Repetir el caso','Hablar con el juez'], a:1 },
    { q:'Un warrant débil normalmente se nota porque…', o:['Es muy largo','No responde "¿por qué es cierto?"','Tiene datos','Usa analogías'], a:1 },
  ];
  S.quiz = {
    render() {
      return `
      <div class="quiz-head">
        <div><div class="page-title" style="font-size:20px">Examen de unidad · Argumentación</div>
        <div class="page-sub">5 preguntas · 1 intento · se guarda automáticamente</div></div>
        <span class="quiz-timer">${IC.clock} <span id="qz-time">09:42</span></span>
      </div>
      <div class="q-card" id="qz-card"></div>
      <div class="row between vcenter" style="max-width:760px;margin:16px auto 0">
        <button class="btn btn-ghost" id="qz-prev">${IC.chevL} Anterior</button>
        <div class="q-dots" id="qz-dots"></div>
        <button class="btn btn-primary" id="qz-next">Siguiente ${IC.arrowR}</button>
      </div>`;
    },
    mount(root) {
      let i=0; const ans=new Array(QUIZ.length).fill(null);
      const card=root.querySelector('#qz-card'), dots=root.querySelector('#qz-dots');
      const prev=root.querySelector('#qz-prev'), next=root.querySelector('#qz-next');
      function paint(){
        const Q=QUIZ[i];
        card.innerHTML=`<div class="q-num">Pregunta ${i+1} de ${QUIZ.length}</div>
          <div class="q-text">${Q.q}</div>
          ${Q.o.map((o,oi)=>`<div class="q-opt ${ans[i]===oi?'sel':''}" data-o="${oi}"><span class="q-key">${'ABCD'[oi]}</span><span>${o}</span></div>`).join('')}`;
        card.querySelectorAll('.q-opt').forEach(el=>el.addEventListener('click',()=>{ ans[i]=+el.dataset.o; paint(); }));
        dots.innerHTML=QUIZ.map((_,d)=>`<span class="q-dot ${d===i?'cur':''} ${ans[d]!=null?'done':''}" data-d="${d}">${d+1}</span>`).join('');
        dots.querySelectorAll('.q-dot').forEach(el=>el.addEventListener('click',()=>{i=+el.dataset.d;paint();}));
        prev.style.visibility=i===0?'hidden':'visible';
        next.innerHTML = i===QUIZ.length-1 ? 'Finalizar examen '+IC.check : 'Siguiente '+IC.arrowR;
        next.className = i===QUIZ.length-1 ? 'btn btn-navy' : 'btn btn-primary';
      }
      prev.addEventListener('click',()=>{ if(i>0){i--;paint();} });
      next.addEventListener('click',()=>{ if(i<QUIZ.length-1){i++;paint();} else {
        window.__quizAns=ans;
        let correct=0; QUIZ.forEach((Q,k)=>{ if(ans[k]===Q.a)correct++; });
        fetch('/api/quiz-attempts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonTitle:'Examen de unidad · Argumentación',score:correct,total:QUIZ.length})}).catch(()=>{});
        go('quiz-results');
      } });
      paint();
    }
  };

  /* ---------------- RESULTADOS ---------------- */
  S.quizResults = {
    render() {
      const ans=window.__quizAns||[1,1,0,1,1];
      let correct=0; QUIZ.forEach((Q,k)=>{ if(ans[k]===Q.a)correct++; });
      const pct=Math.round(correct/QUIZ.length*100);
      const tone = pct>=80?'ok':pct>=60?'warn':'danger';
      return `
      <div class="score-hero" style="margin-bottom:18px">
        ${C.ring(pct,108,{color:`var(--${tone==='ok'?'ok':tone==='warn'?'warn':'danger'})`,label:`<b class="brand-font" style="font-size:30px">${pct}%</b><span style="font-size:11px;color:var(--text-3)">${correct}/${QUIZ.length}</span>`})}
        <div style="flex:1;min-width:200px">
          <div class="badge ${tone}" style="height:24px;margin-bottom:8px">${pct>=80?'¡Aprobado con honores!':pct>=60?'Aprobado':'A reforzar'}</div>
          <h2 style="font-size:22px;font-weight:750;letter-spacing:-.01em">Examen de unidad · Argumentación</h2>
          <p class="muted" style="margin-top:4px">Ganaste <b class="sky">+${pct*3} XP</b>. Revisa las respuestas abajo para afinar tu técnica.</p>
          <div class="row" style="gap:10px;margin-top:14px">
            <button class="btn btn-primary" onclick="go('course')">Continuar curso ${IC.arrowR}</button>
            <button class="btn btn-ghost" onclick="go('quiz')">Reintentar</button>
          </div>
        </div>
      </div>
      <div class="grid g-3" style="margin-bottom:18px">
        <div class="tile">${C.kpi('Correctas',correct,{ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi('Tiempo','5:18',{ic:'clock'})}</div>
        <div class="tile">${C.kpi('Percentil','Top 25%',{ic:'chart'})}</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Revisión</h3></div>
        <div class="card-body" style="padding:8px 16px">
          ${QUIZ.map((Q,k)=>{ const ok=ans[k]===Q.a; return `
            <div class="lrow" style="align-items:flex-start">
              <span style="width:22px;height:22px;border-radius:6px;flex:none;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--${ok?'ok':'danger'})">${ok?IC.check:IC.chevR}</span>
              <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${Q.q}</div>
                <div style="font-size:12.5px;color:var(--text-2);margin-top:3px">Correcta: <b class="sky">${Q.o[Q.a]}</b>${!ok?` · Tu respuesta: <span style="color:var(--danger)">${ans[k]!=null?Q.o[ans[k]]:'—'}</span>`:''}</div>
              </div>
            </div>`; }).join('')}
        </div>
      </div>`;
    }
  };

  /* ---------------- REPRODUCTOR ---------------- */
  S.player = {
    render() {
      const L = currentLesson();
      const embed = L ? videoEmbedHtml(L.videoKind, L.videoSrc) : "";
      const title = L ? L.t : "Simulacro con jueces · Final interna";
      const chapters=[['Apertura del caso','0:00',true],['Primera contención','1:12',false],['Crossfire','3:40',false],['Refutación','6:05',false],['Cierre','8:30',false]];
      const stageInner = embed || `
            <div class="pstripes"></div>
            <button class="player-bigplay" id="big-play">${IC.play}</button>
            <div class="player-bar">
              <div class="pscrub"><i></i></div>
              <div class="pctrls">
                <span style="display:flex" id="pb-toggle">${IC.play}</span>
                <span>3:42 / 9:48</span>
                <div style="flex:1"></div>
                <span style="display:flex">${IC.headset}</span>
                <span style="display:flex">${IC.settings}</span>
              </div>
            </div>`;
      const transcript = L && L.contentHtml ? L.contentHtml : `
            <p><b class="sky">[0:00]</b> Buenas tardes honorable juez. Hoy defendemos que la resolución beneficia más de lo que perjudica…</p>
            <p><b class="sky">[1:12]</b> Nuestra primera contención: el acceso. El warrant es claro — los datos de 2025 muestran…</p>
            <p class="muted">La transcripción continúa sincronizada con el video.</p>`;
      return `
      <div class="lesson-wrap" style="grid-template-columns:1fr 300px">
        <div>
          <div class="player-stage">${stageInner}</div>
          <div class="row between vcenter" style="margin:16px 0 8px">
            <div><h2 style="font-size:19px;font-weight:750">${title}</h2>
            <div class="muted" style="font-size:13px">Public Forum I · grabado por OTR</div></div>
            <div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm">${IC.download} Descargar</button><button class="btn btn-soft btn-sm">${IC.flag} Notas del juez</button></div>
          </div>
          <div class="tabs"><button class="tab active">Transcripción</button><button class="tab">Comentarios</button><button class="tab">Recursos</button></div>
          <div class="prose" style="font-size:14px">${transcript}</div>
        </div>
        <aside class="stack" style="gap:16px">
          <div class="card">
            <div class="card-head"><h3>Capítulos</h3></div>
            <div class="card-body" style="padding:8px">
              ${chapters.map(c=>`<div class="chapter ${c[2]?'active':''}"><span style="display:flex;width:16px;color:var(--text-3);margin-top:2px">${IC.play}</span>
                <div><div class="ct">${c[0]}</div></div><span class="cn">${c[1]}</span></div>`).join('')}
            </div>
          </div>
          <div class="card card-pad">
            <b style="font-size:13.5px">Evaluación del juez</b>
            <div class="comp-row" style="padding-top:12px"><span class="cr-name" style="width:auto;flex:1">Estructura</span><b>9/10</b></div>
            <div class="comp-row"><span class="cr-name" style="width:auto;flex:1">Refutación</span><b>8/10</b></div>
            <div class="comp-row" style="border-bottom:0"><span class="cr-name" style="width:auto;flex:1">Presencia</span><b>9/10</b></div>
          </div>
        </aside>
      </div>`;
    },
    mount(root){
      const t=root.querySelector('#pb-toggle'), big=root.querySelector('#big-play');
      if(!t||!big) return; // hay video real (iframe) → no existen los controles de fallback
      let playing=false;
      const flip=()=>{ playing=!playing; const ic=playing?IC.pause:IC.play; t.innerHTML=ic; big.style.opacity=playing?'0':'1'; };
      big.addEventListener('click',flip); t.addEventListener('click',flip);
    }
  };

  /* ---------------- MIS CALIFICACIONES (alumno) ---------------- */
  S.grades = {
    render() {
      const rows=[['Diagnóstico inicial','U1','90','A'],['Anatomía de un caso','U1','—','—'],['Quiz: estructura básica','U1','92','A'],['Contention #1','U2','85','B+'],['Grabación 2 min','U2','88','B+'],['Examen de unidad','U2','En revisión','—']];
      return `
      <div class="page-head"><div><div class="page-title">Mis calificaciones</div><div class="page-sub">Public Forum I · promedio ponderado</div></div>
      <div class="seg"><button class="on">Public Forum I</button><button>Todos los cursos</button></div></div>
      <div class="grid g-4" style="margin-bottom:18px">
        <div class="tile">${C.kpi('Promedio','89',{unit:'%',ic:'chart',delta:'3%',dir:'up'})}</div>
        <div class="tile">${C.kpi('Entregadas','5 / 6',{ic:'checkCircle'})}</div>
        <div class="tile">${C.kpi('Mejor nota','92',{unit:'%',ic:'star'})}</div>
        <div class="tile">${C.kpi('Ranking','3 / 24',{ic:'trophy'})}</div>
      </div>
      <div class="table-wrap scroll-m">
        <table class="tbl"><thead><tr><th>Actividad</th><th>Unidad</th><th class="num">Nota</th><th class="center">Letra</th><th class="center">Peso</th></tr></thead>
        <tbody>${rows.map(r=>`<tr><td><b style="font-weight:600">${r[0]}</b></td><td><span class="tag-soft">${r[1]}</span></td>
          <td class="num"><b class="${r[2]==='—'?'faint':r[2]==='En revisión'?'muted':''}">${r[2]}${/^\d+$/.test(r[2])?'%':''}</b></td>
          <td class="center">${r[3]==='—'?'<span class="faint">—</span>':C.badge(r[3], r[3][0]==='A'?'ok':'sky')}</td>
          <td class="center muted">15%</td></tr>`).join('')}</tbody></table>
      </div>`;
    }
  };
