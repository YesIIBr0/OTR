/* OTR LMS · Design System / Kit (screen 0) */
(function () {
  window.SCREENS = window.SCREENS || {};
  const S = window.SCREENS;
  const swatch = (name,hex,varname)=>`<div class="swatch"><div class="sw-color" style="background:${hex}"></div><div class="sw-meta"><div class="sw-name">${name}</div><div class="sw-hex">${hex}</div></div></div>`;

  S.kit = {
    render() {
      return `
      <div class="page-head"><div>
        <p class="eyebrow">OTR LMS</p>
        <div class="page-title">Design System · Theme hijo de Boost</div>
        <div class="page-sub">Tokens y componentes. Mapean a variables SCSS + plantillas Mustache de Moodle.</div>
      </div></div>

      <div class="kit-section">
        <h3>Paleta de marca</h3>
        <div class="swatches">
          ${swatch('Navy','#0C2340')}${swatch('Ink','#0A1A2F')}${swatch('Sky','#4FA9E8')}${swatch('Sky hi','#7FC8F2')}${swatch('Sky lo','#2E8BD0')}${swatch('Pale','#DCEEFB')}${swatch('Off-white','#F3F7FC')}${swatch('White','#FFFFFF')}
        </div>
      </div>

      <div class="kit-section">
        <h3>Niveles (competencias)</h3>
        <div class="swatches">
          ${swatch('Novato','#8499B2')}${swatch('JV','#4FA9E8')}${swatch('Varsity','#2E8BD0')}${swatch('Elite','#0C2340')}
        </div>
      </div>

      <div class="kit-section">
        <h3>Estados</h3>
        <div class="kit-demo">
          ${C.badge('Default')}${C.badge('Sky','sky')}${C.badge('Navy','navy')}${C.badge('OK','ok',{dot:1})}${C.badge('Warn','warn',{dot:1})}${C.badge('Danger','danger',{dot:1})}
          ${['Novato','JV','Varsity','Elite'].map(C.levelBadge).join('')}
        </div>
      </div>

      <div class="kit-section">
        <h3>Tipografía</h3>
        <div class="card card-pad">
          <div class="type-row"><span class="tr-meta">Brand · 800 · 30</span><span class="brand-font" style="font-size:30px">Domina la sala</span></div>
          <div class="type-row"><span class="tr-meta">UI Title · 750 · 24</span><span style="font-size:24px;font-weight:750;letter-spacing:-.01em">Mis cursos</span></div>
          <div class="type-row"><span class="tr-meta">Heading · 700 · 16</span><span style="font-size:16px;font-weight:700">Anatomía de un caso</span></div>
          <div class="type-row"><span class="tr-meta">Body · 450 · 14</span><span style="font-size:14px">Un argumento sólido es una estructura, no una opinión.</span></div>
          <div class="type-row" style="border-bottom:0"><span class="tr-meta">Mono · 12</span><span class="mono" style="font-size:12px">PF-101 · 92%</span></div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Botones</h3>
        <div class="kit-demo">
          <button class="btn btn-primary">Primary</button>
          <button class="btn btn-navy">Navy</button>
          <button class="btn btn-ghost">Ghost</button>
          <button class="btn btn-soft">Soft</button>
          <button class="btn btn-quiet">Quiet</button>
          <button class="btn btn-danger">Danger</button>
          <button class="btn btn-primary" disabled>Disabled</button>
          <button class="btn btn-primary btn-sm">Small</button>
          <button class="btn btn-primary btn-lg">Large ${IC.arrowR}</button>
        </div>
      </div>

      <div class="kit-section">
        <h3>Formularios · estados</h3>
        <div class="grid g-3">
          <div class="field"><label class="label">Normal</label><div class="input-group"><span class="lead">${IC.user}</span><input class="input" placeholder="Tu nombre"/></div></div>
          <div class="field"><label class="label">Focus / activo</label><input class="input" value="analia@otr.do" style="border-color:var(--otr-sky);box-shadow:var(--ring)"/></div>
          <div class="field"><label class="label">Error <span class="req">*</span></label><input class="input err" value="correo inválido"/><span class="hint" style="color:var(--danger)">Ingresa un correo válido.</span></div>
          <div class="field"><label class="label">Select</label><select class="select"><option>Public Forum I</option><option>Lincoln–Douglas</option></select></div>
          <div class="field"><label class="label">Disabled</label><input class="input" value="No editable" disabled style="opacity:.6"/></div>
          <div class="field"><label class="label">Checkbox</label><label class="check" style="height:36px"><input type="checkbox" checked/> Recordarme</label></div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Tabs · segmentos · chips</h3>
        <div class="card card-pad">
          <div class="tabs" style="margin-bottom:14px"><button class="tab active">Contenido</button><button class="tab">Notas</button><button class="tab">Foro</button></div>
          <div class="row wrap vcenter" style="gap:12px">
            <div class="seg"><button class="on">Todos</button><button>Activos</button><button>Hecho</button></div>
            <span class="chip active">Filtro activo</span><span class="chip">Filtro</span><span class="chip soft">Suave</span>
          </div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Alertas</h3>
        <div class="stack" style="gap:10px">
          <div class="alert info"><span class="ai">${IC.calendar}</span><div><div class="at">Información</div>Tu simulacro es hoy a las 4:00 PM.</div></div>
          <div class="alert ok"><span class="ai">${IC.checkCircle}</span><div><div class="at">Éxito</div>Grabación entregada correctamente.</div></div>
          <div class="alert warn"><span class="ai">${IC.clock}</span><div><div class="at">Atención</div>Tienes una entrega que vence mañana.</div></div>
          <div class="alert danger"><span class="ai">${IC.flag}</span><div><div class="at">Error</div>No se pudo subir el archivo. Reintenta.</div></div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Progreso · datos</h3>
        <div class="grid g-3">
          <div class="card card-pad"><b style="font-size:13px">Barra</b><div style="margin-top:12px">${C.bar(72)}</div><div style="margin-top:10px">${C.bar(45,{cls:'navy'})}</div></div>
          <div class="card card-pad" style="text-align:center"><b style="font-size:13px;display:block;margin-bottom:10px">Anillo</b>${C.ring(72,84)}</div>
          <div class="card card-pad">${C.kpi('XP esta semana','420',{ic:'flame',delta:'80',dir:'up'})}</div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Estados vacíos · carga</h3>
        <div class="grid g-2">
          <div class="card"><div class="empty"><div class="ill">${IC.book}</div><h4>Aún no tienes cursos</h4><p>Cuando te inscribas en un curso, aparecerá aquí.</p><button class="btn btn-primary btn-sm">Explorar cursos</button></div></div>
          <div class="card card-pad">
            <b style="font-size:13px;display:block;margin-bottom:14px">Loading (skeleton + spinner)</b>
            <div class="row vcenter" style="gap:12px;margin-bottom:14px"><div class="skeleton" style="width:40px;height:40px;border-radius:50%"></div><div style="flex:1"><div class="skeleton" style="height:11px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:10px;width:40%"></div></div></div>
            <div class="skeleton" style="height:10px;margin-bottom:8px"></div><div class="skeleton" style="height:10px;width:80%"></div>
            <div class="row vcenter" style="gap:10px;margin-top:16px"><span class="spinner"></span><span class="muted" style="font-size:13px">Cargando entregas…</span></div>
          </div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Overlays · feedback</h3>
        <div class="kit-demo">
          <button class="btn btn-ghost" data-toast="Mensaje informativo">Toast info</button>
          <button class="btn btn-ghost" data-toast="ok::Guardado correctamente" id="kit-toast-ok">Toast éxito</button>
          <button class="btn btn-ghost" data-toast="warn::Revisa los campos">Toast warn</button>
          <button class="btn btn-primary" id="kit-modal">Abrir modal</button>
          <div class="dropdown-demo">
            <button class="btn btn-ghost" id="kit-dd">Menú ${IC.chevD}</button>
          </div>
        </div>
      </div>

      <div class="kit-section">
        <h3>Avatares · stack</h3>
        <div class="kit-demo">
          ${C.avatar('AR',{size:'sm'})}${C.avatar('SM',{bg:'var(--otr-navy)'})}${C.avatar('MT',{size:'lg'})}
          <div class="avatar-stack">${['SC','AP','MT','AR'].map(x=>C.avatar(x,{size:'sm'})).join('')}<span class="avatar sm" style="background:var(--n-200);color:var(--text-2)">+8</span></div>
        </div>
      </div>`;
    },
    mount(root) {
      const m = root.querySelector('#kit-modal');
      if (m) m.addEventListener('click', () => window.modal({
        title:'¿Entregar grabación?', body:'Una vez entregada, tu coach la revisará. Podrás re-grabar hasta la fecha límite.', ok:'Entregar', cancel:'Cancelar', tone:'primary'
      }));
      const dd = root.querySelector('#kit-dd');
      if (dd) dd.addEventListener('click', () => window.toast('Dropdown / menú contextual (demo)'));
    }
  };
})();
