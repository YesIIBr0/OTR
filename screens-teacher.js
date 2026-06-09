/* OTR LMS · teacher screens: panel/tracking, gradebook, participants */
(function () {
  window.SCREENS = window.SCREENS || {};
  const S = window.SCREENS;
  const spark = (vals,color='var(--otr-sky)') => `<div class="spark">${vals.map(v=>`<i style="height:${v}%;background:${color}"></i>`).join('')}</div>`;
  const trendIc = t => t==='up'?`<span class="trend-up">${IC.chevD}</span>`.replace('chevD','') && `<span class="trend-up">▴</span>` : t==='down'?'<span class="trend-down">▾</span>':'<span class="trend-flat">→</span>';

  /* ---------------- PANEL DEL PROFESOR · TRACKING ---------------- */
  S.teacher = {
    render() {
      const atRisk = DB.students.filter(s=>s.risk);
      return `
      <div class="page-head">
        <div><div class="page-title">Panel · Public Forum I</div>
        <div class="page-sub">Tracking total del grupo · 24 estudiantes</div></div>
        <div class="row" style="gap:8px">
          <button class="btn btn-ghost btn-sm">${IC.download} Exportar</button>
          <button class="btn btn-primary btn-sm" onclick="go('gradebook')">${IC.chart} Calificar</button>
        </div>
      </div>

      <div class="grid g-4" style="margin-bottom:18px">
        <div class="tile">${C.kpi('Promedio del grupo','86',{unit:'%',ic:'chart',delta:'2%',dir:'up'})}</div>
        <div class="tile">${C.kpi('Asistencia','89',{unit:'%',ic:'users',delta:'1%',dir:'down'})}</div>
        <div class="tile">${C.kpi('Entregas a tiempo','78',{unit:'%',ic:'clock'})}</div>
        <div class="tile" style="border-color:#eeb9b4;background:var(--danger-soft)">${C.kpi('En riesgo','2',{ic:'flag'})}</div>
      </div>

      <div class="split" style="grid-template-columns:1fr 320px">
        <div class="table-wrap scroll-m">
          <table class="tbl">
            <thead><tr><th>Estudiante</th><th>Nivel</th><th class="num">Nota</th><th class="num">Asist.</th><th>Engagement</th><th class="center">7 días</th><th class="num">Últ. acceso</th></tr></thead>
            <tbody>
              ${DB.students.map(s=>`<tr style="cursor:pointer" onclick="go('profile')">
                <td><div class="cell-user">${C.avatar(s.i,{size:'sm'})}<div><div class="nm">${s.n}</div></div>${s.risk?C.badge('Riesgo','danger'):''}</div></td>
                <td>${C.levelBadge(s.lvl)}</td>
                <td class="num"><b class="${s.grade>=85?'':s.grade>=70?'':''}" style="color:${s.grade>=85?'var(--ok)':s.grade>=70?'var(--warn)':'var(--danger)'}">${s.grade}%</b></td>
                <td class="num tnum">${s.att}%</td>
                <td><span class="eng-pill eng-${s.eng}">${s.eng}</span></td>
                <td class="center">${spark(s.trend==='up'?[40,55,50,68,72,80,88]:s.trend==='down'?[80,70,64,55,48,40,34]:[60,62,58,64,60,62,60], s.risk?'var(--danger)':'var(--otr-sky)')}</td>
                <td class="num faint" style="font-size:12px">${s.last}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="stack" style="gap:16px">
          <div class="card">
            <div class="card-head"><h3 style="color:var(--danger)">${IC.flag} Requieren atención</h3></div>
            <div class="card-body" style="padding:8px 16px 12px">
              ${atRisk.map(s=>`<div class="risk-row">${C.avatar(s.i,{size:'sm',bg:'var(--danger)'})}
                <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${s.n}</div>
                <div class="faint" style="font-size:12px">${s.att<70?'Asistencia baja':'Sin entregas'} · ${s.last}</div></div>
                <button class="btn btn-soft btn-sm">${IC.msg}</button></div>`).join('')}
              ${atRisk.length?'':'<div class="empty" style="padding:20px"><b>Sin alertas 🎉</b></div>'}
            </div>
          </div>
          <div class="card card-pad">
            <div class="row between vcenter" style="margin-bottom:10px"><b style="font-size:13.5px">Entregas pendientes de calificar</b><span class="badge sky">7</span></div>
            ${[['Grabación 2 min','12 sin revisar'],['Contention #1','5 sin revisar']].map(r=>`
              <div class="lrow" style="padding:9px 0"><span style="display:flex;width:18px;color:var(--text-2)">${IC.mic}</span>
              <div style="flex:1"><div style="font-weight:600;font-size:13px">${r[0]}</div><div class="faint" style="font-size:12px">${r[1]}</div></div>${IC.chevR}</div>`).join('')}
            <button class="btn btn-primary btn-sm btn-block" style="margin-top:10px" onclick="go('gradebook')">Ir al calificador</button>
          </div>
        </div>
      </div>`;
    }
  };

  /* ---------------- GRADEBOOK ---------------- */
  S.gradebook = {
    render() {
      const gb=DB.gradebook;
      const cls=v=> v==='—'?'none':(+v>=85?'hi':(+v>=70?'mid':'lo'));
      return `
      <div class="page-head"><div><div class="page-title">Calificador · Public Forum I</div>
      <div class="page-sub">6 estudiantes · ${gb.cols.length} actividades</div></div>
      <div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm">${IC.download} Exportar CSV</button>
      <button class="btn btn-ghost btn-sm">${IC.settings} Configurar</button></div></div>

      <div class="row" style="gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <span class="chip active">Todas</span><span class="chip">Sin calificar</span><span class="chip">Unidad 1</span><span class="chip">Unidad 2</span>
      </div>

      <div class="gb-wrap">
        <table class="gb">
          <thead><tr><th class="stick" style="text-align:left">Estudiante</th>
            ${gb.cols.map(c=>`<th>${c}</th>`).join('')}<th>Promedio</th></tr></thead>
          <tbody>
            ${gb.rows.map(r=>{
              const nums=r.g.filter(x=>x!=='—').map(Number);
              const avg=nums.length?Math.round(nums.reduce((a,b)=>a+b,0)/nums.length):'—';
              return `<tr><td class="stick"><div class="cell-user">${C.avatar(r.i,{size:'sm'})}<span class="nm">${r.n}</span></div></td>
                ${r.g.map(v=>`<td><span class="gcell ${cls(v)}">${v}${v!=='—'?'':''}</span></td>`).join('')}
                <td><b class="gcell ${cls(String(avg))}">${avg}${avg!=='—'?'%':''}</b></td></tr>`;
            }).join('')}
            <tr style="background:var(--surface-2)"><td class="stick" style="background:var(--surface-2)"><b style="font-weight:700">Media actividad</b></td>
              ${gb.cols.map((_,ci)=>{ const nums=gb.rows.map(r=>r.g[ci]).filter(x=>x!=='—').map(Number); const a=nums.length?Math.round(nums.reduce((x,y)=>x+y,0)/nums.length):'—'; return `<td><b class="tnum">${a}${a!=='—'?'%':''}</b></td>`; }).join('')}
              <td></td></tr>
          </tbody>
        </table>
      </div>
      <p class="faint" style="font-size:12px;margin-top:10px">Toca cualquier celda para calificar · ${IC.lock?'':''} las notas se sincronizan con el gradebook de Moodle.</p>`;
    }
  };

  /* ---------------- PARTICIPANTES ---------------- */
  S.participants = {
    render() {
      return `
      <div class="page-head"><div><div class="page-title">Participantes</div><div class="page-sub">Public Forum I · 24 estudiantes · 2 coaches</div></div>
      <button class="btn btn-primary btn-sm">${IC.plus} Inscribir</button></div>

      <div class="row between vcenter" style="margin-bottom:14px;flex-wrap:wrap;gap:10px">
        <div class="searchbox" style="width:280px"><span style="display:flex;width:16px;height:16px">${IC.search}</span><input placeholder="Buscar participante…"/></div>
        <div class="row" style="gap:8px"><span class="chip active">Todos · 26</span><span class="chip">Estudiantes</span><span class="chip">Coaches</span><span class="chip">Inactivos</span></div>
      </div>

      <div class="table-wrap scroll-m">
        <table class="tbl">
          <thead><tr><th><label class="check"><input type="checkbox"/></label></th><th>Nombre</th><th>Rol</th><th>Nivel</th><th>Progreso</th><th class="num">Últ. acceso</th><th></th></tr></thead>
          <tbody>
            <tr><td><label class="check"><input type="checkbox"/></label></td>
              <td><div class="cell-user">${C.avatar('SM',{size:'sm',bg:'var(--otr-navy)'})}<div><div class="nm">Coach Saúl Méndez</div><div class="em">saul@otr.do</div></div></div></td>
              <td>${C.badge('Coach','navy')}</td><td>—</td><td>—</td><td class="num faint">hace 1h</td><td class="center">${IC.settings}</td></tr>
            ${DB.students.map(s=>`<tr>
              <td><label class="check"><input type="checkbox"/></label></td>
              <td><div class="cell-user">${C.avatar(s.i,{size:'sm'})}<div><div class="nm">${s.n}</div><div class="em">${s.n.toLowerCase().split(' ')[0]}@otr.do</div></div></div></td>
              <td>${C.badge('Estudiante')}</td>
              <td>${C.levelBadge(s.lvl)}</td>
              <td><div style="width:120px">${C.bar(Math.min(98,s.xp/55),{cls:'thin'})}</div></td>
              <td class="num faint" style="font-size:12px">${s.last}</td>
              <td class="center"><button class="icon-btn" style="width:30px;height:30px">${IC.msg}</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }
  };
})();
