/* OTR LMS · component string helpers (return HTML strings) — portado del prototipo.
   Todas las funciones devuelven `string` (HTML crudo para innerHTML). Los `opts` son
   objetos laxos: los ~22 builders scr-*.ts (con @ts-nocheck, ver ADR-0004) los llaman
   con literales variados; tipamos aquí la forma "razonable" que YA usan, sin apretar
   de más — NO cambiar la firma pública (orden/cantidad de parámetros) de ninguna,
   la consumen los 22 archivos sin chequeo de tipos. */
import { IC } from "./icons";

interface AvatarOpts {
  size?: string;
  bg?: string;
}
interface BadgeOpts {
  dot?: boolean;
}
interface BarOpts {
  cls?: string;
}
interface RingOpts {
  color?: string;
  label?: string;
}
interface KpiOpts {
  delta?: string | number;
  dir?: "up" | "down" | string;
  unit?: string;
  ic?: string;
  accent?: string;
}
/* ---- KIT MOCKUP 2026-08 (Task 3) ----
   Helpers de la estética del mockup. Las clases que emiten viven en la sección
   "KIT MOCKUP 2026-08" de app/styles/screens.css. Son ADICIONES: ninguna firma
   existente cambia. */
interface BtnOpts {
  ic?: string;           // clave de IC (icono a la izquierda)
  icRight?: string;      // clave de IC (icono a la derecha)
  size?: "sm" | "lg" | string;
  href?: string;         // si viene, se renderiza <a> en vez de <button>
  block?: boolean;
  disabled?: boolean;
  cls?: string;          // clases extra
  attrs?: string;        // atributos crudos (data-*, aria-*, onclick…)
}
interface ChipOpts {
  ic?: string;
  cls?: string;
  attrs?: string;
}
interface SecTitleOpts {
  sm?: boolean;          // variante compacta (dentro de card)
  onDark?: boolean;      // título blanco sobre card negra
  right?: string;        // HTML de acciones a la derecha (filtros, "Ver todo")
  tag?: "h2" | "h3" | "h4" | string;
  cls?: string;
  attrs?: string;
}
interface StatOpts {
  accent?: boolean;      // número en naranja (racha)
  attrs?: string;
}
interface StarsOpts {
  size?: number;         // lado de cada estrella en px (def. 13)
  gap?: number;          // separación entre estrellas en px (def. 2)
  color?: string;        // relleno de la parte "llena" (def. var(--otr-sky-lo))
  empty?: string;        // relleno de la parte "vacía" (def. var(--n-200))
}

export const C = {
  avatar(initials: string, opts: AvatarOpts = {}) {
    const cls = opts.size ? `avatar ${opts.size}` : 'avatar';
    const bg = opts.bg ? `style="background:${opts.bg}"` : '';
    return `<span class="${cls}" ${bg}>${initials}</span>`;
  },
  badge(text: string, tone: string = '', opts: BadgeOpts = {}) {
    const dot = opts.dot ? '<span class="dot"></span>' : '';
    return `<span class="badge ${tone}">${dot}${text}</span>`;
  },
  levelBadge(lvl: string) {
    const map: Record<string, string> = { "OTR Initiate":'lvl-novato', "OTR Apprentice":'lvl-jv', "OTR Competitor":'lvl-varsity', "OTR Strategist":'lvl-strategist', "OTR Laureate":'lvl-elite' };
    const v = map[lvl] || 'lvl-novato';
    // [A11Y AA] El texto va en ink (no en el color del nivel sobre fondo casi-blanco, que
    // daba ~2.3–3.0:1 y fallaba AA); el color del nivel se conserva en el punto. Pasa 4.5:1.
    return `<span class="badge" style="background:color-mix(in srgb, var(--${v}) 18%, white);color:var(--text)"><span class="dot" style="background:var(--${v})"></span>${lvl}</span>`;
  },
  bar(pct: number, opts: BarOpts = {}) {
    const cls = opts.cls ? `bar ${opts.cls}` : 'bar';
    return `<div class="${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  },
  // [ISAAC 2026-08-09] Anillo de PROGRESO → verde. Vive sobre superficies claras con la
  // pista en --n-100, así que el trazo va en --success-strong (4,70:1 contra la pista;
  // el verde vivo daría 2,67:1 y el aro se difuminaría contra el gris).
  ring(pct: number, size: number = 72, opts: RingOpts = {}) {
    const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    const color = opts.color || 'var(--success-strong)';
    return `<span class="ring-wrap" style="width:${size}px;height:${size}px">
      ${/* [K-13] Decorativo: el dato ya lo dice en texto el .ring-label de abajo. Sin
            aria-hidden algunos lectores lo anuncian como gráfico vacío — era el único de
            los 22 <svg> del Aula sin ocultar. */""}
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--n-100)" stroke-width="7"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="7"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
          transform="rotate(-90 ${size/2} ${size/2})"/>
      </svg>
      <span class="ring-label">${opts.label || `<b style="font-size:${size*0.26}px;font-weight:800" class="brand-font">${pct}%</b>`}</span>
    </span>`;
  },
  kpi(label: string, val: string | number, opts: KpiOpts = {}) {
    const delta = opts.delta ? `<span class="k-delta ${opts.dir||'up'}">${opts.dir==='down'?'▾':'▴'} ${opts.delta}</span>` : '';
    const unit = opts.unit ? `<span class="u">${opts.unit}</span>` : '';
    // [UI] opts.accent colorea el icono del KPI por semántica (XP=oro, progreso=verde, etc.)
    const ic = opts.ic ? `<span class="k-ic"${opts.accent ? ` style="color:${opts.accent}"` : ''}>${IC[opts.ic]}</span>` : '';
    return `<div class="kpi">
      <span class="k-label">${ic}${label}</span>
      <span class="k-val">${val}${unit}</span>
      ${delta}
    </div>`;
  },
  courseDot(color: string) { return `<span style="width:9px;height:9px;border-radius:3px;background:${color};display:inline-block;flex:none"></span>`; },
  segDots(active: number, total: number, color: string = 'var(--otr-sky)') {
    let s = '';
    for (let i = 0; i < total; i++) s += `<span style="height:6px;flex:1;border-radius:3px;background:${i < active ? color : 'var(--n-150)'}"></span>`;
    return `<div style="display:flex;gap:4px">${s}</div>`;
  },
  typeIcon(type: string) {
    const m: Record<string, string> = { video:'play', lesson:'book', quiz:'doc', assign:'pencil', mic:'mic', file:'file' };
    return IC[m[type] || 'doc'];
  },

  /* ================= KIT MOCKUP 2026-08 ================= */

  /** Botón del mockup: h44/r4/15px (h34 con size:'sm', h50 con 'lg').
   *  variant: 'accent' (naranja, texto NEGRO) · 'primary' (negro) · 'outline'
   *  (blanco, borde 1.5px) · o cualquier variante existente ('ghost','quiet'…).
   *  Acepta también el nombre completo de la clase ('btn-accent'). */
  btn(label: string, variant: string = 'primary', opts: BtnOpts = {}) {
    const v = variant ? (variant.startsWith('btn-') ? variant : `btn-${variant}`) : '';
    const size = opts.size === 'sm' ? ' btn--sm' : opts.size === 'lg' ? ' btn-lg' : '';
    const cls = `btn ${v}${size}${opts.block ? ' btn-block' : ''}${opts.cls ? ` ${opts.cls}` : ''}`.trim();
    const ic = opts.ic && IC[opts.ic] ? IC[opts.ic] : '';
    const icR = opts.icRight && IC[opts.icRight] ? IC[opts.icRight] : '';
    const attrs = opts.attrs ? ` ${opts.attrs}` : '';
    if (opts.href) return `<a class="${cls}" href="${opts.href}"${attrs}>${ic}${label}${icR}</a>`;
    return `<button class="${cls}"${opts.disabled ? ' disabled' : ''}${attrs}>${ic}${label}${icR}</button>`;
  },

  /** Chip/badge rectangular del mockup (versalitas 10/800, radio 3px).
   *  variant: 'black' | 'accent' | 'outline' | 'tint' | 'info' | 'done' | 'done-soft'.
   *
   *  [ISAAC · 2026-08-09] «Para completed - verde». Un chip que lleva el icono CHECK
   *  es, por definición, un estado hecho/confirmado ("Completado", "Inscrito",
   *  "Registrado", "Calificada", "Publicado", "Verificado"): se reencamina al par
   *  verde conservando su PESO original, para que el rediseño cambie el tono y no la
   *  jerarquía de la pantalla —
   *    accent (sólido naranja) → done      (sólido verde, letra negra, 5,83:1)
   *    tint   (tinte naranja)  → done-soft (tinte verde, letra --ok, 4,70:1)
   *  Los ~20 sitios que lo piden viven en scr-*.ts y no necesitan tocarse: el color
   *  del sistema se decide aquí, en el kit. Las demás variantes no se tocan — el
   *  naranja sigue siendo el acento de "EN VIVO / TORNEO / HOY", y un chip en tinte
   *  SIN check (p. ej. "PENDIENTE" o "MEJOR 60%") no es un completado. */
  chip(text: string, variant: string = 'outline', opts: ChipOpts = {}) {
    const done = opts.ic === 'check' || opts.ic === 'checkCircle';
    const resolved = done && variant === 'accent' ? 'done'
      : done && variant === 'tint' ? 'done-soft'
      : variant;
    const v = resolved ? (resolved.startsWith('chip--') ? resolved : `chip--${resolved}`) : '';
    const ic = opts.ic && IC[opts.ic] ? IC[opts.ic] : '';
    const attrs = opts.attrs ? ` ${opts.attrs}` : '';
    return `<span class="chip ${v}${opts.cls ? ` ${opts.cls}` : ''}"${attrs}>${ic}${text}</span>`;
  },

  /** Título de sección con barra naranja. Con opts.right devuelve la fila
   *  completa (.sec-row) con las acciones alineadas a la derecha. */
  secTitle(txt: string, opts: SecTitleOpts = {}) {
    const tag = opts.tag || (opts.sm ? 'h4' : 'h3');
    const cls = `sec-title${opts.sm ? ' sec-title--sm' : ''}${opts.onDark ? ' sec-title--on-dark' : ''}${opts.cls ? ` ${opts.cls}` : ''}`;
    const attrs = opts.attrs ? ` ${opts.attrs}` : '';
    const title = `<div class="${cls}"${attrs}><${tag}>${txt}</${tag}></div>`;
    if (!opts.right) return title;
    return `<div class="sec-row${opts.sm ? '' : ' sec-row--end'}">${title}<div class="sec-acts">${opts.right}</div></div>`;
  },

  /** Tile de fecha de 70px (día grande + mes en versalitas). live = en curso. */
  dateBox(day: string | number, mon: string, live: boolean = false) {
    return `<div class="date-box${live ? ' date-box--live' : ''}"><span class="db-d">${day}</span><span class="db-m">${mon}</span></div>`;
  },

  /** Stat de la cabecera de página (21/800 + label en versalitas).
   *  Agrúpalos dentro de <div class="stat-group"> para los divisores. */
  statInline(value: string | number, label: string, opts: StatOpts = {}) {
    const attrs = opts.attrs ? ` ${opts.attrs}` : '';
    return `<div class="stat-inline${opts.accent ? ' stat-inline--accent' : ''}"${attrs}><span class="si-n">${value}</span><span class="si-l">${label}</span></div>`;
  },

  /** Anillo de progreso conic-gradient (96px, aro 9px). pct 0-100. */
  ringConic(pct: number, num: string | number, cap: string = '', opts: { light?: boolean } = {}) {
    const deg = Math.round(Math.max(0, Math.min(100, pct)) * 3.6);
    return `<span class="ring${opts.light ? ' ring--light' : ''}" style="--deg:${deg}deg">${cap ? `<span class="ring-cap">${cap}</span>` : ''}<b class="ring-num">${num}</b></span>`;
  },
  // [M3] Estrellas de rating de SOLO lectura: RELLENAS y proporcionales al valor (un 3.5 se ve
  // medio, un 5.0 se ve lleno). Fuente ÚNICA de estrellas de la casa — la usan el marketplace
  // (scr-marketplace) y los perfiles de coach (scr-profile) para que el MISMO rating se vea
  // idéntico en las dos pantallas (antes el perfil pintaba IC.star en trazo fino, casi vacío).
  // Técnica: una fila base "vacía" + una capa "llena" recortada por ancho — sin ids de gradiente
  // (determinista para los tests) y sin CSS externo (todo inline). Devuelve HTML para innerHTML.
  stars(rating: number, opts: StarsOpts = {}) {
    const size = Number(opts.size) || 13;
    const gap = opts.gap != null ? Number(opts.gap) : 2;
    const fillColor = opts.color || 'var(--otr-sky-lo)';
    const emptyColor = opts.empty || 'var(--n-200)';
    const val = Math.max(0, Math.min(5, Number(rating) || 0));
    const w = size * 5 + gap * 4;                          // ancho total de la fila (px)
    const fillW = Math.round((val / 5) * w * 100) / 100;   // ancho de la capa llena (px)
    const star = (c: string) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${c}" style="flex:none;display:block"><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/></svg>`;
    const row = `display:inline-flex;gap:${gap}px`;
    return `<span class="otr-stars" role="img" aria-label="${val.toFixed(1)}/5" style="position:relative;display:inline-flex;width:${w}px;height:${size}px;flex:none;vertical-align:middle">`
      + `<span aria-hidden="true" style="${row}">${star(emptyColor).repeat(5)}</span>`
      + (fillW > 0 ? `<span aria-hidden="true" style="position:absolute;top:0;left:0;height:100%;width:${fillW}px;overflow:hidden;${row}">${star(fillColor).repeat(5)}</span>` : '')
      + `</span>`;
  },
};
