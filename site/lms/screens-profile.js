/* OTR LMS · profile screens: progress/levels, badges/certificates, profile */
(function () {
  window.SCREENS = window.SCREENS || {};
  const S = window.SCREENS;

  /* ---------------- PROGRESO / NIVELES ---------------- */
  S.progress = {
    render() {
      const pct = Math.round(((DB.xp-DB.xpLevelStart)/(DB.xpNext-DB.xpLevelStart))*100);
      const comps = [['Argumentación',88],['Refutación',74],['Evidencia',82],['Presencia escénica',91],['Estructura',85],['Manejo del tiempo',70]];
      return `
      <div class="page-head"><div><div class="page-title">Progreso y niveles</div>
      <div class="page-sub">Tu camino de Novato a Elite en el sistema OTR</div></div>
      ${C.levelBadge('Varsity')}</div>

      <div class="card card-pad" style="margin-bottom:18px">
        <div class="level-track">
          ${DB.levels.map(l=>{
            const order=['novato','jv','varsity','elite'].indexOf(l.id);
            const cur=l.id==='varsity', done=order<2, locked=order>2;
            return `<div class="level-node ${cur?'cur':''} ${locked?'locked':''}">
              <div class="ln-badge" style="background:${cur?'linear-gradient(135deg,var(--otr-sky),var(--otr-sky-lo))':done?'linear-gradient(135deg,#9fb6cc,#7d96b0)':'linear-gradient(135deg,'+l.color+','+l.color+')'}">${l.name[0]}</div>
              <div class="ln-name">${l.name}${done?' ✓':cur?'':''}</div>
              <div class="ln-range">${l.range}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="split" style="grid-template-columns:1fr 320px">
        <div class="card card-pad">
          <div class="row between vcenter"><b style="font-size:15px">Camino a Elite</b><span class="muted tnum" style="font-size:13px">${DB.xp.toLocaleString('es')} / ${DB.xpNext.toLocaleString('es')} XP</span></div>
          <div style="margin:14px 0 6px">${C.bar(pct,{cls:'thick navy'})}</div>
          <div class="row between" style="font-size:12px;color:var(--text-2)"><span>Varsity</span><span>${DB.xpNext-DB.xp} XP para Elite</span></div>

          <div class="divider"></div>
          <b style="font-size:14px">Competencias</b>
          <div style="margin-top:8px">
            ${comps.map(c=>`<div class="comp-row"><span class="cr-name">${c[1]>=85?'★ ':''}${c[0]}</span><span class="cr-bar">${C.bar(c[1])}</span><span class="cr-score" style="color:${c[1]>=85?'var(--ok)':c[1]>=75?'var(--text)':'var(--warn)'}">${c[1]}</span></div>`).join('')}
          </div>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card card-pad" style="text-align:center">
            <span class="streak" style="background:var(--otr-pale);color:var(--action-hover);border:0">${IC.flame} ${DB.me.streak} días</span>
            <div style="margin-top:10px;font-size:13px" class="muted">Racha de entrenamiento. ¡No la rompas!</div>
            <div class="row" style="gap:4px;margin-top:12px;justify-content:center">
              ${Array.from({length:14},(_,i)=>`<span style="width:14px;height:14px;border-radius:4px;background:${i<12?'var(--otr-sky)':'var(--n-150)'}"></span>`).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h3>Subidas recientes</h3></div>
            <div class="card-body" style="padding:8px 16px 12px">
              ${[['Subiste a Varsity','+500 XP','hace 6 días'],['Insignia: Semifinalista','+250 XP','hace 1 sem'],['Racha de 7 días','+100 XP','hace 1 sem']].map(r=>`
                <div class="agenda-item"><span class="when-dot" style="background:var(--otr-sky)"></span>
                <div><div class="ai-t">${r[0]}</div><div class="ai-c sky">${r[1]}</div></div><span class="ai-w">${r[2]}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    }
  };

  /* ---------------- INSIGNIAS / CERTIFICADOS ---------------- */
  S.badges = {
    render() {
      const got = DB.badges.filter(b=>b.got).length;
      return `
      <div class="page-head"><div><div class="page-title">Insignias y certificados</div>
      <div class="page-sub">${got} de ${DB.badges.length} insignias · sigue ganando logros de campeón</div></div></div>

      <div class="cert" style="margin-bottom:20px">
        <div class="seal">${IC.award}</div>
        <div style="flex:1">
          <div class="badge sky" style="margin-bottom:6px">Certificado disponible</div>
          <h3 style="font-size:17px;font-weight:750">Fundamentos de Debate · Public Forum</h3>
          <p class="muted" style="font-size:13px;margin-top:3px">Completa la Unidad 3 para desbloquear tu certificado oficial OTR.</p>
        </div>
        <button class="btn btn-navy">Ver certificado</button>
      </div>

      <b style="font-size:14px;display:block;margin-bottom:12px">Tus insignias</b>
      <div class="badge-grid">
        ${DB.badges.map(b=>`
          <div class="badge-card ${b.got?'':'locked'}">
            ${b.got?'<span class="badge ok" style="position:absolute;top:12px;right:12px">Ganada</span>':`<span style="position:absolute;top:12px;right:12px;color:var(--n-300)">${IC.lock}</span>`}
            <div class="badge-medal ${b.got?b.tone:'lock'}">${IC[b.ic]}</div>
            <div class="bn">${b.n}</div>
            <div class="bd">${b.d}</div>
          </div>`).join('')}
      </div>`;
    }
  };

  /* ---------------- PERFIL DEL ALUMNO ---------------- */
  S.profile = {
    render(state) {
      const me = state.role==='teacher' ? DB.teacher : DB.me;
      const isStudent = state.role!=='teacher';
      return `
      <div class="card card-pad" style="margin-bottom:18px">
        <div class="profile-head">
          ${C.avatar(me.initials,{size:'xl', bg: isStudent?'var(--otr-sky-lo)':'var(--otr-navy)'})}
          <div style="flex:1;min-width:200px">
            <div class="row vcenter" style="gap:10px;flex-wrap:wrap"><h2 style="font-size:22px;font-weight:750">${me.name}</h2>${isStudent?C.levelBadge('Varsity'):C.badge('Coach','navy')}</div>
            <div class="muted" style="font-size:13px;margin-top:4px">${me.email} · Santo Domingo, RD · se unió en 2025</div>
            <div class="row" style="gap:8px;margin-top:12px">
              <button class="btn btn-ghost btn-sm">${IC.pencil} Editar perfil</button>
              <button class="btn btn-ghost btn-sm">${IC.settings} Ajustes</button>
            </div>
          </div>
          ${isStudent?`<div class="row" style="gap:22px">
            <div class="kpi" style="text-align:center"><span class="k-val brand-font" style="font-size:24px">3</span><span class="k-label" style="justify-content:center">Cursos</span></div>
            <div class="kpi" style="text-align:center"><span class="k-val brand-font" style="font-size:24px">4</span><span class="k-label" style="justify-content:center">Insignias</span></div>
            <div class="kpi" style="text-align:center"><span class="k-val brand-font" style="font-size:24px">89%</span><span class="k-label" style="justify-content:center">Promedio</span></div>
          </div>`:''}
        </div>
      </div>

      <div class="tabs"><button class="tab active">Resumen</button><button class="tab">Cursos</button><button class="tab">Insignias</button><button class="tab">Actividad</button></div>

      <div class="split" style="grid-template-columns:1fr 320px">
        <div class="card card-pad">
          <b style="font-size:14px">Actividad reciente</b>
          <div class="timeline" style="margin-top:16px">
            ${[['Calificación recibida','Grabación 2 min · 94% — “Excelente claim, afina el cierre.”','hace 1h'],
               ['Quiz completado','Estructura básica · 92%','hace 3h'],
               ['Subiste a Varsity','+500 XP — ¡felicidades!','hace 6 días'],
               ['Insignia ganada','Semifinalista','hace 1 sem']].map(t=>`
              <div class="tl-item"><div style="font-weight:600;font-size:13.5px">${t[0]}</div>
              <div class="muted" style="font-size:13px">${t[1]}</div>
              <div class="faint" style="font-size:11.5px;margin-top:2px">${t[2]}</div></div>`).join('')}
          </div>
        </div>
        <div class="stack" style="gap:16px">
          <div class="card card-pad">
            <b style="font-size:13.5px">Nivel actual</b>
            <div class="row vcenter" style="gap:12px;margin:12px 0">
              <div class="ln-badge" style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,var(--otr-sky),var(--otr-sky-lo));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800" class="brand-font">V</div>
              <div><b>Varsity</b><div class="faint" style="font-size:12px">${(DB.xpNext-DB.xp)} XP para Elite</div></div>
            </div>
            ${C.bar(75,{cls:'navy'})}
          </div>
          <div class="card card-pad">
            <b style="font-size:13.5px">Insignias destacadas</b>
            <div class="row" style="gap:10px;margin-top:12px">
              ${DB.badges.filter(b=>b.got).slice(0,4).map(b=>`<div class="badge-medal ${b.tone}" style="width:44px;height:44px" title="${b.n}">${IC[b.ic]}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    }
  };
})();
