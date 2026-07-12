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
};
