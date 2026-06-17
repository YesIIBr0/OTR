// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
import { t } from "./i18n";
export const S = {};

  /* ---------------- FORO ---------------- */
  S.forum = {
    render() {
      const row = (t)=>`
        <div class="forum-row" onclick="go('forum-thread')">
          ${C.avatar(t.ini,{size:'sm'})}
          <div class="fr-main">
            <div class="fr-title">${t.pinned?`<span class="pin">${IC.flag}</span>`:''}${esc(t.title)}</div>
            <div class="fr-sub">${esc(t.excerpt)}</div>
            <div class="fr-meta"><span class="tag-soft">${esc(t.tag)}</span><span class="dot-sep"></span>por ${esc(t.author)}<span class="dot-sep"></span>${esc(t.last)}</div>
          </div>
          <div class="fr-stats">
            <div><b>${t.replies}</b><span>respuestas</span></div>
            <div class="hide-m"><b>${t.views}</b><span>vistas</span></div>
          </div>
        </div>`;
      return `
      <div class="page-head"><div><div class="page-title">${t("comm.forum.title")}</div>
      <div class="page-sub">${t("comm.forum.sub")}</div></div>
      <button class="btn btn-primary" data-action="new-thread">${IC.plus} ${t("comm.forum.newThread")}</button></div>

      <div class="row between vcenter" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div class="searchbox" style="width:280px;max-width:100%"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input placeholder="${t("comm.forum.searchPh")}"/></div>
        <div class="row wrap" style="gap:8px"><span class="chip active">${t("comm.forum.filterAll")}</span><span class="chip">${t("comm.forum.filterUnanswered")}</span><span class="chip">${t("comm.forum.filterResources")}</span><span class="chip">${t("comm.forum.filterMyThreads")}</span></div>
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
      const post = (p)=>`
        <div class="post ${p.op?'op':''}">
          ${C.avatar(p.ini,{size:'lg', bg:p.role==='Coach'?'var(--otr-navy)':'var(--otr-sky-lo)'})}
          <div class="post-body">
            <div class="post-head"><b>${esc(p.author)}</b>${p.role==='Coach'?C.badge(t("comm.thread.coachBadge"),'navy'):''}${p.op?C.badge(t("comm.thread.authorBadge"),'sky'):''}<span class="faint" style="font-size:12px">${esc(p.when)}</span></div>
            <p>${esc(p.body)}</p>
            <div class="post-actions">
              <button class="btn btn-quiet btn-sm" data-toast="Marcado como útil">${IC.star} ${t("comm.thread.useful")}</button>
              <button class="btn btn-quiet btn-sm">${t("comm.thread.reply")}</button>
            </div>
          </div>
        </div>`;
      return `
      <div class="row between vcenter" style="margin-bottom:14px">
        <button class="btn btn-ghost btn-sm" onclick="go('forum')">${IC.chevL} ${t("comm.thread.backToForum")}</button>
        <span class="tag-soft">${esc(th.tag)}</span>
      </div>
      <h1 class="page-title" style="font-size:24px;margin-bottom:18px">${esc(th.title)}</h1>
      <div class="card card-pad fade-up" style="display:flex;flex-direction:column;gap:4px">
        ${th.posts.map(post).join('<div class="divider" style="margin:14px 0"></div>')}
      </div>

      <div class="card card-pad fade-up" style="--d:1;margin-top:16px">
        <b style="font-size:13.5px">${t("comm.thread.yourReply")}</b>
        <div class="editor-toolbar">
          ${['B','I','“ ”',t("comm.thread.toolbarList"),t("comm.thread.toolbarLink")].map(b=>`<button class="et-btn">${b}</button>`).join('')}
        </div>
        <textarea class="textarea" id="reply-box" placeholder="${t("comm.thread.replyPh")}"></textarea>
        <div class="row between vcenter" style="margin-top:12px">
          <span class="faint" style="font-size:12px">${t("comm.thread.beRespectful")}</span>
          <button class="btn btn-primary" id="reply-send">${t("comm.thread.postReply")}</button>
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
      const convo = list.map((m,i)=>`
        <div class="convo ${i===active?'active':''}" data-convo="${i}" role="button" tabindex="0" style="cursor:pointer">
          <div class="avatar" style="background:${m.navy?'var(--otr-navy)':'var(--otr-sky-lo)'};position:relative">${esc(m.ini)}${m.online?'<span class="online-dot"></span>':''}</div>
          <div class="convo-main"><div class="convo-top"><b>${esc(m.name)}</b><span class="faint" style="font-size:11.5px">${esc(m.when)}</span></div>
          <div class="convo-last">${esc(m.last)}</div></div>
          ${m.unread?`<span class="unread-pill">${m.unread}</span>`:''}
        </div>`).join('');
      const head = list[active] || null; // conversación seleccionada
      const bubbles = (head && Array.isArray(head.messages) ? head.messages : []).map(c=>`
        <div class="bubble-row ${c.me?'me':''}">
          <div class="bubble">${esc(c.body)}<span class="b-time">${esc(c.when)}</span></div>
        </div>`).join('');
      return `
      <div class="page-head" style="margin-bottom:14px"><div><div class="eyebrow">${t("comm.msg.eyebrow")}</div><h1 class="page-title" style="margin-top:2px">${t("comm.msg.title")}</h1>
      <div class="page-sub">${t("comm.msg.sub")}</div></div></div>
      <div class="msg-wrap fade-up">
        <aside class="msg-list">
          <div class="searchbox" style="width:100%;margin-bottom:10px"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input placeholder="${t("comm.msg.searchPh")}"/></div>
          ${convo}
        </aside>
        <section class="msg-thread">
          ${head ? `
          <div class="mt-head">
            <div class="avatar" style="background:${head.navy?'var(--otr-navy)':'var(--otr-sky-lo)'};position:relative">${esc(head.ini)}${head.online?'<span class="online-dot"></span>':''}</div>
            <div><b>${esc(head.name)}</b>${head.online?`<div class="faint" style="font-size:12px">${t("comm.msg.online")}</div>`:''}</div>
            <button class="btn btn-quiet btn-sm" id="mt-report" style="margin-left:auto;display:inline-flex;align-items:center;gap:6px"><span style="display:flex;width:14px;height:14px">${IC.flag}</span>${t("comm.msg.report")}</button>
          </div>
          <div class="mt-body" id="mt-body">
            <div class="chat-day">${t("comm.msg.today")}</div>
            ${bubbles}
          </div>
          <div class="mt-compose">
            <input class="input" id="chat-input" placeholder="${t("comm.msg.composePh")}" style="flex:1"/>
            <button class="btn btn-primary" id="chat-send" style="width:42px;padding:0">${IC.arrowR}</button>
          </div>`
          : `<div class="empty" style="margin:auto;padding:48px 24px;text-align:center"><div class="ill">${IC.msg}</div><h4>${t("comm.msg.emptyHeading")}</h4><p>${t("comm.msg.emptyBody")}</p></div>`}
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
        if (conv && Array.isArray(conv.messages)) conv.messages.push({ me:true, body:v, when:t("comm.msg.now") });
        const div=document.createElement('div'); div.className='bubble-row me';
        div.innerHTML=`<div class="bubble">${esc(v)}<span class="b-time">${t("comm.msg.now")}</span></div>`;
        body.appendChild(div); input.value=''; body.scrollTop=body.scrollHeight;
      };
      send.addEventListener('click',push);
      input.addEventListener('keydown',e=>{ if(e.key==='Enter')push(); });
      body.scrollTop=body.scrollHeight;
    }
  };
