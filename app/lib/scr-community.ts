// @ts-nocheck
import { DB } from "./data";
import { C } from "./components";
import { IC } from "./icons";
import { esc } from "./esc";
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
      <div class="page-head"><div><div class="page-title">Foro · Public Forum I</div>
      <div class="page-sub">Discusiones del grupo · pregunta, comparte recursos, debate</div></div>
      <button class="btn btn-primary" data-action="new-thread">${IC.plus} Nueva discusión</button></div>

      <div class="row between vcenter" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div class="searchbox" style="width:280px;max-width:100%"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input placeholder="Buscar en el foro…"/></div>
        <div class="row wrap" style="gap:8px"><span class="chip active">Todos</span><span class="chip">Sin responder</span><span class="chip">Recursos</span><span class="chip">Mis hilos</span></div>
      </div>

      <div class="card fade-up" style="overflow:hidden">
        ${DB.forum.filter(t=>t.pinned).length?`<div class="forum-section">${IC.flag} Fijados</div>`:''}
        ${DB.forum.filter(t=>t.pinned).map(row).join('')}
        <div class="forum-section">Recientes</div>
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
            <div class="post-head"><b>${esc(p.author)}</b>${p.role==='Coach'?C.badge('Coach','navy'):''}${p.op?C.badge('Autor','sky'):''}<span class="faint" style="font-size:12px">${esc(p.when)}</span></div>
            <p>${esc(p.body)}</p>
            <div class="post-actions">
              <button class="btn btn-quiet btn-sm" data-toast="¡Te gusta!">${IC.star} Útil</button>
              <button class="btn btn-quiet btn-sm">Responder</button>
            </div>
          </div>
        </div>`;
      return `
      <div class="row between vcenter" style="margin-bottom:14px">
        <button class="btn btn-ghost btn-sm" onclick="go('forum')">${IC.chevL} Volver al foro</button>
        <span class="tag-soft">${esc(th.tag)}</span>
      </div>
      <h1 class="page-title" style="font-size:24px;margin-bottom:18px">${esc(th.title)}</h1>
      <div class="card card-pad fade-up" style="display:flex;flex-direction:column;gap:4px">
        ${th.posts.map(post).join('<div class="divider" style="margin:14px 0"></div>')}
      </div>

      <div class="card card-pad fade-up" style="--d:1;margin-top:16px">
        <b style="font-size:13.5px">Tu respuesta</b>
        <div class="editor-toolbar">
          ${['B','I','“ ”','• Lista','Enlace'].map(b=>`<button class="et-btn">${b}</button>`).join('')}
        </div>
        <textarea class="textarea" id="reply-box" placeholder="Comparte tu punto, evidencia o pregunta…"></textarea>
        <div class="row between vcenter" style="margin-top:12px">
          <span class="faint" style="font-size:12px">Sé respetuoso. Ataca ideas, no personas.</span>
          <button class="btn btn-primary" id="reply-send">Publicar respuesta</button>
        </div>
      </div>`;
    },
    mount(root){
      const send=root.querySelector('#reply-send'), box=root.querySelector('#reply-box');
      send.addEventListener('click',()=>{
        if(!box.value.trim()){ box.focus(); box.classList.add('err'); return; }
        const body=box.value.trim();
        fetch('/api/forum/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({threadId:(DB.forumThread&&DB.forumThread.id),body})})
          .then(r=>r.json()).then(d=>{ if(d.ok){ window.toast&&window.toast('Respuesta publicada','ok'); box.value=''; box.classList.remove('err'); } else window.toast&&window.toast(d.error||'Error','danger'); })
          .catch(()=>window.toast&&window.toast('Error al publicar','danger'));
      });
    }
  };

  /* ---------------- MENSAJERÍA ---------------- */
  S.messages = {
    render() {
      const convo = DB.messages.map((m,i)=>`
        <div class="convo ${i===0?'active':''}" data-convo="${i}">
          <div class="avatar ${m.navy?'':''}" style="background:${m.navy?'var(--otr-navy)':'var(--otr-sky-lo)'};position:relative">${esc(m.ini)}${m.online?'<span class="online-dot"></span>':''}</div>
          <div class="convo-main"><div class="convo-top"><b>${esc(m.name)}</b><span class="faint" style="font-size:11.5px">${esc(m.when)}</span></div>
          <div class="convo-last">${esc(m.last)}</div></div>
          ${m.unread?`<span class="unread-pill">${m.unread}</span>`:''}
        </div>`).join('');
      const bubbles = DB.chat.map(c=>`
        <div class="bubble-row ${c.me?'me':''}">
          <div class="bubble">${esc(c.body)}<span class="b-time">${esc(c.when)}</span></div>
        </div>`).join('');
      return `
      <div class="page-head" style="margin-bottom:14px"><div><div class="eyebrow">Comunidad</div><div class="page-title" style="margin-top:2px">Mensajes</div>
      <div class="page-sub">Habla con tus coaches y compañeros</div></div></div>
      <div class="msg-wrap fade-up">
        <aside class="msg-list">
          <div class="searchbox" style="width:100%;margin-bottom:10px"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input placeholder="Buscar…"/></div>
          ${convo}
        </aside>
        <section class="msg-thread">
          <div class="mt-head">
            <div class="avatar" style="background:var(--otr-navy);position:relative">SM<span class="online-dot"></span></div>
            <div><b>Coach Saúl Méndez</b><div class="faint" style="font-size:12px">En línea · normalmente responde rápido</div></div>
            <div style="margin-left:auto" class="row"><button class="icon-btn">${IC.video}</button><button class="icon-btn">${IC.settings}</button></div>
          </div>
          <div class="mt-body" id="mt-body">
            <div class="chat-day">Hoy</div>
            ${bubbles}
          </div>
          <div class="mt-compose">
            <input class="input" id="chat-input" placeholder="Escribe un mensaje…" style="flex:1"/>
            <button class="btn btn-primary" id="chat-send" style="width:42px;padding:0">${IC.arrowR}</button>
          </div>
        </section>
      </div>`;
    },
    mount(root){
      const body=root.querySelector('#mt-body'), input=root.querySelector('#chat-input'), send=root.querySelector('#chat-send');
      const push=()=>{ const v=input.value.trim(); if(!v)return;
        fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:v})}).catch(()=>{});
        const div=document.createElement('div'); div.className='bubble-row me';
        div.innerHTML=`<div class="bubble">${esc(v)}<span class="b-time">ahora</span></div>`;
        body.appendChild(div); input.value=''; body.scrollTop=body.scrollHeight;
        setTimeout(()=>{ const r=document.createElement('div'); r.className='bubble-row';
          r.innerHTML=`<div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>`; body.appendChild(r); body.scrollTop=body.scrollHeight;
          setTimeout(()=>{ r.querySelector('.bubble').innerHTML='¡Perfecto! Lo reviso en cuanto lo subas.<span class="b-time">ahora</span>'; body.scrollTop=body.scrollHeight; },1100);
        },500);
      };
      send.addEventListener('click',push);
      input.addEventListener('keydown',e=>{ if(e.key==='Enter')push(); });
      body.scrollTop=body.scrollHeight;
    }
  };
