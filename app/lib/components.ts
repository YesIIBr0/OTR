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
  ring(pct: number, size: number = 72, opts: RingOpts = {}) {
    const r = (size - 8) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    const color = opts.color || 'var(--otr-sky-lo)';
    return `<span class="ring-wrap" style="width:${size}px;height:${size}px">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
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
   *  variant: 'black' | 'accent' | 'outline' | 'tint' | 'info'. */
  chip(text: string, variant: string = 'outline', opts: ChipOpts = {}) {
    const v = variant ? (variant.startsWith('chip--') ? variant : `chip--${variant}`) : '';
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
};
