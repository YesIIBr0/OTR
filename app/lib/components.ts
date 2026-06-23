// @ts-nocheck
/* OTR LMS · component string helpers (return HTML strings) — portado del prototipo */
import { IC } from "./icons";

export const C = {
  avatar(initials, opts = {}) {
    const cls = opts.size ? `avatar ${opts.size}` : 'avatar';
    const bg = opts.bg ? `style="background:${opts.bg}"` : '';
    return `<span class="${cls}" ${bg}>${initials}</span>`;
  },
  badge(text, tone = '', opts = {}) {
    const dot = opts.dot ? '<span class="dot"></span>' : '';
    return `<span class="badge ${tone}">${dot}${text}</span>`;
  },
  levelBadge(lvl) {
    const map = { "OTR Initiate":'lvl-novato', "OTR Apprentice":'lvl-jv', "OTR Competitor":'lvl-varsity', "OTR Strategist":'lvl-strategist', "OTR Laureate":'lvl-elite' };
    const v = map[lvl] || 'lvl-novato';
    return `<span class="badge" style="background:color-mix(in srgb, var(--${v}) 16%, white);color:var(--${v})"><span class="dot" style="background:var(--${v})"></span>${lvl}</span>`;
  },
  bar(pct, opts = {}) {
    const cls = opts.cls ? `bar ${opts.cls}` : 'bar';
    return `<div class="${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
  },
  ring(pct, size = 72, opts = {}) {
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
  kpi(label, val, opts = {}) {
    const delta = opts.delta ? `<span class="k-delta ${opts.dir||'up'}">${opts.dir==='down'?'▾':'▴'} ${opts.delta}</span>` : '';
    const unit = opts.unit ? `<span class="u">${opts.unit}</span>` : '';
    const ic = opts.ic ? IC[opts.ic] : '';
    return `<div class="kpi">
      <span class="k-label">${ic}${label}</span>
      <span class="k-val">${val}${unit}</span>
      ${delta}
    </div>`;
  },
  courseDot(color) { return `<span style="width:9px;height:9px;border-radius:3px;background:${color};display:inline-block;flex:none"></span>`; },
  segDots(active, total, color = 'var(--otr-sky)') {
    let s = '';
    for (let i = 0; i < total; i++) s += `<span style="height:6px;flex:1;border-radius:3px;background:${i < active ? color : 'var(--n-150)'}"></span>`;
    return `<div style="display:flex;gap:4px">${s}</div>`;
  },
  typeIcon(type) {
    const m = { video:'play', lesson:'book', quiz:'doc', assign:'pencil', mic:'mic', file:'file' };
    return IC[m[type] || 'doc'];
  },
};
