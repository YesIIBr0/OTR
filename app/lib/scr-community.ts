// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t, registerDict } from "./i18n";
// [F4.1] Registra el diccionario de esta pantalla en SU chunk (fuera del inicial): comm.*. Ver app/lib/i18n.ts.
import { dict as d_comm } from "./i18n-keys/comm";
registerDict(d_comm);
export const S = {};

  /* ---------------- FORO ---------------- */
  S.forum = {
    render() {
      const byAuthorLabel = t("comm.forum.byAuthor");
      const repliesLabel = t("comm.forum.replies");
      const viewsLabel = t("comm.forum.views");
      /* [GOAL E5 · doble-escape] CONTRATO DE ESCAPE, el mismo que ya adoptó Mensajes abajo:
         queries.ts (l. 2016) escapa UNA vez title/excerpt/tag/author/ini al armar `forum`, y
         aquí se renderiza CRUDO. Re-escaparlo hacía que el hilo «Cross & rebuttal» se leyera
         «Cross &amp; rebuttal» y un cuerpo con <b> mostrara «&lt;b&gt;» literal. `last`
         (lastLabel: "hace 2h") es la ÚNICA excepción: es etiqueta nuestra, queries NO la
         escapa, así que se escapa aquí. */
      const row = (t)=>`
        <div class="forum-row" onclick="go('forum-thread')">
          ${C.avatar(t.ini,{size:'sm'})}
          <div class="fr-main">
            <div class="fr-title">${t.pinned?`<span class="pin">${IC.flag}</span>`:''}${t.title}</div>
            <div class="fr-sub">${t.excerpt}</div>
            <div class="fr-meta"><span class="tag-soft">${t.tag}</span><span class="dot-sep"></span>${byAuthorLabel.split("{author}").join(t.author)}<span class="dot-sep"></span>${esc(t.last)}</div>
          </div>
          <div class="fr-stats">
            <div><b>${t.replies}</b><span>${repliesLabel}</span></div>
            <div class="hide-m"><b>${t.views}</b><span>${viewsLabel}</span></div>
          </div>
        </div>`;
      return `
      <div class="page-head page-head--rule"><div>
      <h1 class="ph-title">${t("comm.forum.title")}</h1>
      <div class="page-sub" style="margin-top:8px">${t("comm.forum.sub")}</div></div>
      ${C.btn(t("comm.forum.newThread"), "accent", { ic: "plus", attrs: 'data-action="new-thread"' })}</div>

      <div class="row between vcenter" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div class="searchbox" style="width:280px;max-width:100%"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input placeholder="${t("comm.forum.searchPh")}"/></div>
        ${/* [MOCKUP · Task 6] Filtros = chips rectangulares del kit: activo NEGRO, resto outline. */""}
        <div class="row wrap" style="gap:4px">${C.chip(t("comm.forum.filterAll"), "black")}${C.chip(t("comm.forum.filterUnanswered"), "outline")}${C.chip(t("comm.forum.filterResources"), "outline")}${C.chip(t("comm.forum.filterMyThreads"), "outline")}</div>
      </div>

      <div class="card fade-up" style="overflow:hidden">
        ${DB.forum.filter(t=>t.pinned).length?`<div class="forum-section">${IC.flag} ${t("comm.forum.pinned")}</div>`:''}
        ${DB.forum.filter(t=>t.pinned).map(row).join('')}
        <div class="forum-section">${t("comm.forum.recent")}</div>
        ${DB.forum.filter(t=>!t.pinned).map(row).join('')}
      </div>`;
    }
  };

  /* ---------------- HILO ---------------- */
  S.forumThread = {
    render() {
      const th = DB.forumThread;
      /* [GOAL E5 · doble-escape] Mismo contrato que el listado: queries.ts (l. 2017-2019)
         escapa title/tag/author/ini/body UNA vez → aquí van CRUDOS. `when` (whenLabel) es la
         excepción: etiqueta nuestra sin escapar en el payload. */
      const post = (p)=>`
        <div class="post ${p.op?'op':''}">
          ${C.avatar(p.ini,{size:'lg', bg:p.role==='Coach'?'var(--otr-navy)':'var(--otr-sky-lo)'})}
          <div class="post-body">
            <div class="post-head"><b>${p.author}</b>${p.role==='Coach'?C.badge(t("comm.thread.coachBadge"),'navy'):''}${p.op?C.badge(t("comm.thread.authorBadge"),'sky'):''}<span class="faint" style="font-size:12px">${esc(p.when)}</span></div>
            <p>${p.body}</p>
            <div class="post-actions">
              <button class="btn btn-quiet btn-sm" data-toast="${t("comm.thread.markedUseful")}">${IC.star} ${t("comm.thread.useful")}</button>
              <button class="btn btn-quiet btn-sm">${t("comm.thread.reply")}</button>
            </div>
          </div>
        </div>`;
      return `
      <div class="row between vcenter" style="margin-bottom:14px">
        ${C.btn(t("comm.thread.backToForum"), "outline", { size: "sm", ic: "chevL", attrs: `onclick="go('forum')"` })}
        ${C.chip(th.tag, "outline")}
      </div>
      <div class="page-head page-head--rule"><div><h1 class="ph-title" style="font-size:30px">${th.title}</h1></div></div>
      <div class="card card-pad fade-up" style="display:flex;flex-direction:column;gap:4px">
        ${th.posts.map(post).join('<div class="divider" style="margin:14px 0"></div>')}
      </div>

      <div class="card card-pad fade-up" style="--d:1;margin-top:16px">
        ${C.secTitle(t("comm.thread.yourReply"), { sm: true })}
        <div class="editor-toolbar">
          ${['B','I','“ ”',t("comm.thread.toolbarList"),t("comm.thread.toolbarLink")].map(b=>`<button class="et-btn">${b}</button>`).join('')}
        </div>
        <textarea class="textarea" id="reply-box" placeholder="${t("comm.thread.replyPh")}"></textarea>
        <div class="row between vcenter" style="margin-top:12px">
          <span class="faint" style="font-size:12px">${t("comm.thread.beRespectful")}</span>
          ${C.btn(t("comm.thread.postReply"), "accent", { attrs: 'id="reply-send"' })}
        </div>
      </div>`;
    },
    mount(root){
      const send=root.querySelector('#reply-send'), box=root.querySelector('#reply-box');
      send.addEventListener('click',()=>{
        if(!box.value.trim()){ box.focus(); box.classList.add('err'); return; }
        const body=box.value.trim();
        fetch('/api/forum/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId:(DB.forumThread&&DB.forumThread.id),body})})
          .then(r=>r.json()).then(d=>{ if(d.ok){ window.toast&&window.toast(t("comm.thread.replyPosted"),'ok'); box.value=''; box.classList.remove('err'); } else window.toast&&window.toast(d.error||t("comm.thread.error"),'danger'); })
          .catch(()=>window.toast&&window.toast(t("comm.thread.postError"),'danger'));
      });
    }
  };

  /* ---------------- MENSAJERÍA ---------------- */
  S.messages = {
    render() {
      // [CROSS-02] Conversación ACTIVA seleccionable (window.__convo). Antes el thread
      // siempre mostraba DB.chat (la 1ª conversación) sin importar cuál tocaras.
      const list = DB.messages || [];
      const active = Math.max(0, Math.min((window.__convo | 0), list.length - 1));
      /* [GOAL rev·doble-escape] CONTRATO DE ESCAPE: queries.ts escapa el texto de usuario
         UNA vez al armar el payload (ini/name/last y el body de cada burbuja) y aquí se
         renderiza CRUDO. Al re-escaparlo, un mensaje con «5 & luego 'listo'» se leía
         «5 &amp; luego &#39;listo&#39;» en preview, cabecera y burbuja. `when` es la única
         excepción: queries NO lo escapa (es una etiqueta nuestra: "ahora", "10:02"), así que
         se escapa aquí. */
      const convo = list.map((m,i)=>`
        <div class="convo ${i===active?'active':''}" data-convo="${i}" role="button" tabindex="0" style="cursor:pointer">
          <div class="avatar" style="background:${m.navy?'var(--otr-navy)':'var(--otr-sky-lo)'};position:relative">${m.ini}${m.online?'<span class="online-dot"></span>':''}</div>
          <div class="convo-main"><div class="convo-top"><b>${m.name}</b><span class="faint" style="font-size:11.5px">${esc(m.when)}</span></div>
          <div class="convo-last">${m.last}</div></div>
          ${m.unread?`<span class="unread-pill">${m.unread}</span>`:''}
        </div>`).join('');
      const head = list[active] || null; // conversación seleccionada
      const bubbles = (head && Array.isArray(head.messages) ? head.messages : []).map(c=>`
        <div class="bubble-row ${c.me?'me':''}">
          <div class="bubble">${c.body}<span class="b-time">${esc(c.when)}</span></div>
        </div>`).join('');
      return `
      <div class="page-head page-head--rule"><div><h1 class="ph-title">${t("comm.msg.title")}</h1>
      <div class="page-sub" style="margin-top:8px">${t("comm.msg.sub")}</div></div></div>
      <div class="msg-wrap fade-up">
        <aside class="msg-list">
          ${/* [GOAL K-16] El placeholder NO es nombre accesible (se borra al teclear y varios
               lectores no lo anuncian): aria-label explícito, como el buscador de Participantes. */""}
          <div class="searchbox" style="width:100%;margin-bottom:10px"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input aria-label="${t("comm.msg.searchAria")}" placeholder="${t("comm.msg.searchPh")}"/></div>
          ${convo}
        </aside>
        <section class="msg-thread">
          ${head ? `
          <div class="mt-head">
            <div class="avatar" style="background:${head.navy?'var(--otr-navy)':'var(--otr-sky-lo)'};position:relative">${head.ini}${head.online?'<span class="online-dot"></span>':''}</div>
            <div><b>${head.name}</b>${head.online?`<div class="faint" style="font-size:12px">${t("comm.msg.online")}</div>`:''}</div>
            <button class="btn btn-quiet btn-sm" id="mt-report" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px"><span style="display:flex;width:14px;height:14px">${IC.flag}</span>${t("comm.msg.report")}</button>
          </div>
          <div class="mt-body" id="mt-body">
            <div class="chat-day">${t("comm.msg.today")}</div>
            ${bubbles}
          </div>
          <div class="mt-compose">
            ${/* [GOAL K-16] Ídem en el composer. [GOAL K-15] El botón de enviar es SOLO-ICONO:
                 sin aria-label el árbol de accesibilidad lo expone como "button" a secas. */""}
            <input class="input" id="chat-input" aria-label="${t("comm.msg.composeAria")}" placeholder="${t("comm.msg.composePh")}" style="flex:1"/>
            <button class="btn btn-primary" id="chat-send" aria-label="${t("comm.msg.sendAria")}" title="${t("comm.msg.sendAria")}" style="width:42px;padding:0">${IC.arrowR}</button>
          </div>`
          /* [GOAL E5] El estado vacío ya no es un callejón sin salida: lleva BOTÓN a la única
             superficie que abre un hilo hoy — la ficha del coach en 'explore', cuyo "Enviar
             mensaje" hace POST /api/conversations (ver scr-marketplace). Reservar NO crea
             conversación, así que la copy no lo promete. Navega por data-go, la misma
             delegación que usa el resto del Aula, para que el clic navegue de verdad. */
          : `<div class="empty" style="margin:auto;padding:48px 24px;text-align:center"><div class="ill">${IC.msg}</div><h4>${t("comm.msg.emptyHeading")}</h4><p>${t("comm.msg.emptyBody")}</p>
             <button class="btn btn-accent" data-go="explore">${t("comm.msg.emptyCta")}</button></div>`}
        </section>
      </div>`;
    },
    mount(root){
      const list = DB.messages || [];
      const active = Math.max(0, Math.min((window.__convo | 0), list.length - 1));
      // [CROSS-02] Cambiar de conversación: clic (o Enter/Espacio) fija __convo y re-renderiza.
      root.querySelectorAll('[data-convo]').forEach((el)=>{
        const open=()=>{ window.__convo = parseInt(el.getAttribute('data-convo'),10) || 0; window.go && window.go('messages'); };
        el.addEventListener('click', open);
        el.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } });
      });
      const head = list[active] || null; // conversación activa (para reportar)
      const reportBtn = root.querySelector('#mt-report');
      if (reportBtn && head) {
        reportBtn.addEventListener('click', ()=>{
          window.otrFormModal(t("comm.msg.reportTitle"), [
            { name:'reason', label:t("comm.msg.reportReasonLabel"), type:'textarea', req:true, ph:t("comm.msg.reportReasonPh") }
          ], async (value)=>{
            await window.api('/api/reports', { targetType:'conversation', targetId: head.id, reason: value.reason }, 'POST');
            window.toast(t("comm.msg.reportSent"), 'ok');
          });
        });
      }
      const body=root.querySelector('#mt-body'), input=root.querySelector('#chat-input'), send=root.querySelector('#chat-send');
      if (!body || !send) return;
      const conv = list[active] || null;
      const convId = conv && conv.id;
      const push=()=>{ const v=input.value.trim(); if(!v)return;
        // [CROSS-03] Enviar a la conversación ACTIVA. Antes el POST no llevaba conversationId
        // y el backend lo mandaba siempre al primer hilo del seed. El mensaje se envía de
        // verdad a /api/messages; el destinatario lo ve en su bandeja (sin auto-respuesta falsa).
        fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(convId?{conversationId:convId,body:v}:{body:v})}).catch(()=>{});
        // [GOAL rev·doble-escape] El eco optimista entra en DB.messages con la MISMA forma
        // que trae el payload (escapado UNA vez): si se guardara crudo, el siguiente render
        // —que ya pinta el body sin escapar— inyectaría lo que el usuario acaba de teclear.
        if (conv && Array.isArray(conv.messages)) conv.messages.push({ me:true, body:esc(v), when:t("comm.msg.now") });
        const div=document.createElement('div'); div.className='bubble-row me';
        div.innerHTML=`<div class="bubble">${esc(v)}<span class="b-time">${t("comm.msg.now")}</span></div>`;
        body.appendChild(div); input.value=''; body.scrollTop=body.scrollHeight;
      };
      send.addEventListener('click',push);
      input.addEventListener('keydown',e=>{ if(e.key==='Enter')push(); });
      body.scrollTop=body.scrollHeight;
    }
  };
